import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Camera, Heart, Images, LayoutGrid, Lightbulb, Loader2, MessageCircle, Shirt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LinkTag } from "@/components/link-tags";
import { PostModal, toggleVote } from "@/components/post-modal";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { TierBadge, tierOf } from "@/components/tier-badge";
import { UserAvatar } from "@/components/user-avatar";
import { removeAvatar, uploadAvatar, useAvatarUrl } from "@/lib/avatars";
import { squareImage } from "@/lib/image";
import { api, errorText, photoUrl } from "@/lib/api";
import { BadgeCase } from "@/components/badge-case";
import { achievements } from "@/lib/achievements";
import { itemById } from "@/lib/catalog";
import type { Outfit } from "@/lib/outfit";
import { useUser } from "@/lib/session";

export const Route = createFileRoute("/u/$id")({
  head: () => ({ meta: [{ title: "스타일 프로필 — FYOF" }, { name: "description", content: "이 사람이 올린 코디와 사진을 모아 봤어요." }] }),
  component: ProfilePage,
});

type Post = { id: number; item: string; category: "OUTFIT" | "TIP"; title: string; colors: string[]; comment: string; createdAt: string; outfit: Outfit | null; votes: number; voted: boolean; mine: boolean; hasPhoto: boolean; links: LinkTag[]; comments: number };
type Profile = { userId: number; nickname: string; joinedAt: string; posts: number; votes: number; badge: boolean; tier: number; me: boolean };

/** 다음 등급까지 남은 것 (백엔드 TIERS 와 같은 기준: 글 + 추천 둘 다) */
function nextTier(p: Profile) {
  const next = tierOf(p.tier + 1);
  if (!next) return null;
  if (p.tier < 1) return "첫 글을 올리면 🌱 루키가 돼요.";
  const posts = Math.max(0, next.posts - p.posts), votes = Math.max(0, next.votes - p.votes);
  return `${next.icon} ${next.ko}까지 ${[posts && `글 ${posts}개`, votes && `추천 ${votes}개`].filter(Boolean).join(" + ")} 남았어요.`;
}

