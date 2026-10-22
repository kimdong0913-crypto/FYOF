import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Heart, MoveUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RankingPanel } from "@/components/ranking-panel";
import { SearchBox } from "@/components/search-box";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { TierBadge } from "@/components/tier-badge";
import { api, photoUrl } from "@/lib/api";
import { categories, itemById, items } from "@/lib/catalog";
import { useUser } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "FYOF — Find your outfit" },
    { name: "description", content: "아이템 하나로 시작하는 코디 가이드. 지금 사람들이 좋아요를 가장 많이 누른 코디와 스타일 랭킹을 확인하세요." },
    { property: "og:title", content: "FYOF — Find your outfit" },
    { property: "og:description", content: "사람들의 코디로 만드는 스타일 가이드." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

type FeedPost = { id: number; item: string; title: string; colors: string[]; nickname: string; createdAt: string; votes: number; hasPhoto: boolean; authorUserId: number | null; authorTier: number };
type Trending = { post: FeedPost; recentVotes: number };

const featured = ["mustang", "long-padding", "hoodie", "blazer", "slacks", "loafers"];
const periods = [{ id: "day", ko: "24시간" }, { id: "week", ko: "이번 주" }, { id: "all", ko: "전체" }] as const;
const REFRESH_MS = 30_000;

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "방금";
  if (diff < 60) return `${Math.floor(diff)}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

// 코디 카드: 사진이 있으면 사진, 없으면 색 줄무늬. 누르면 그 아이템 가이드(커뮤니티)로.
function FeedCard({ post, rank, recent, label }: { post: FeedPost; rank?: number; recent?: number; label: string }) {
  const item = itemById(post.item);
  return <article className="feed-card">
    <Link to="/item/$id" params={{ id: post.item }} className="feed-card-media" aria-label={`${post.title} — ${item?.name ?? ""} 가이드로`}>
      {post.hasPhoto ? <img src={photoUrl(post.id)} alt={post.title} loading="lazy"/> : <span className="feed-colors">{post.colors.map((c, i) => <i key={i} style={{ background: c }}/>)}</span>}
      {rank !== undefined && <span className="feed-rank">{rank}</span>}
      <span className="feed-likes"><Heart size={13} fill="currentColor"/> {recent ?? post.votes}{recent !== undefined && <small> {label}</small>}</span>
    </Link>
    <div className="feed-card-meta">
      <strong>{post.title}</strong>
      <span>{post.authorUserId ? <Link to="/u/$id" params={{ id: String(post.authorUserId) }}>{post.nickname}</Link> : post.nickname}<TierBadge tier={post.authorTier}/></span>
      <small>{item?.name} · {timeAgo(post.createdAt)}</small>
    </div>
  </article>;
}

function Index() {
  const user = useUser();
  const [period, setPeriod] = useState<(typeof periods)[number]["id"]>("day");
  const [trending, setTrending] = useState<Trending[] | null>(null);
  const [latest, setLatest] = useState<FeedPost[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [rankVersion, setRankVersion] = useState(0);

  // 30초마다 다시 불러와서 "실시간"으로 보이게 한다 (탭이 안 보일 때는 쉰다)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const [t, photos] = await Promise.all([
          api<Trending[]>(`/api/style-posts/trending?period=${period}&limit=8`),
          api<FeedPost[]>("/api/style-posts/latest?photo=true&limit=6"),
        ]);
        const fresh = photos.length ? photos : await api<FeedPost[]>("/api/style-posts/latest?limit=6");
        if (!alive) return;
        setTrending(t); setLatest(fresh); setUpdatedAt(new Date()); setRankVersion(v => v + 1);
      } catch { if (alive) { setTrending(cur => cur ?? []); setLatest(cur => cur ?? []); } }
    };
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [period, user]);

  const label = periods.find(p => p.id === period)!.ko;

  return <><SiteHeader/><main>
    <section className="home-intro wrap">
      <div className="intro-meta"><span>FYOF.</span><span>THE STYLE GUIDE BY REAL PEOPLE <MoveUpRight size={13}/></span></div>
      <div className="intro-main"><div><h1>FIND<br/>YOUR <em>OUTFIT.</em></h1><p>이 옷엔 뭘 입지? 아이템 하나만 고르세요.<br/>사람들이 실제로 입고 좋아요를 누른 코디로 알려 드려요.</p></div><span className="intro-asterisk">✳</span></div>
      <div className="home-search"><div className="section-kicker">START WITH AN ITEM <span>↘</span></div><SearchBox large/><div className="quick-search"><span>POPULAR</span>{featured.map(id => { const it = itemById(id); return it ? <Link key={id} to="/item/$id" params={{ id }}>{it.name} <ArrowUpRight size={13}/></Link> : null; })}</div></div>
    </section>

    <section className="home-trending wrap">
      <div className="section-heading"><div><span className="eyebrow live-eyebrow"><i className="live-dot"/> LIVE · {updatedAt ? `${updatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 갱신` : "불러오는 중"}</span><h2>지금 뜨는 코디<span className="heading-period">.</span></h2><p className="section-sub">{label} 동안 좋아요를 가장 많이 받은 코디예요. 30초마다 새로 고쳐져요.</p></div>
        <div className="ranking-tabs" role="tablist">{periods.map(p => <Button key={p.id} role="tab" aria-selected={period === p.id} variant="ghost" className={period === p.id ? "active" : ""} onClick={() => setPeriod(p.id)}>{p.ko}</Button>)}</div>
      </div>
      {trending === null ? <p className="vote-empty">불러오는 중…</p>
        : trending.length === 0 ? <p className="vote-empty">아직 코디가 없어요. 아이템 가이드에서 첫 코디를 올려 보세요.</p>
        : <div className="feed-card-grid">{trending.map((t, i) => <FeedCard key={t.post.id} post={t.post} rank={i + 1} recent={t.recentVotes} label={label}/>)}</div>}
    </section>

    <section className="home-community wrap">
      <div className="home-community-rank"><RankingPanel version={rankVersion}/></div>
      <div className="home-community-latest">
        <span className="fit-control-heading">JUST POSTED</span>
        <h3>방금 올라온 코디</h3>
        {latest === null ? <p className="vote-form-note">불러오는 중…</p>
          : latest.length === 0 ? <p className="vote-form-note">아직 올라온 코디가 없어요.</p>
          : <div className="latest-grid">{latest.map(p => <FeedCard key={p.id} post={p} label=""/>)}</div>}
        {!user && <Button asChild className="vote-submit home-join"><Link to="/login" search={{ redirect: "/" }}>가입하고 내 코디 올리기 <ArrowUpRight size={16}/></Link></Button>}
      </div>
    </section>

    <section className="home-categories wrap"><div className="section-heading"><div><span className="eyebrow">BROWSE / {items.length} ITEMS</span><h2>카테고리별로 찾아보기<span className="heading-period">.</span></h2></div></div>
      <div className="home-category-grid">{categories.map(c => <Link key={c.id} to="/results" search={{ q: c.ko }} className="home-category"><span>{c.en}</span><strong>{c.ko}</strong><small>{items.filter(i => i.category === c.id).length} ITEMS</small><ArrowUpRight size={18}/></Link>)}</div>
    </section>
    <section className="home-bottom wrap"><span>TRY BEFORE YOU WEAR.</span><Link to="/fitting" search={{ item: "wide" }}>가상으로 먼저 입어보기 <ArrowDownRight size={24}/></Link></section>
  </main><SiteFooter/></>;
}
