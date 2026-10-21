import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, MoveUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutfitPieces } from "@/components/outfit-card";
import { SearchBox } from "@/components/search-box";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { api } from "@/lib/api";
import { categories, itemById, items, looks } from "@/lib/catalog";
import type { WeightedOutfit } from "@/lib/outfit";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "FYOF — Find your outfit" },
    { name: "description", content: "아이템 하나로 시작하는 코디 가이드. 어울리는 색과 함께 입는 아이템, 사람들이 많이 고른 조합을 알려 드려요." },
    { property: "og:title", content: "FYOF — Find your outfit" },
    { property: "og:description", content: "아이템마다 어울리는 색과 조합을 데이터로 알려 주는 스타일 가이드." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

const featured = ["mustang", "long-padding", "hoodie", "blazer", "slacks", "loafers"];

function Index() {
  const [popular, setPopular] = useState<WeightedOutfit[]>([]);
  useEffect(() => { api<WeightedOutfit[]>("/api/style-posts/popular?limit=6").then(setPopular).catch(() => setPopular([])); }, []);

  return <><SiteHeader/><main>
    <section className="home-intro wrap">
      <div className="intro-meta"><span>FYOF.</span><span>THE STYLE GUIDE BY REAL PEOPLE <MoveUpRight size={13}/></span></div>
      <div className="intro-main"><div><h1>FIND<br/>YOUR <em>OUTFIT.</em></h1><p>이 옷엔 뭘 입지? 아이템 하나만 고르세요.<br/>어울리는 색과 함께 입는 아이템을 사람들의 코디로 알려 드려요.</p></div><span className="intro-asterisk">✳</span></div>
      <div className="home-search"><div className="section-kicker">START WITH AN ITEM <span>↘</span></div><SearchBox large/><div className="quick-search"><span>POPULAR</span>{featured.map(id => { const it = itemById(id); return it ? <Link key={id} to="/item/$id" params={{ id }}>{it.name} <ArrowUpRight size={13}/></Link> : null; })}</div></div>
    </section>

    <section className="home-categories wrap"><div className="section-heading"><div><span className="eyebrow">BROWSE / {items.length} ITEMS</span><h2>카테고리별로 찾아보기<span className="heading-period">.</span></h2></div></div>
      <div className="home-category-grid">{categories.map(c => <Link key={c.id} to="/results" search={{ q: c.ko }} className="home-category"><span>{c.en}</span><strong>{c.ko}</strong><small>{items.filter(i => i.category === c.id).length} ITEMS</small><ArrowUpRight size={18}/></Link>)}</div>
    </section>

    {popular.length > 0 && <section className="home-popular wrap"><div className="section-heading"><div><span className="eyebrow">COMMUNITY PICKS</span><h2>지금 많이 추천받은 코디<span className="heading-period">.</span></h2></div></div>
      <div className="insight-outfit-grid home-outfit-grid">{popular.map(o => <div key={o.id} className="insight-outfit light"><strong>{o.title}</strong><OutfitPieces outfit={o.outfit} compact/><small>추천 {o.weight - 1}</small></div>)}</div>
    </section>}

    <section className="home-editorial"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">DENIM EDIT / 001</span><h2>데님, 핏별로 입는 법<span className="heading-period">.</span></h2></div><Button asChild variant="link"><Link to="/results" search={{ q: "데님" }}>데님 전체 보기 <ArrowUpRight size={17}/></Link></Button></div>
      <div className="home-look-grid">{looks.map((look, i) => <Link className="home-look" key={look.id} to="/item/$id" params={{ id: look.id }}><div className="home-look-image"><img src={look.image} alt={look.description} width={1024} height={1280} loading={i === 0 ? "eager" : "lazy"}/><span className="look-image-index">0{i + 1} / 03</span><span className="look-image-arrow"><ArrowUpRight size={20}/></span></div><div className="home-look-caption"><span>{look.english}</span><strong>{look.title}</strong><span>{look.style}</span></div></Link>)}</div>
    </div></section>
    <section className="home-bottom wrap"><span>TRY BEFORE YOU WEAR.</span><Link to="/fitting" search={{ item: "wide" }}>가상으로 먼저 입어보기 <ArrowDownRight size={24}/></Link></section>
  </main><SiteFooter/></>;
}