function Tile({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const item = itemById(post.item);
  return <button type="button" className="feed-tile" onClick={onOpen} aria-label={`${post.title} 크게 보기`}>
    {post.hasPhoto ? <img src={photoUrl(post.id)} alt="" loading="lazy"/>
      : post.category === "OUTFIT" ? <span className="feed-colors">{post.colors.map((c, i) => <i key={i} style={{ background: c }}/>)}</span>
      : <span className="feed-tip"><Lightbulb size={18}/><span>{post.comment}</span></span>}
    <span className="feed-caption"><strong>{post.title}</strong><small>{item?.name}</small></span>
    <span className="feed-hover"><span><Heart size={16} fill="currentColor"/> {post.votes}</span><span><MessageCircle size={16} fill="currentColor"/> {post.comments}</span></span>
    {post.hasPhoto && <span className="feed-kind"><Images size={13}/></span>}
  </button>;
}

/** 내 프로필 사진: 누르거나 "사진 변경"으로 바꾸고, "삭제"로 지운다. */
function AvatarEditor({ userId, nickname }: { userId: number; nickname: string }) {
  const url = useAvatarUrl(userId);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError("");
    try { await uploadAvatar(await squareImage(file)); } catch (e) { setError(errorText(e, "사진을 바꾸지 못했어요.")); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  const remove = async () => {
    setBusy(true); setError("");
    try { await removeAvatar(userId); } catch (e) { setError(errorText(e, "사진을 지우지 못했어요.")); } finally { setBusy(false); }
  };
  return <div className="avatar-editor">
    <button type="button" className="profile-avatar avatar-button" onClick={() => input.current?.click()} disabled={busy} aria-label="프로필 사진 바꾸기">
      {url ? <img src={url} alt=""/> : nickname.slice(0, 1)}
      <span className="avatar-overlay">{busy ? <Loader2 className="spin" size={20}/> : <Camera size={20}/>}</span>
    </button>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => void pick(e.target.files?.[0])}/>
    <div className="avatar-actions">
      <button type="button" onClick={() => input.current?.click()} disabled={busy}>사진 변경</button>
      {url && <button type="button" onClick={() => void remove()} disabled={busy}><Trash2 size={12}/> 삭제</button>}
    </div>
    {error && <p className="ai-error" role="alert">{error}</p>}
  </div>;
}

/** 업적 배지: 체육관 배지 케이스처럼 모아서 보여 준다 */
function AchievementShelf({ posts }: { posts: Post[] }) {
  return <BadgeCase list={achievements(posts)}/>;
}

function ProfilePage() {
  const { id } = Route.useParams();
  const user = useUser();
  const navigate = useNavigate();
  const [data, setData] = useState<{ profile: Profile; posts: Post[] } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [tab, setTab] = useState<"all" | "photo">("all");
  const [open, setOpen] = useState<Post | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    api<{ profile: Profile; posts: Post[] }>(`/api/style-posts/users/${id}`)
      .then(d => { if (alive) { setData(d); setStatus("ready"); } })
      .catch(e => { if (alive) setStatus(e instanceof Error && e.message.includes("찾을 수 없어요") ? "notfound" : "error"); });
    return () => { alive = false; };
  }, [id, user]);

  const vote = async (post: Post) => {
    if (!user) { await navigate({ to: "/login", search: { redirect: `/u/${id}` } }); return; }
    setError("");
    try {
      const res = await toggleVote(post.id);
      setData(d => d && { ...d, posts: d.posts.map(p => p.id === post.id ? { ...p, ...res } : p) });
      setOpen(o => o && o.id === post.id ? { ...o, ...res } : o);
    } catch (e) { setError(errorText(e, "추천하지 못했습니다.")); }
  };

  if (status !== "ready" || !data) return <><SiteHeader/><main className="profile-page wrap"><section className="empty-results"><span className="eyebrow">PROFILE</span><h2>{status === "loading" ? "불러오는 중…" : status === "notfound" ? "없는 사용자예요." : "서버에 연결할 수 없습니다."}</h2></section></main><SiteFooter/></>;

  const { profile, posts } = data;
  const shown = tab === "photo" ? posts.filter(p => p.hasPhoto) : posts;
  const next = profile.me ? nextTier(profile) : null;

  return <><SiteHeader/><main className="profile-page wrap">
    <div className="page-breadcrumb">COMMUNITY <span>/</span> PROFILE</div>
    <header className="profile-head">
      {profile.me ? <AvatarEditor userId={profile.userId} nickname={profile.nickname}/> : <UserAvatar userId={profile.userId} nickname={profile.nickname} className="profile-avatar"/>}
      <div className="profile-info">
        <div className="profile-name"><h1>{profile.nickname}</h1><TierBadge tier={profile.tier} size="lg"/>{profile.me && <span className="profile-me">내 페이지</span>}</div>
        <ul className="profile-stats"><li><strong>{profile.posts}</strong> 게시물</li><li><strong>{profile.votes}</strong> 받은 추천</li><li>{new Date(profile.joinedAt).toLocaleDateString("ko-KR")} 가입</li></ul>
        {tierOf(profile.tier) && <p className="profile-tier-note">{tierOf(profile.tier)!.icon} {tierOf(profile.tier)!.ko} 등급이에요.</p>}
        {next && <p className="profile-next">{next}</p>}
        {profile.me && <div className="profile-actions"><Button asChild variant="outline" size="sm"><Link to="/closet"><Shirt size={14}/> 내 옷장</Link></Button><Button asChild variant="outline" size="sm"><Link to="/results" search={{ q: "전체" }}>코디 올리러 가기 <ArrowUpRight size={14}/></Link></Button></div>}
      </div>
    </header>
    <AchievementShelf posts={posts}/>
    <div className="profile-tabs" role="tablist">
      <Button variant="ghost" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}><LayoutGrid size={15}/> 전체 {posts.length}</Button>
      <Button variant="ghost" role="tab" aria-selected={tab === "photo"} className={tab === "photo" ? "active" : ""} onClick={() => setTab("photo")}><Images size={15}/> 사진 {posts.filter(p => p.hasPhoto).length}</Button>
    </div>
    {shown.length === 0 ? <p className="vote-empty">{tab === "photo" ? "아직 사진이 있는 코디가 없어요." : profile.me ? "아직 올린 글이 없어요. 아이템 가이드에서 첫 코디를 올려 보세요." : "아직 올린 글이 없어요."}</p>
      : <div className="feed-grid">{shown.map(p => <Tile key={p.id} post={p} onOpen={() => setOpen(p)}/>)}</div>}

    {open && <PostModal post={open} onClose={() => setOpen(null)} onVote={() => void vote(open)} error={error}
      onComments={n => setData(d => d && { ...d, posts: d.posts.map(p => p.id === open.id ? { ...p, comments: n } : p) })}/>}
  </main><SiteFooter/></>;
}
