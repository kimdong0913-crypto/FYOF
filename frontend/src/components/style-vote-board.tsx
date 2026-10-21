import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, ChevronDown, Heart, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Category = "COLOR" | "ITEM";
type StylePost = { id: number; lookId: string; category: Category; title: string; colors: string[]; comment: string; nickname: string; createdAt: string; votes: number; voted: boolean };

const filters = [{ id: "ALL", label: "전체" }, { id: "COLOR", label: "색조합" }, { id: "ITEM", label: "아이템" }] as const;
const defaultColors = ["#F1F0EC", "#2F3B7A", "#2E2E2E"];

// 로그인이 없으므로 브라우저별 익명 ID 로 중복 투표를 막는다.
function voterId() {
  try {
    const saved = localStorage.getItem("fyof-voter");
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem("fyof-voter", id);
    return id;
  } catch { return "guest"; }
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "방금";
  if (diff < 60) return `${Math.floor(diff)}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

export function StyleVoteBoard({ lookId, lookTitle }: { lookId: string; lookTitle: string }) {
  const [posts, setPosts] = useState<StylePost[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("ALL");
  const [sort, setSort] = useState("인기순");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [category, setCategory] = useState<Category>("COLOR");
  const [colors, setColors] = useState<string[]>(defaultColors.slice(0, 2));
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [nickname, setNickname] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ lookId, category: filter, sort: sort === "최신순" ? "recent" : "votes", voterId: voterId() });
      setPosts(await api<StylePost[]>(`/api/style-posts?${params}`));
      setStatus("ready");
    } catch { setStatus("error"); }
  }, [lookId, filter, sort]);

  useEffect(() => { void load(); }, [load]);

  const vote = async (post: StylePost) => {
    try {
      const res = await api<{ votes: number; voted: boolean }>(`/api/style-posts/${post.id}/vote`, { method: "POST", body: JSON.stringify({ voterId: voterId() }) });
      setPosts(list => list.map(p => p.id === post.id ? { ...p, ...res } : p));
    } catch { setStatus("error"); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setFormError("조합 이름을 입력해 주세요."); return; }
    setSending(true); setFormError("");
    try {
      const created = await api<StylePost>("/api/style-posts", { method: "POST", body: JSON.stringify({ lookId, category, title, colors, comment, nickname }) });
      setTitle(""); setComment("");
      if (filter === "ALL" || filter === created.category) setPosts(list => sort === "최신순" ? [created, ...list] : [...list, created]);
    } catch { setFormError("의견을 올리지 못했습니다. 서버 연결을 확인해 주세요."); }
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
          return <li key={post.id} className="vote-item">
            <span className="vote-rank">{String(i + 1).padStart(2, "0")}</span>
            <div className="vote-body">
              <div className="vote-meta"><span>{post.category === "COLOR" ? "COLOR" : "ITEM"}</span><span>{post.nickname} · {timeAgo(post.createdAt)}</span></div>
              <h3>{post.colors.length > 0 && <span className="vote-swatches">{post.colors.map((c, j) => <i key={j} style={{ background: c }}/>)}</span>}{post.title}</h3>
              {post.comment && <p>{post.comment}</p>}
              <span className="vote-track"><span style={{ width: `${share}%` }}/></span>
            </div>
            <Button variant="outline" className={post.voted ? "vote-button voted" : "vote-button"} aria-pressed={post.voted} aria-label={`${post.title}에 투표`} onClick={() => vote(post)}><Heart size={15} fill={post.voted ? "currentColor" : "none"}/><strong>{post.votes}</strong></Button>
          </li>;
        })}</ol>}
      </div>
      <form className="vote-form" onSubmit={submit}>
        <span className="fit-control-heading">SUGGEST A MATCH</span>
        <h3>나만의 조합 올리기</h3>
        <p className="vote-form-note">{lookTitle}에 어울리는 색조합이나 아이템을 하나씩 제안해 주세요.</p>
        <div className="vote-category">
          <Button type="button" variant="outline" className={category === "COLOR" ? "selected" : ""} onClick={() => setCategory("COLOR")}>색조합</Button>
          <Button type="button" variant="outline" className={category === "ITEM" ? "selected" : ""} onClick={() => setCategory("ITEM")}>패션 아이템</Button>
        </div>
        <label className="vote-label">{category === "COLOR" ? "색상 (최대 3개)" : "대표 색상 (선택)"}</label>
        <div className="vote-colors">
          {colors.map((c, i) => <span key={i} className="vote-color"><input type="color" value={c} aria-label={`색상 ${i + 1}`} onChange={e => setColors(list => list.map((x, j) => j === i ? e.target.value.toUpperCase() : x))}/>{colors.length > (category === "COLOR" ? 1 : 0) && <button type="button" aria-label="색상 삭제" onClick={() => setColors(list => list.filter((_, j) => j !== i))}><X size={11}/></button>}</span>)}
          {colors.length < 3 && <Button type="button" variant="outline" size="icon" className="vote-color-add" aria-label="색상 추가" onClick={() => setColors(list => [...list, defaultColors[list.length] ?? "#6B6B6B"])}><Plus size={15}/></Button>}
        </div>
        <label className="vote-label" htmlFor="vote-title">{category === "COLOR" ? "조합 이름" : "아이템 이름"}</label>
        <input id="vote-title" className="vote-input" maxLength={40} value={title} onChange={e => setTitle(e.target.value)} placeholder={category === "COLOR" ? "예) 베이지 + 라이트 블루" : "예) 브라운 더비 슈즈"}/>
        <label className="vote-label" htmlFor="vote-comment">한마디</label>
        <textarea id="vote-comment" className="vote-input vote-textarea" maxLength={200} value={comment} onChange={e => setComment(e.target.value)} placeholder="왜 어울리는지 짧게 남겨주세요"/>
        <label className="vote-label" htmlFor="vote-nickname">닉네임</label>
        <input id="vote-nickname" className="vote-input" maxLength={12} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="익명"/>
        {formError && <p className="ai-error">{formError}</p>}
        <Button type="submit" className="vote-submit" disabled={sending}>{sending ? "올리는 중…" : "의견 올리기"} <ArrowUpRight size={16}/></Button>
      </form>
    </div>
  </section>;
}
