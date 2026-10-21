import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, MoveUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search-box";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { looks } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "FORME — Find your outfit" },
    { name: "description", content: "아이템 하나로 시작하는 스타일 탐색. 인기 코디 실루엣과 매칭 통계를 살펴보세요." },
    { property: "og:title", content: "FORME — Find your outfit" },
    { property: "og:description", content: "아이템 하나로 시작하는 스타일 탐색. 인기 코디 실루엣과 매칭 통계를 살펴보세요." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  return <><SiteHeader/><main>
    <section className="home-intro wrap">
      <div className="intro-meta"><span>FYOF.</span><span>THE NEW WAY TO GET DRESSED <MoveUpRight size={13}/></span></div>
      <div className="intro-main"><div><h1>FIND<br/>YOUR <em>OUTFIT.</em></h1><p>옷 하나에서 시작되는 무한한 조합.<br/>당신의 스타일을 가장 잘 아는 곳.</p></div><span className="intro-asterisk">✳</span></div>
      <div className="home-search"><div className="section-kicker">START WITH AN ITEM <span>↘</span></div><SearchBox large/><div className="quick-search"><span>EXPLORE DENIM</span>{["데님 바지", "와이드 데님", "스트레이트 진", "청바지"].map(q => <Link key={q} to="/results" search={{ q }}>{q} <ArrowUpRight size={13}/></Link>)}</div></div>
    </section>
    <section className="home-editorial"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">CURATED FOR YOU / 001</span><h2>오늘의 실루엣<span className="heading-period">.</span></h2></div><Button asChild variant="link"><Link to="/results" search={{ q: "데님 바지" }}>VIEW ALL STYLES <ArrowUpRight size={17}/></Link></Button></div>
      <div className="home-look-grid">{looks.map((look, i) => <Link className="home-look" key={look.id} to="/results" search={{ q: "데님 바지" }}><div className="home-look-image"><img src={look.image} alt={look.description} width={1024} height={1280} loading={i === 0 ? "eager" : "lazy"}/><span className="look-image-index">0{i + 1} / 03</span><span className="look-image-arrow"><ArrowUpRight size={20}/></span></div><div className="home-look-caption"><span>{look.english}</span><strong>{look.title}</strong><span>{look.match}% MATCH</span></div></Link>)}</div>
    </div></section>
    <section className="home-bottom wrap"><span>YOUR STYLE, DECODED.</span><Link to="/fitting" search={{ item: "wide" }}>가상으로 먼저 입어보기 <ArrowDownRight size={24}/></Link></section>
  </main><SiteFooter/></>;
}
