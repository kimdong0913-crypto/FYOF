import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { api, errorText } from "@/lib/api";
import { useUser } from "@/lib/session";

type Comment = { id: number; userId: number | null; nickname: string; text: string; createdAt: string; mine: boolean; canDelete: boolean };

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "방금";
  if (diff < 60) return `${Math.floor(diff)}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

/** 게시물 댓글. 불러오거나 쓰고 지울 때마다 onCount 로 개수를 알려 준다(글 목록의 "댓글 N" 갱신용). */
export function Comments({ postId, onCount, onNavigate }: { postId: number; onCount?: ((n: number) => void) | undefined; onNavigate?: () => void }) {
  const user = useUser();
  const location = useLocation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const update = (next: Comment[]) => { setComments(next); onCount?.(next.length); };

  const load = useCallback(async () => {
    try {
      const list = await api<Comment[]>(`/api/style-posts/${postId}/comments`);
      setComments(list);
      onCount?.(list.length);
      setStatus("ready");
    } catch { setStatus("error"); }
    // onCount 는 부모가 매번 새로 만들어도 다시 불러오지 않도록 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, user?.username]);

  useEffect(() => { setStatus("loading"); void load(); }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setError("댓글 내용을 적어 주세요."); return; }
    setSending(true); setError("");
    try {
      const created = await api<Comment>(`/api/style-posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ text }) });
      update([...comments, created]);
      setText("");
    } catch (err) { setError(errorText(err, "댓글을 올리지 못했어요.")); }
    finally { setSending(false); }
  };

  const remove = async (c: Comment) => {
    setError("");
    try {
      await api<void>(`/api/style-posts/${postId}/comments/${c.id}`, { method: "DELETE" });
      update(comments.filter(x => x.id !== c.id));
    } catch (err) { setError(errorText(err, "댓글을 지우지 못했어요.")); }
    setConfirmDelete(null);
  };

  return <div className="comments">
    <span className="comments-heading">댓글 {status === "ready" ? comments.length : ""}</span>
    {status === "loading" && <p className="comments-empty">불러오는 중…</p>}
    {status === "error" && <p className="comments-empty">댓글을 불러오지 못했어요. <Button variant="link" className="vote-retry" onClick={() => { setStatus("loading"); void load(); }}>다시 시도</Button></p>}
    {status === "ready" && comments.length === 0 && <p className="comments-empty">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</p>}
    {status === "ready" && comments.length > 0 && <ul className="comment-list">{comments.map(c => <li key={c.id} className="comment">
      <UserAvatar userId={c.userId} nickname={c.nickname}/>
      <div className="comment-body">
        <span className="comment-meta">
          {c.userId ? <Link to="/u/$id" params={{ id: String(c.userId) }} className="vote-author-link" onClick={onNavigate}>{c.nickname}</Link> : <strong>{c.nickname}</strong>}
          {c.mine && <em>· 내 댓글</em>} · {timeAgo(c.createdAt)}
        </span>
        <p>{c.text}</p>
        {c.canDelete && <div className="comment-actions">{confirmDelete === c.id
          ? <><span className="vote-confirm">지울까요?</span><Button size="sm" variant="ghost" className="danger" onClick={() => void remove(c)}>삭제</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>취소</Button></>
          : <Button size="sm" variant="ghost" aria-label="댓글 삭제" onClick={() => setConfirmDelete(c.id)}><Trash2 size={12}/> 삭제</Button>}</div>}
      </div>
    </li>)}</ul>}
    {user ? <form className="comment-form" onSubmit={submit}>
      <input className="vote-input" aria-label="댓글 입력" maxLength={200} value={text} onChange={e => setText(e.target.value)} placeholder="댓글 달기…"/>
      <Button type="submit" size="sm" disabled={sending || !text.trim()}>{sending ? "올리는 중" : "게시"}</Button>
    </form> : <p className="comments-empty"><Link to="/login" search={{ redirect: location.href }} className="inline-link" onClick={onNavigate}>로그인</Link>하면 댓글을 남길 수 있어요.</p>}
    {error && <p className="ai-error" role="alert">{error}</p>}
  </div>;
}
