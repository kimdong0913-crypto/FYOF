import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, Flag, Heart, ImagePlus, Lightbulb, Pencil, Shirt, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkList, LinkTagEditor, TaggedPhoto, linksProblem, type LinkTag } from "@/components/link-tags";
import { OutfitPieces } from "@/components/outfit-card";
import { RankingPanel } from "@/components/ranking-panel";
import { TierBadge } from "@/components/tier-badge";
import { api, errorText, photoUrl } from "@/lib/api";
import { shrinkImage } from "@/lib/image";
import { colorsFirst, itemById, itemsForSlot, slots, type Item } from "@/lib/catalog";
import { emptyOutfit, outfitTitle, slotForItem, type Outfit } from "@/lib/outfit";
import { ages, colorById, genders, palette } from "@/lib/palette";
import { useUser } from "@/lib/session";

type Category = "OUTFIT" | "TIP";
type StylePost = { id: number; item: string; category: Category; title: string; colors: string[]; comment: string; nickname: string; createdAt: string; edited: boolean; outfit: Outfit | null; votes: number; voted: boolean; mine: boolean; reported: boolean; authorBadge: boolean; hasPhoto: boolean; authorUserId: number | null; authorTier: number; links: LinkTag[] };
type Draft = { title: string; comment: string; outfit: Outfit; photo: "keep" | "remove" | Blob; links: LinkTag[] };

