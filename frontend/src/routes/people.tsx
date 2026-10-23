import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { TierBadge } from "@/components/tier-badge";
import { UserAvatar } from "@/components/user-avatar";
import { api } from "@/lib/api";

export const Route = createFileRoute("/people")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search["q"] === "string" ? search["q"] : "" }),
  head: () => ({ meta: [{ title: "유저 검색 — FYOF" }, { name: "description", content: "닉네임으로 다른 유저를 찾고 그 유저의 코디를 구경해 보세요." }] }),
  component: PeoplePage,
});

type Person = { userId: number; nickname: string; posts: number; votes: number; tier: number };

// 유저 검색: 검색어는 주소(?q=)에 담아서 뒤로 가기·공유가 된다. 검색어가 없으면 활발한 유저를 보여 준다.
function PeoplePage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [text, setText] = useState(q);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { setText(q); }, [q]);
  // 입력이 멈추고 0.3초 뒤 주소를 바꾼다 (주소가 바뀌면 아래에서 다시 불러온다)
  useEffect(() => {
    if (text.trim() === q.trim()) return;
    const timer = setTimeout(() => void navigate({ to: "/people", search: { q: text.trim() }, replace: true }), 300);
    return () => clearTimeout(timer);
  }, [text, q, navigate]);
  useEffect(() => {
    let alive = true;
    setFailed(false);
    api<Person[]>(`/api/style-posts/people?q=${encodeURIComponent(q.trim())}`)
      .then(p => { if (alive) setPeople(p); })
      .catch(() => { if (alive) { setPeople([]); setFailed(true); } });
    return () => { alive = false; };
  }, [q]);

  const query = q.trim();
  return <><SiteHeader/><main className="people-page wrap">
    <div className="page-breadcrumb">COMMUNITY <span>/</span> USERS</div>
    <div className="results-title-row"><div><span className="eyebrow">COMMUNITY / USERS</span><h1>Find users<span className="heading-period">.</span></h1><p>닉네임으로 다른 유저를 찾고, 그 유저가 올린 코디를 구경해 보세요.</p></div></div>
    <form className="people-search" onSubmit={e => { e.preventDefault(); void navigate({ to: "/people", search: { q: text.trim() }, replace: true }); }}>
      <Search size={22} strokeWidth={1.7}/>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="닉네임을 입력해 보세요" maxLength={20} aria-label="닉네임 검색" autoFocus/>
      {text && <button type="button" aria-label="지우기" onClick={() => setText("")}><X size={18}/></button>}
    </form>

    <section className="people-results">
      <span className="fit-control-heading">{query ? `“${query}” 검색 결과` : "활발한 유저"}{people && people.length > 0 ? ` · ${people.length}명` : ""}</span>
      {people === null ? <p className="vote-form-note">불러오는 중…</p>
        : failed ? <p className="vote-form-note">서버에 연결할 수 없습니다.</p>
        : people.length === 0 ? <p className="vote-form-note">{query ? `“${query}” 닉네임을 가진 유저가 없어요.` : "아직 글을 올린 유저가 없어요."}</p>
        : <ul className="people-grid">{people.map(p => <li key={p.userId}><Link to="/u/$id" params={{ id: String(p.userId) }} className="people-card">
            <UserAvatar userId={p.userId} nickname={p.nickname} className="user-avatar people-avatar"/>
            <span className="people-info"><span className="people-name"><strong>{p.nickname}</strong><TierBadge tier={p.tier}/></span><small>게시물 {p.posts} · 받은 추천 {p.votes}</small></span>
            <ArrowUpRight size={16}/>
          </Link></li>)}</ul>}
    </section>
  </main><SiteFooter/></>;
}
