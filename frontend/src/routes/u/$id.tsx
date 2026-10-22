import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Heart, Images, LayoutGrid, Lightbulb, Shirt, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkList, TaggedPhoto, type LinkTag } from "@/components/link-tags";
import { OutfitPieces } from "@/components/outfit-card";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { TierBadge, tiers } from "@/components/tier-badge";
import { api, errorText, photoUrl } from "@/lib/api";
import { itemById } from "@/lib/catalog";
import type { Outfit } from "@/lib/outfit";
import { useUser } from "@/lib/session";

export const Route = createFileRoute("/u/$id")({
  head: () => ({ meta: [{ title: "스타일 프로필 — FYOF" }, { name: "description", content: "이 사람이 올린 코디와 사진을 모아 봤어요." }] }),
  component: ProfilePage,
});

type Post = { id: number; item: string; category: "OUTFIT" | "TIP"; title: string; colors: string[]; comment: string; createdAt: string; outfit: Outfit | null; votes: number; voted: boolean; mine: boolean; hasPhoto: boolean; links: LinkTag[] };
type Profile = { userId: number; nickname: string; joinedAt: string; posts: number; votes: number; badge: boolean; tier: number; me: boolean };

/** 다음 등급까지 남은 것 (백엔드 TIER_RULE 과 같은 기준) */
function nextTier(p: Profile) {
  if (p.tier >= 3) return null;
  if (p.tier < 1) return "첫 글을 올리면 🌱 루키가 돼요.";
  if (p.tier < 2) return `✦ 스타일러까지 글 ${Math.max(0, 3 - p.posts)}개 또는 추천 ${Math.max(0, 3 - p.votes)}개 남았어요.`;
  return `👑 패셔니스타까지 추천 ${Math.max(0, 10 - p.votes)}개 남았어요. (또는 글 5개 + 추천 3개)`;
}

function Tile({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const item = itemById(post.item);
  return <button type="button" className="feed-tile" onClick={onOpen} aria-label={`${post.title} 크게 보기`}>
    {post.hasPhoto ? <img src={photoUrl(post.id)} alt="" loading="lazy"/>
      : post.category === "OUTFIT" ? <span className="feed-colors">{post.colors.map((c, i) => <i key={i} style={{ background: c }}/>)}</span>
      : <span className="feed-tip"><Lightbulb size={18}/><span>{post.comment}</span></span>}
    <span className="feed-caption"><strong>{post.title}</strong><small>{item?.name}</small></span>
    <span className="feed-hover"><Heart size={16} fill="currentColor"/> {post.votes}</span>
    {post.hasPhoto && <span className="feed-kind"><Images size={13}/></span>}
  </button>;
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
      const res = await api<{ votes: number; voted: boolean }>(`/api/style-posts/${post.id}/vote`, { method: "POST" });
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
      <span className="profile-avatar" aria-hidden="true">{profile.nickname.slice(0, 1)}</span>
      <div className="profile-info">
        <div className="profile-name"><h1>{profile.nickname}</h1><TierBadge tier={profile.tier} size="lg"/>{profile.me && <span className="profile-me">내 페이지</span>}</div>
        <ul className="profile-stats"><li><strong>{profile.posts}</strong> 게시물</li><li><strong>{profile.votes}</strong> 받은 추천</li><li>{new Date(profile.joinedAt).toLocaleDateString("ko-KR")} 가입</li></ul>
        {profile.tier > 0 && <p className="profile-tier-note">{tiers[profile.tier as 1 | 2 | 3].icon} {tiers[profile.tier as 1 | 2 | 3].ko} 등급이에요.</p>}
        {next && <p className="profile-next">{next}</p>}
        {profile.me && <div className="profile-actions"><Button asChild variant="outline" size="sm"><Link to="/closet"><Shirt size={14}/> 내 옷장</Link></Button><Button asChild variant="outline" size="sm"><Link to="/results" search={{ q: "전체" }}>코디 올리러 가기 <ArrowUpRight size={14}/></Link></Button></div>}
      </div>
    </header>
    <div className="profile-tabs" role="tablist">
      <Button variant="ghost" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}><LayoutGrid size={15}/> 전체 {posts.length}</Button>
      <Button variant="ghost" role="tab" aria-selected={tab === "photo"} className={tab === "photo" ? "active" : ""} onClick={() => setTab("photo")}><Images size={15}/> 사진 {posts.filter(p => p.hasPhoto).length}</Button>
    </div>
    {shown.length === 0 ? <p className="vote-empty">{tab === "photo" ? "아직 사진이 있는 코디가 없어요." : profile.me ? "아직 올린 글이 없어요. 아이템 가이드에서 첫 코디를 올려 보세요." : "아직 올린 글이 없어요."}</p>
      : <div className="feed-grid">{shown.map(p => <Tile key={p.id} post={p} onOpen={() => setOpen(p)}/>)}</div>}

    {open && <div className="feed-modal" role="dialog" aria-modal="true" aria-label={open.title} onClick={() => setOpen(null)}>
      <div className="feed-modal-card" onClick={e => e.stopPropagation()}>
        <button type="button" className="feed-close" aria-label="닫기" onClick={() => setOpen(null)}><X size={18}/></button>
        <div className="feed-modal-media">{open.hasPhoto ? <TaggedPhoto src={photoUrl(open.id)} alt={open.title} links={open.links}/> : open.category === "OUTFIT" ? <span className="feed-colors">{open.colors.map((c, i) => <i key={i} style={{ background: c }}/>)}</span> : <span className="feed-tip"><Lightbulb size={24}/></span>}</div>
        <div className="feed-modal-info">
          <span className="eyebrow">{open.category === "OUTFIT" ? "OUTFIT" : "TIP"} · {new Date(open.createdAt).toLocaleDateString("ko-KR")}</span>
          <h2>{open.title}</h2>
          {itemById(open.item) && <Link to="/item/$id" params={{ id: open.item }} className="inline-link">{itemById(open.item)!.name} 가이드 보기</Link>}
          {open.outfit && <OutfitPieces outfit={open.outfit} highlight={open.item}/>}
          {open.comment && <p>{open.comment}</p>}
          <LinkList links={open.links}/>
          <Button variant="outline" className={open.voted ? "vote-button voted" : "vote-button"} aria-pressed={open.voted} onClick={() => vote(open)}><Heart size={15} fill={open.voted ? "currentColor" : "none"}/><strong>{open.votes}</strong></Button>
          {open.mine && <small className="vote-form-note">내 글에는 추천할 수 있지만 순위에는 들어가지 않아요.</small>}
          {error && <p className="ai-error">{error}</p>}
        </div>
      </div>
    </div>}
  </main><SiteFooter/></>;
}
