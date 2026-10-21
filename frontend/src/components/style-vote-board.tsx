import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, ChevronDown, Crown, Flag, Heart, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { api, errorText } from "@/lib/api";
import { useUser } from "@/lib/session";
import { ages, colorById, denimColors, genders, wearColors, type PaletteColor } from "@/lib/palette";

type Category = "COLOR" | "ITEM";
type StylePost = { id: number; lookId: string; category: Category; title: string; colors: string[]; comment: string; nickname: string; createdAt: string; edited: boolean; bottomColor: string; topColor: string; shoeColor: string; votes: number; voted: boolean; mine: boolean; reported: boolean; authorBadge: boolean };
type RankEntry = { rank: number; nickname: string; posts: number; votes: number; badge: boolean; me: boolean };
type Slots = { bottom: string; top: string; shoe: string };
type Draft = { title: string; comment: string; colors: string[] } & Slots;

const filters = [{ id: "ALL", label: "전체" }, { id: "COLOR", label: "색조합" }, { id: "ITEM", label: "아이템" }] as const;
const defaultColors = ["#F1F0EC", "#2F3B7A", "#2E2E2E"];

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "방금";
  if (diff < 60) return `${Math.floor(diff)}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

function ColorPicker({ colors, setColors, min }: { colors: string[]; setColors: (update: (list: string[]) => string[]) => void; min: number }) {
  return <div className="vote-colors">
    {colors.map((c, i) => <span key={i} className="vote-color"><input type="color" value={c} aria-label={`색상 ${i + 1}`} onChange={e => setColors(list => list.map((x, j) => j === i ? e.target.value.toUpperCase() : x))}/>{colors.length > min && <button type="button" aria-label="색상 삭제" onClick={() => setColors(list => list.filter((_, j) => j !== i))}><X size={11}/></button>}</span>)}
    {colors.length < 3 && <Button type="button" variant="outline" size="icon" className="vote-color-add" aria-label="색상 추가" onClick={() => setColors(list => [...list, defaultColors[list.length] ?? "#6B6B6B"])}><Plus size={15}/></Button>}
  </div>;
}

// 색조합 글은 집계를 위해 정해진 색 목록에서 하나씩 고른다.
function SwatchPicker({ label, options, value, onChange }: { label: string; options: PaletteColor[]; value: string; onChange: (id: string) => void }) {
  return <div className="swatch-picker" role="radiogroup" aria-label={label}>
    <span className="swatch-picker-label">{label}<strong>{colorById(value)?.ko ?? "선택"}</strong></span>
    <div>{options.map(c => <button type="button" role="radio" aria-checked={value === c.id} key={c.id} title={c.ko} aria-label={c.ko} className={value === c.id ? "selected" : ""} style={{ background: c.hex }} onClick={() => onChange(c.id)}/>)}</div>
  </div>;
}

function SlotPickers({ slots, onChange }: { slots: Slots; onChange: (slots: Slots) => void }) {
  return <div className="slot-pickers">
    <SwatchPicker label="데님" options={denimColors} value={slots.bottom} onChange={bottom => onChange({ ...slots, bottom })}/>
    <SwatchPicker label="상의" options={wearColors} value={slots.top} onChange={top => onChange({ ...slots, top })}/>
    <SwatchPicker label="신발" options={wearColors} value={slots.shoe} onChange={shoe => onChange({ ...slots, shoe })}/>
  </div>;
}

const emptySlots: Slots = { bottom: "", top: "", shoe: "" };
const comboTitle = (s: Slots) => `${colorById(s.top)?.ko ?? ""} 상의 + ${colorById(s.bottom)?.ko ?? ""} 데님`;

export function StyleVoteBoard({ lookId, lookTitle, onChange }: { lookId: string; lookTitle: string; onChange?: () => void }) {
  const [posts, setPosts] = useState<StylePost[]>([]);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("ALL");
  const [sort, setSort] = useState("인기순");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [category, setCategory] = useState<Category>("COLOR");
  const [colors, setColors] = useState<string[]>(defaultColors.slice(2, 3)) // 아이템 글의 대표 색;
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const goLogin = () => navigate({ to: "/login", search: { redirect: location.href } });
  const [slots, setSlots] = useState<Slots>(emptySlots);
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const [editing, setEditing] = useState<{ id: number; draft: Draft } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const loadRanking = useCallback(async () => {
    try { setRanking(await api<RankEntry[]>("/api/style-posts/ranking")); } catch { /* 순위는 없어도 게시판은 보이게 둔다 */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ lookId, category: filter, sort: sort === "최신순" ? "recent" : "votes" });
      setPosts(await api<StylePost[]>(`/api/style-posts?${params}`));
      setStatus("ready");
    } catch { setStatus("error"); }
  }, [lookId, filter, sort]);

  // 로그인·로그아웃하면 내 글/내 투표 표시가 바뀌므로 다시 불러온다
  useEffect(() => { void load(); }, [load, user]);
  useEffect(() => { void loadRanking(); }, [loadRanking, user]);

  const vote = async (post: StylePost) => {
    if (!user) { await goLogin(); return; }
    try {
      const res = await api<{ votes: number; voted: boolean }>(`/api/style-posts/${post.id}/vote`, { method: "POST" });
      setPosts(list => list.map(p => p.id === post.id ? { ...p, ...res } : p));
      void loadRanking(); onChange?.();
    } catch (e) { setNotice({ id: post.id, text: errorText(e, "투표하지 못했습니다.") }); }
  };

  const report = async (post: StylePost) => {
    if (!user) { await goLogin(); return; }
    try {
      const res = await api<{ reported: boolean; hidden: boolean }>(`/api/style-posts/${post.id}/report`, { method: "POST" });
      if (res.hidden) { setPosts(list => list.filter(p => p.id !== post.id)); void loadRanking(); onChange?.(); }
      else setPosts(list => list.map(p => p.id === post.id ? { ...p, reported: true } : p));
    } catch (e) { setNotice({ id: post.id, text: errorText(e, "신고하지 못했습니다.") }); }
  };

  const remove = async (post: StylePost) => {
    try {
      await api<void>(`/api/style-posts/${post.id}`, { method: "DELETE" });
      setPosts(list => list.filter(p => p.id !== post.id));
      setConfirmDelete(null);
      void loadRanking(); onChange?.();
    } catch (e) { setNotice({ id: post.id, text: errorText(e, "삭제하지 못했습니다.") }); }
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const { id, draft } = editing;
    if (!draft.title.trim()) { setNotice({ id, text: "조합 이름을 입력해 주세요." }); return; }
    const post = posts.find(p => p.id === id);
    if (post?.category === "COLOR" && (!draft.bottom || !draft.top || !draft.shoe)) { setNotice({ id, text: "데님·상의·신발 색을 모두 골라 주세요." }); return; }
    try {
      const { bottom, top, shoe, ...rest } = draft;
      const updated = await api<StylePost>(`/api/style-posts/${id}`, { method: "PUT", body: JSON.stringify({ ...rest, bottomColor: bottom, topColor: top, shoeColor: shoe }) });
      setPosts(list => list.map(p => p.id === id ? updated : p));
      setEditing(null); setNotice(null); onChange?.();
    } catch (err) { setNotice({ id, text: errorText(err, "수정하지 못했습니다.") }); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (category === "COLOR" && (!slots.bottom || !slots.top || !slots.shoe)) { setFormError("데님·상의·신발 색을 모두 골라 주세요."); return; }
    const finalTitle = title.trim() || (category === "COLOR" ? comboTitle(slots) : "");
    if (!finalTitle) { setFormError("아이템 이름을 입력해 주세요."); return; }
    setSending(true); setFormError("");
    try {
      const body = { lookId, category, title: finalTitle, colors, comment, gender, ageGroup: age, bottomColor: slots.bottom, topColor: slots.top, shoeColor: slots.shoe };
      const created = await api<StylePost>("/api/style-posts", { method: "POST", body: JSON.stringify(body) });
      setTitle(""); setComment(""); setSlots(emptySlots);
      if (filter === "ALL" || filter === created.category) setPosts(list => sort === "최신순" ? [created, ...list] : [...list, created]);
      void loadRanking(); onChange?.();
    } catch (err) { setFormError(errorText(err, "의견을 올리지 못했습니다. 서버 연결을 확인해 주세요.")); }
    finally { setSending(false); }
  };

  const total = posts.reduce((sum, p) => sum + p.votes, 0);

  return <section className="vote-section">
    <div className="section-heading"><div><span className="eyebrow">04 / COMMUNITY VOTE</span><h2>어울리는 조합에 투표하세요</h2></div><div className="select-wrap"><select aria-label="의견 정렬" value={sort} onChange={e => setSort(e.target.value)}><option>인기순</option><option>최신순</option></select><ChevronDown size={14}/></div></div>
    <div className="vote-layout">
      <div className="vote-board">
        <div className="vote-filters" role="tablist" aria-label="의견 분류">
          {filters.map(f => <Button role="tab" aria-selected={filter === f.id} variant="ghost" key={f.id} className={filter === f.id ? "vote-filter active" : "vote-filter"} onClick={() => setFilter(f.id)}>{f.label}</Button>)}
          <span className="vote-total">{lookTitle} · {posts.length} OPINIONS · {total} VOTES</span>
        </div>
        {status === "loading" && <p className="vote-empty">불러오는 중…</p>}
        {status === "error" && <p className="vote-empty">투표 서버에 연결할 수 없습니다. <Button variant="link" className="vote-retry" onClick={() => { setStatus("loading"); void load(); }}>다시 시도</Button></p>}
        {status === "ready" && posts.length === 0 && <p className="vote-empty">아직 올라온 의견이 없어요. 첫 번째 조합을 제안해 보세요.</p>}
        {status === "ready" && <ol className="vote-list">{posts.map((post, i) => {
          const share = total ? Math.round(post.votes / total * 100) : 0;
          const isEditing = editing?.id === post.id;
          return <li key={post.id} className={post.mine ? "vote-item vote-item-mine" : "vote-item"}>
            <span className="vote-rank">{String(i + 1).padStart(2, "0")}</span>
            <div className="vote-body">
              <div className="vote-meta">
                <span>{post.category === "COLOR" ? "COLOR" : "ITEM"}</span>
                <span className="vote-author">{post.authorBadge && <span className="fashionista-badge" title="패셔니스타"><Crown size={11}/> FASHIONISTA</span>}{post.nickname}{post.mine && <em>· 내 글</em>} · {timeAgo(post.createdAt)}{post.edited && " · 수정됨"}</span>
              </div>
              {isEditing ? <form className="vote-edit" onSubmit={saveEdit}>
                {post.category === "COLOR"
                  ? <SlotPickers slots={editing.draft} onChange={next => setEditing(ed => ed && { ...ed, draft: { ...ed.draft, ...next } })}/>
                  : <ColorPicker colors={editing.draft.colors} min={0} setColors={update => setEditing(ed => ed && { ...ed, draft: { ...ed.draft, colors: update(ed.draft.colors) } })}/>}
                <input className="vote-input" aria-label="조합 이름 수정" maxLength={40} value={editing.draft.title} onChange={e => setEditing({ id: post.id, draft: { ...editing.draft, title: e.target.value } })}/>
                <textarea className="vote-input vote-textarea" aria-label="한마디 수정" maxLength={200} value={editing.draft.comment} onChange={e => setEditing({ id: post.id, draft: { ...editing.draft, comment: e.target.value } })}/>
                <div className="vote-owner-actions"><Button type="submit" size="sm">저장</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(null); setNotice(null); }}>취소</Button></div>
              </form> : <>
                <h3>{post.colors.length > 0 && <span className="vote-swatches">{post.colors.map((c, j) => <i key={j} style={{ background: c }}/>)}</span>}{post.title}</h3>
                {post.comment && <p>{post.comment}</p>}
                <span className="vote-track"><span style={{ width: `${share}%` }}/></span>
                <div className="vote-owner-actions">
                  {post.mine ? (confirmDelete === post.id
                    ? <><span className="vote-confirm">정말 삭제할까요?</span><Button size="sm" variant="ghost" className="danger" onClick={() => remove(post)}>삭제</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>취소</Button></>
                    : <><Button size="sm" variant="ghost" onClick={() => { setEditing({ id: post.id, draft: { title: post.title, comment: post.comment, colors: [...post.colors], bottom: post.bottomColor, top: post.topColor, shoe: post.shoeColor } }); setConfirmDelete(null); setNotice(null); }}><Pencil size={13}/> 수정</Button><Button size="sm" variant="ghost" onClick={() => { setConfirmDelete(post.id); setEditing(null); }}><Trash2 size={13}/> 삭제</Button></>)
                    : <Button size="sm" variant="ghost" disabled={post.reported} onClick={() => report(post)} aria-label={`${post.title} 신고`}><Flag size={13}/> {post.reported ? "신고됨" : "신고"}</Button>}
                </div>
              </>}
              {notice?.id === post.id && <p className="ai-error" role="alert">{notice.text}</p>}
            </div>
            <Button variant="outline" className={post.voted ? "vote-button voted" : "vote-button"} aria-pressed={post.voted} aria-label={`${post.title}에 투표`} onClick={() => vote(post)}><Heart size={15} fill={post.voted ? "currentColor" : "none"}/><strong>{post.votes}</strong></Button>
          </li>;
        })}</ol>}
      </div>
      <div className="vote-side">
        {!user ? <div className="vote-form vote-login">
          <span className="fit-control-heading">SUGGEST A MATCH</span>
          <h3>나만의 조합 올리기</h3>
          <p className="vote-form-note">로그인하면 {lookTitle}에 어울리는 조합을 올리고 투표할 수 있어요. 한 계정에 한 표씩이라 순위가 공정해져요.</p>
          <Button asChild className="vote-submit"><Link to="/login" search={{ redirect: location.href }}>로그인하고 참여하기 <ArrowUpRight size={16}/></Link></Button>
        </div> : <form className="vote-form" onSubmit={submit}>
          <span className="fit-control-heading">SUGGEST A MATCH</span>
          <h3>나만의 조합 올리기</h3>
          <p className="vote-form-note">{lookTitle}에 어울리는 색조합이나 아이템을 하나씩 제안해 주세요.</p>
          <div className="vote-category">
            <Button type="button" variant="outline" className={category === "COLOR" ? "selected" : ""} onClick={() => setCategory("COLOR")}>색조합</Button>
            <Button type="button" variant="outline" className={category === "ITEM" ? "selected" : ""} onClick={() => setCategory("ITEM")}>패션 아이템</Button>
          </div>
          {category === "COLOR"
            ? <><label className="vote-label">색 고르기 (STYLE DATA 에 반영돼요)</label><SlotPickers slots={slots} onChange={setSlots}/></>
            : <><label className="vote-label">대표 색상 (선택)</label><ColorPicker colors={colors} setColors={setColors} min={0}/></>}
          <label className="vote-label" htmlFor="vote-title">{category === "COLOR" ? "조합 이름 (비우면 자동)" : "아이템 이름"}</label>
          <input id="vote-title" className="vote-input" maxLength={40} value={title} onChange={e => setTitle(e.target.value)} placeholder={category === "COLOR" ? (slots.bottom && slots.top ? comboTitle(slots) : "예) 화이트 상의 + 인디고 데님") : "예) 브라운 더비 슈즈"}/>
          <label className="vote-label" htmlFor="vote-comment">한마디</label>
          <textarea id="vote-comment" className="vote-input vote-textarea" maxLength={200} value={comment} onChange={e => setComment(e.target.value)} placeholder="왜 어울리는지 짧게 남겨주세요"/>
          <p className="vote-form-note vote-as">{user.nickname} 이름으로 올라가요.</p>
          <label className="vote-label">성별 · 연령 (선택, 통계 필터에만 쓰여요)</label>
          <div className="vote-demographics">
            <div className="select-wrap"><select aria-label="성별" value={gender} onChange={e => setGender(e.target.value)}>{genders.map(g => <option key={g.id} value={g.id}>{g.id ? g.ko : "성별"}</option>)}</select><ChevronDown size={14}/></div>
            <div className="select-wrap"><select aria-label="연령대" value={age} onChange={e => setAge(e.target.value)}>{ages.map(a => <option key={a.id} value={a.id}>{a.id ? a.ko : "연령대"}</option>)}</select><ChevronDown size={14}/></div>
          </div>
          {formError && <p className="ai-error">{formError}</p>}
          <Button type="submit" className="vote-submit" disabled={sending}>{sending ? "올리는 중…" : "의견 올리기"} <ArrowUpRight size={16}/></Button>
        </form>}
        <div className="vote-ranking">
          <span className="fit-control-heading">FASHIONISTA RANKING</span>
          <h3>추천 많이 받은 사람</h3>
          {ranking.length === 0 ? <p className="vote-form-note">아직 순위가 없어요. 조합을 올리고 추천을 받아 보세요.</p>
            : <ol>{ranking.map(r => <li key={r.rank} className={r.me ? "me" : ""}><span className="rank-no">{r.rank}</span><span className="rank-name">{r.badge && <Crown size={13} aria-label="패셔니스타"/>}{r.nickname}{r.me && <em> (나)</em>}</span><span className="rank-score"><Heart size={11} fill="currentColor"/> {r.votes} · 글 {r.posts}</span></li>)}</ol>}
          <p className="vote-badge-rule"><Crown size={12}/> 추천 10개 이상, 또는 글 5개 이상 + 추천 3개 이상이면 패셔니스타 뱃지를 받아요. 내 글에 누른 추천은 세지 않아요.</p>
        </div>
      </div>
    </div>
  </section>;
}
