import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search-box";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { categories, categoryOf, searchItems, type CategoryId } from "@/lib/catalog";
import { colorById } from "@/lib/palette";

export const Route = createFileRoute("/results")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search["q"] === "string" ? search["q"] : "전체" }),
  head: () => ({ meta: [
    { title: "스타일 가이드 — FYOF" },
    { name: "description", content: "아우터부터 액세서리까지, 아이템마다 어울리는 색과 함께 입는 아이템을 찾아보세요." },
    { property: "og:title", content: "스타일 가이드 — FYOF" }, { property: "og:type", content: "website" },
  ] }), component: Results,
});

function Results() {
  const { q } = Route.useSearch();
  const [cat, setCat] = useState<"all" | CategoryId>("all");
  const matched = searchItems(q);
  const presentCats = categories.filter(c => matched.some(i => i.category === c.id));
  const activeCat = presentCats.some(c => c.id === cat) ? cat : "all"; // 검색어가 바뀌어 고른 카테고리가 사라지면 전체로
  const shown = activeCat === "all" ? matched : matched.filter(i => i.category === activeCat);

  return <><SiteHeader/><main className="results-page wrap">
    <div className="page-breadcrumb">DISCOVER <span>/</span> STYLE GUIDE</div>
    <div className="results-title-row"><div><span className="eyebrow">STYLE GUIDE / SEARCH</span><h1>What to wear with<span className="heading-period">.</span></h1><p>{q === "전체" ? "아이템을 고르면 어울리는 색과 함께 입는 아이템을 알려 드려요." : `“${q}”와(과) 관련된 아이템이에요.`}</p></div><div className="result-count">{String(matched.length).padStart(2, "0")}<span>ITEMS</span></div></div>
    <SearchBox initial={q === "전체" ? "" : q} key={q}/>
    {matched.length === 0 ? <section className="empty-results"><span className="eyebrow">NO MATCHES / 000</span><h2>“{q}”에 대한 아이템이 없습니다.</h2><p>무스탕, 후드티, 슬랙스, 로퍼처럼 아이템 이름으로 검색해 보세요.</p><Button asChild><Link to="/results" search={{ q: "전체" }}>전체 아이템 보기 <ArrowUpRight size={16}/></Link></Button></section> : <section className="products-section guide-section">
      {presentCats.length > 1 && <div className="category-chips" role="tablist" aria-label="카테고리"><Button variant="ghost" role="tab" aria-selected={activeCat === "all"} className={activeCat === "all" ? "active" : ""} onClick={() => setCat("all")}>전체 <small>{matched.length}</small></Button>{presentCats.map(c => <Button variant="ghost" role="tab" key={c.id} aria-selected={activeCat === c.id} className={activeCat === c.id ? "active" : ""} onClick={() => setCat(c.id)}>{c.ko} <small>{matched.filter(i => i.category === c.id).length}</small></Button>)}</div>}
      {shown.some(i => i.aiPhoto) && <p className="ai-note-line">아이템 이미지는 이해를 돕기 위해 AI로 만든 예시 이미지예요. 실제 옷과 색감이나 디테일이 다를 수 있어요.</p>}
      <div className="guide-grid guide-grid-large">{shown.map(item => <Link key={item.id} to="/item/$id" params={{ id: item.id }} className="guide-tile">
        <img src={item.image} alt={item.name} width={1024} height={1280} loading="lazy"/>
        <span><small>{categoryOf(item.category).ko} · {item.season}</small><strong>{item.name}</strong><em className="guide-dots">{item.colors.slice(0, 4).map(id => <i key={id} title={colorById(id)?.ko} style={{ background: colorById(id)?.hex }}/>)}</em></span>
      </Link>)}</div>
    </section>}
  </main><SiteFooter/></>;
}