const filters = [{ id: "ALL", label: "전체" }, { id: "OUTFIT", label: "코디" }, { id: "TIP", label: "팁" }] as const;

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "방금";
  if (diff < 60) return `${Math.floor(diff)}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

// 사진 고르기: 고르면 바로 줄여서(긴 변 1080px) 미리보기를 보여준다.
function PhotoPicker({ value, current, onChange, links, onLinksChange }: { value: Blob | null; current?: string | undefined; onChange: (b: Blob | null) => void; links: LinkTag[]; onLinksChange: (l: LinkTag[]) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (!value) { setPreview(null); return; } const u = URL.createObjectURL(value); setPreview(u); return () => URL.revokeObjectURL(u); }, [value]);
  const shown = preview ?? current;
  return <div className="photo-picker">
    {shown ? <div className="photo-bar"><span>사진 1장 · 아래 사진을 눌러 구매처 태그를 달 수 있어요</span><button type="button" onClick={() => { onChange(null); onLinksChange(links.map(l => ({ ...l, x: null, y: null }))); }}><X size={13}/> 사진 빼기</button></div>
      : <label className="photo-drop"><ImagePlus size={20}/><span>내가 입은 사진 올리기 (선택)</span><small>얼굴이 나오는 사진은 모두에게 보여요</small>
          <input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setError(""); try { onChange(await shrinkImage(f)); } catch (err) { setError(errorText(err, "사진을 읽지 못했어요.")); } }}/></label>}
    {error && <p className="ai-error">{error}</p>}
    <LinkTagEditor src={shown ?? null} links={links} onChange={onLinksChange}/>
  </div>;
}

// 코디 칸마다 아이템과 색을 고른다. 색은 고른 아이템이 많이 입는 색이 앞에 온다.
function OutfitEditor({ outfit, onChange, lockSlot }: { outfit: Outfit; onChange: (o: Outfit) => void; lockSlot?: string | undefined }) {
  return <div className="outfit-editor">{slots.map(s => {
    const piece = outfit[s.id];
    const item = itemById(piece.item);
    return <div key={s.id} className="outfit-editor-row">
      <div className="outfit-editor-head">
        <span>{s.ko}{s.required ? "" : " (선택)"}</span>
        <div className="select-wrap"><select aria-label={`${s.ko} 아이템`} value={piece.item} disabled={lockSlot === s.id} onChange={e => {
          const next = itemById(e.target.value);
          onChange({ ...outfit, [s.id]: { item: e.target.value, color: next && !next.colors.includes(piece.color) ? next.colors[0] ?? "" : e.target.value ? piece.color : "" } });
        }}>
          <option value="">{s.required ? "아이템 고르기" : "없음"}</option>
          {itemsForSlot(s.id).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select><ChevronDown size={14}/></div>
      </div>
      {item && <div className="swatch-row" role="radiogroup" aria-label={`${s.ko} 색`}>
        {colorsFirst(item, palette).map(c => <button type="button" role="radio" aria-checked={piece.color === c.id} key={c.id} title={c.ko} aria-label={c.ko} className={`${piece.color === c.id ? "selected" : ""} ${item.colors.includes(c.id) ? "" : "rare"}`} style={{ background: c.hex }} onClick={() => onChange({ ...outfit, [s.id]: { item: piece.item, color: c.id } })}/>)}
        <span className="swatch-name">{colorById(piece.color)?.ko ?? "색 고르기"}</span>
      </div>}
    </div>;
  })}</div>;
}

const missing = (o: Outfit) => slots.find(s => s.required && (!o[s.id].item || !o[s.id].color)) ?? slots.find(s => o[s.id].item && !o[s.id].color);

export function StyleVoteBoard({ item, onChange }: { item: Item; onChange?: () => void }) {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const goLogin = () => navigate({ to: "/login", search: { redirect: location.href } });
  const startOutfit = useCallback(() => { const o = emptyOutfit(); o[slotForItem(item)] = { item: item.id, color: item.colors[0] ?? "" }; return o; }, [item]);

  const [posts, setPosts] = useState<StylePost[]>([]);
  const [rankVersion, setRankVersion] = useState(0);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [links, setLinks] = useState<LinkTag[]>([]);
  const [photoVersion, setPhotoVersion] = useState<Record<number, number>>({});
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("ALL");
  const [sort, setSort] = useState("인기순");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [category, setCategory] = useState<Category>("OUTFIT");
  const [outfit, setOutfit] = useState<Outfit>(startOutfit);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const [editing, setEditing] = useState<{ id: number; draft: Draft } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => { setOutfit(startOutfit()); }, [startOutfit]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ item: item.id, category: filter, sort: sort === "최신순" ? "recent" : "votes" });
      setPosts(await api<StylePost[]>(`/api/style-posts?${params}`));
      setStatus("ready");
    } catch { setStatus("error"); }
  }, [item.id, filter, sort]);
  // 로그인·로그아웃하면 내 글/내 투표 표시가 바뀌므로 다시 불러온다
  useEffect(() => { void load(); }, [load, user]);

  const changed = () => { setRankVersion(v => v + 1); onChange?.(); };
  const saveLinks = (id: number, l: LinkTag[]) => api<LinkTag[]>(`/api/style-posts/${id}/links`, { method: "PUT", body: JSON.stringify(l.map(({ label, url, x, y }) => ({ label: label.trim(), url: url.trim(), x, y }))) });
  const uploadPhoto = async (id: number, blob: Blob) => {
    const form = new FormData(); form.append("image", blob, "photo.jpg");
    await api<void>(`/api/style-posts/${id}/photo`, { method: "POST", body: form });
    setPhotoVersion(v => ({ ...v, [id]: Date.now() }));
  };

  const vote = async (post: StylePost) => {
    if (!user) { await goLogin(); return; }
    try {
      const res = await api<{ votes: number; voted: boolean }>(`/api/style-posts/${post.id}/vote`, { method: "POST" });
      setPosts(list => list.map(p => p.id === post.id ? { ...p, ...res } : p));
      changed();
    } catch (e) { setNotice({ id: post.id, text: errorText(e, "투표하지 못했습니다.") }); }
  };

  const report = async (post: StylePost) => {
    if (!user) { await goLogin(); return; }
    try {
      const res = await api<{ reported: boolean; hidden: boolean }>(`/api/style-posts/${post.id}/report`, { method: "POST" });
      if (res.hidden) { setPosts(list => list.filter(p => p.id !== post.id)); changed(); }
      else setPosts(list => list.map(p => p.id === post.id ? { ...p, reported: true } : p));
    } catch (e) { setNotice({ id: post.id, text: errorText(e, "신고하지 못했습니다.") }); }
  };

  const remove = async (post: StylePost) => {
    try {
      await api<void>(`/api/style-posts/${post.id}`, { method: "DELETE" });
      setPosts(list => list.filter(p => p.id !== post.id));
      setConfirmDelete(null); changed();
    } catch (e) { setNotice({ id: post.id, text: errorText(e, "삭제하지 못했습니다.") }); }
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const { id, draft } = editing;
    const post = posts.find(p => p.id === id);
    if (post?.category === "OUTFIT") { const m = missing(draft.outfit); if (m) { setNotice({ id, text: `${m.ko} 아이템과 색을 골라 주세요.` }); return; } }
    const finalTitle = draft.title.trim() || (post?.category === "OUTFIT" ? outfitTitle(draft.outfit) : "");
    if (!finalTitle) { setNotice({ id, text: "제목을 입력해 주세요." }); return; }
    const linkError = linksProblem(draft.links);
    if (linkError) { setNotice({ id, text: linkError }); return; }
    try {
      let updated = await api<StylePost>(`/api/style-posts/${id}`, { method: "PUT", body: JSON.stringify({ title: finalTitle, comment: draft.comment, colors: [], outfit: post?.category === "OUTFIT" ? draft.outfit : null }) });
      if (draft.photo instanceof Blob) { await uploadPhoto(id, draft.photo); updated = { ...updated, hasPhoto: true }; }
      else if (draft.photo === "remove" && post?.hasPhoto) { await api<void>(`/api/style-posts/${id}/photo`, { method: "DELETE" }); updated = { ...updated, hasPhoto: false }; }
      updated = { ...updated, links: await saveLinks(id, draft.links) };
      setPosts(list => list.map(p => p.id === id ? updated : p));
      setEditing(null); setNotice(null); changed();
    } catch (err) { setNotice({ id, text: errorText(err, "수정하지 못했습니다.") }); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (category === "OUTFIT") { const m = missing(outfit); if (m) { setFormError(`${m.ko} 아이템과 색을 골라 주세요.`); return; } }
    if (category === "TIP" && !comment.trim()) { setFormError("팁 내용을 적어 주세요."); return; }
    const finalTitle = title.trim() || (category === "OUTFIT" ? outfitTitle(outfit) : `${item.name} 입는 팁`);
    const linkError = linksProblem(links);
    if (linkError) { setFormError(linkError); return; }
    setSending(true); setFormError("");
    try {
      const body = { item: item.id, category, title: finalTitle, comment, colors: [], outfit: category === "OUTFIT" ? outfit : null, gender, ageGroup: age };
      let created = await api<StylePost>("/api/style-posts", { method: "POST", body: JSON.stringify(body) });
      if (photo) {
        try { await uploadPhoto(created.id, photo); created = { ...created, hasPhoto: true }; }
        catch (err) { setFormError(`글은 올라갔지만 사진은 못 올렸어요: ${errorText(err, "다시 시도해 주세요.")}`); }
      }
      if (links.length) {
        try { created = { ...created, links: await saveLinks(created.id, links) }; }
        catch (err) { setFormError(`글은 올라갔지만 링크는 못 달았어요: ${errorText(err, "수정에서 다시 달아 주세요.")}`); }
      }
      setTitle(""); setComment(""); setOutfit(startOutfit()); setPhoto(null); setLinks([]);
      if (filter === "ALL" || filter === created.category) setPosts(list => [created, ...list]);
      changed();
    } catch (err) { setFormError(errorText(err, "글을 올리지 못했습니다. 서버 연결을 확인해 주세요.")); }
    finally { setSending(false); }
  };

  const total = posts.reduce((sum, p) => sum + p.votes, 0);

  return <section className="vote-section">
    <div className="section-heading"><div><span className="eyebrow">COMMUNITY</span><h2>{item.name}, 이렇게 입어요</h2></div><div className="select-wrap"><select aria-label="글 정렬" value={sort} onChange={e => setSort(e.target.value)}><option>인기순</option><option>최신순</option></select><ChevronDown size={14}/></div></div>
    <div className="vote-layout">
      <div className="vote-board">
        <div className="vote-filters" role="tablist" aria-label="글 분류">
          {filters.map(f => <Button role="tab" aria-selected={filter === f.id} variant="ghost" key={f.id} className={filter === f.id ? "vote-filter active" : "vote-filter"} onClick={() => setFilter(f.id)}>{f.label}</Button>)}
          <span className="vote-total">{posts.length} POSTS · {total} VOTES</span>
        </div>
        {status === "loading" && <p className="vote-empty">불러오는 중…</p>}
        {status === "error" && <p className="vote-empty">커뮤니티 서버에 연결할 수 없습니다. <Button variant="link" className="vote-retry" onClick={() => { setStatus("loading"); void load(); }}>다시 시도</Button></p>}
        {status === "ready" && posts.length === 0 && <p className="vote-empty">아직 올라온 글이 없어요. 첫 번째 코디를 올려 보세요.</p>}
        {status === "ready" && <ol className="vote-list">{posts.map((post, i) => {
          const share = total ? Math.round(post.votes / total * 100) : 0;
          const isEditing = editing?.id === post.id;
          return <li key={post.id} className={post.mine ? "vote-item vote-item-mine" : "vote-item"}>
            <span className="vote-rank">{String(i + 1).padStart(2, "0")}</span>
            <div className="vote-body">
              <div className="vote-meta">
                <span>{post.category === "OUTFIT" ? <><Shirt size={11}/> OUTFIT</> : <><Lightbulb size={11}/> TIP</>}</span>
                <span className="vote-author">{post.authorUserId ? <Link to="/u/$id" params={{ id: String(post.authorUserId) }} className="vote-author-link">{post.nickname}</Link> : post.nickname}<TierBadge tier={post.authorTier}/>{post.mine && <em>· 내 글</em>} · {timeAgo(post.createdAt)}{post.edited && " · 수정됨"}</span>
              </div>
              {isEditing ? <form className="vote-edit" onSubmit={saveEdit}>
                {post.category === "OUTFIT" && <OutfitEditor outfit={editing.draft.outfit} onChange={o => setEditing(ed => ed && { ...ed, draft: { ...ed.draft, outfit: o } })}/>}
                <PhotoPicker value={editing.draft.photo instanceof Blob ? editing.draft.photo : null} current={post.hasPhoto && editing.draft.photo === "keep" ? photoUrl(post.id, photoVersion[post.id]) : undefined} onChange={b => setEditing(ed => ed && { ...ed, draft: { ...ed.draft, photo: b ?? "remove" } })} links={editing.draft.links} onLinksChange={l => setEditing(ed => ed && { ...ed, draft: { ...ed.draft, links: l } })}/>
                <input className="vote-input" aria-label="제목 수정" maxLength={40} value={editing.draft.title} onChange={e => setEditing({ id: post.id, draft: { ...editing.draft, title: e.target.value } })} placeholder="제목 (비우면 자동)"/>
                <textarea className="vote-input vote-textarea" aria-label="내용 수정" maxLength={200} value={editing.draft.comment} onChange={e => setEditing({ id: post.id, draft: { ...editing.draft, comment: e.target.value } })}/>
                <div className="vote-owner-actions"><Button type="submit" size="sm">저장</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(null); setNotice(null); }}>취소</Button></div>
              </form> : <>
                <h3>{post.title}</h3>
                {post.hasPhoto && <TaggedPhoto className="vote-photo" src={photoUrl(post.id, photoVersion[post.id])} alt={`${post.nickname}님의 ${post.title} 사진`} links={post.links}/>}
                <LinkList links={post.links}/>
                {post.outfit && <OutfitPieces outfit={post.outfit} highlight={item.id} compact/>}
                {post.comment && <p>{post.comment}</p>}
                <span className="vote-track"><span style={{ width: `${share}%` }}/></span>
                <div className="vote-owner-actions">
                  {post.mine ? (confirmDelete === post.id
                    ? <><span className="vote-confirm">정말 삭제할까요?</span><Button size="sm" variant="ghost" className="danger" onClick={() => remove(post)}>삭제</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>취소</Button></>
                    : <><Button size="sm" variant="ghost" onClick={() => { setEditing({ id: post.id, draft: { title: post.title, comment: post.comment, outfit: post.outfit ?? emptyOutfit(), photo: "keep", links: post.links } }); setConfirmDelete(null); setNotice(null); }}><Pencil size={13}/> 수정</Button><Button size="sm" variant="ghost" onClick={() => { setConfirmDelete(post.id); setEditing(null); }}><Trash2 size={13}/> 삭제</Button></>)
                    : <Button size="sm" variant="ghost" disabled={post.reported} onClick={() => report(post)} aria-label={`${post.title} 신고`}><Flag size={13}/> {post.reported ? "신고됨" : "신고"}</Button>}
                </div>
              </>}
              {notice?.id === post.id && <p className="ai-error" role="alert">{notice.text}</p>}
            </div>
            <Button variant="outline" className={post.voted ? "vote-button voted" : "vote-button"} aria-pressed={post.voted} aria-label={`${post.title}에 추천`} onClick={() => vote(post)}><Heart size={15} fill={post.voted ? "currentColor" : "none"}/><strong>{post.votes}</strong></Button>
          </li>;
        })}</ol>}
      </div>
      <div className="vote-side">
        {!user ? <div className="vote-form vote-login">
          <span className="fit-control-heading">SHARE YOUR STYLE</span>
          <h3>내 코디 올리기</h3>
          <p className="vote-form-note">로그인하면 {item.name} 코디나 입는 팁을 올리고 추천할 수 있어요. 한 계정에 한 표씩이라 통계가 공정해져요.</p>
          <Button asChild className="vote-submit"><Link to="/login" search={{ redirect: location.href }}>로그인하고 참여하기 <ArrowUpRight size={16}/></Link></Button>
        </div> : <form className="vote-form" onSubmit={submit}>
          <span className="fit-control-heading">SHARE YOUR STYLE</span>
          <h3>내 코디 올리기</h3>
          <p className="vote-form-note">{item.name}을(를) 어떻게 입는지 알려 주세요. 코디는 STYLE DATA 통계에 바로 반영돼요.</p>
          <div className="vote-category">
            <Button type="button" variant="outline" className={category === "OUTFIT" ? "selected" : ""} onClick={() => setCategory("OUTFIT")}>코디</Button>
            <Button type="button" variant="outline" className={category === "TIP" ? "selected" : ""} onClick={() => setCategory("TIP")}>입는 팁</Button>
          </div>
          {category === "OUTFIT" && <><label className="vote-label">코디 고르기</label><OutfitEditor outfit={outfit} onChange={setOutfit} lockSlot={slotForItem(item)}/></>}
          <label className="vote-label">사진</label>
          <PhotoPicker value={photo} onChange={setPhoto} links={links} onLinksChange={setLinks}/>
          <label className="vote-label" htmlFor="vote-title">제목{category === "OUTFIT" ? " (비우면 자동)" : " (선택)"}</label>
          <input id="vote-title" className="vote-input" maxLength={40} value={title} onChange={e => setTitle(e.target.value)} placeholder={category === "OUTFIT" ? outfitTitle(outfit) || "예) 화이트 셔츠 + 인디고 와이드" : `${item.name} 입는 팁`}/>
          <label className="vote-label" htmlFor="vote-comment">{category === "OUTFIT" ? "한마디" : "팁 내용"}</label>
          <textarea id="vote-comment" className="vote-input vote-textarea" maxLength={200} value={comment} onChange={e => setComment(e.target.value)} placeholder={category === "OUTFIT" ? "이 코디의 포인트를 짧게 남겨 주세요" : "예) 밑단을 한 번 접으면 신발이 잘 보여요"}/>
          <label className="vote-label">성별 · 연령 (선택, 통계 필터에만 쓰여요)</label>
          <div className="vote-demographics">
            <div className="select-wrap"><select aria-label="성별" value={gender} onChange={e => setGender(e.target.value)}>{genders.map(g => <option key={g.id} value={g.id}>{g.id ? g.ko : "성별"}</option>)}</select><ChevronDown size={14}/></div>
            <div className="select-wrap"><select aria-label="연령대" value={age} onChange={e => setAge(e.target.value)}>{ages.map(a => <option key={a.id} value={a.id}>{a.id ? a.ko : "연령대"}</option>)}</select><ChevronDown size={14}/></div>
          </div>
          <p className="vote-form-note vote-as">{user.nickname} 이름으로 올라가고, <Link to="/me" className="inline-link">내 페이지</Link>에도 모여요.</p>
          {formError && <p className="ai-error">{formError}</p>}
          <Button type="submit" className="vote-submit" disabled={sending}>{sending ? "올리는 중…" : "올리기"} <ArrowUpRight size={16}/></Button>
        </form>}
        <RankingPanel version={rankVersion}/>
      </div>
    </div>
  </section>;
}
