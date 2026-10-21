import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, ChevronDown, SlidersHorizontal, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search-box";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { StatSilhouette } from "@/components/stat-silhouette";
import { StyleVoteBoard } from "@/components/style-vote-board";
import { categories, categoryOf, looks, searchProducts, stats, type CategoryId } from "@/lib/catalog";

const priceOf = (price: string) => Number(price.replace(/,/g, ""));

export const Route = createFileRoute("/results")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search["q"] === "string" ? search["q"] : "데님 바지" }),
  head: () => ({ meta: [
    { title: "스타일 검색 결과 — FORME" }, { name: "description", content: "인기 실루엣 조합과 색상·하의·신발·아우터 매칭 통계를 비교하고 추천 상품을 만나보세요." },
    { property: "og:title", content: "스타일 검색 결과 — FORME" }, { property: "og:description", content: "인기 실루엣 조합과 매칭 통계, 추천 상품을 살펴보세요." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Results,
});

const statSections = [
  { group: "COLOR", region: "bottom", title: "BOTTOM COLORS", subtitle: "어울리는 하의 색상", rows: stats.colors },
  { group: "COLOR", region: "shoes", title: "SHOE COLORS", subtitle: "어울리는 신발 색상", rows: stats.shoeColors },
  { group: "FIT", region: "bottom", title: "BOTTOM FIT", subtitle: "많이 선택한 하의 핏", rows: stats.types },
  { group: "FIT", region: "shoes", title: "SHOE TYPES", subtitle: "신발 종류 조합", rows: stats.shoes },
  { group: "FIT", region: "outer", title: "OUTERWEAR", subtitle: "아우터 조합", rows: stats.outers },
] as const;

const statGroups = [
  { id: "COLOR", en: "COLOR", ko: "색상" },
  { id: "FIT", en: "FIT & COMBINATION", ko: "핏 · 조합" },
] as const;

function Results() {
  const { q } = Route.useSearch();
  const denimSearch = /데님|청바지|진|denim|jeans/i.test(q);
  const [gender, setGender] = useState("전체");
  const [age, setAge] = useState("전체 연령");
  const [active, setActive] = useState("wide");
  const [tab, setTab] = useState(0);
  const [statGroup, setStatGroup] = useState<"COLOR" | "FIT">("COLOR");
  const [selectedStat, setSelectedStat] = useState(0);
  const [sort, setSort] = useState("인기순");
  const [cat, setCat] = useState<"all" | CategoryId>("all");
  const matched = searchProducts(q);
  const presentCats = categories.filter(c => matched.some(p => p.category === c.id));
  const activeCat = presentCats.some(c => c.id === cat) ? cat : "all"; // 검색어가 바뀌어 고른 카테고리가 사라지면 전체로
  const shown = (activeCat === "all" ? matched : matched.filter(p => p.category === activeCat)).slice().sort((a, b) => sort === "가격 낮은순" ? priceOf(a.price) - priceOf(b.price) : sort === "가격 높은순" ? priceOf(b.price) - priceOf(a.price) : 0);
  const selected = looks.find(l => l.id === active) ?? looks[0];
  const profileOffset = (gender === "남성" ? 3 : gender === "여성" ? 0 : 1) + (age === "20대" ? 2 : age === "30대" ? 1 : 0);
  const grouped = statSections.filter(s => s.group === statGroup);
  const activeSection = (grouped[tab] ?? grouped[0])!;
  const adjustedRows = activeSection.rows.map((row, i, rows) => ({ ...row, value: i === 0 ? row.value + profileOffset : i === rows.length - 1 ? row.value - profileOffset : row.value }));
  const highlighted = adjustedRows[selectedStat] ?? adjustedRows[0];
  return <><SiteHeader/><main className="results-page wrap">
    <div className="page-breadcrumb">DISCOVER <span>/</span> SEARCH RESULTS</div>
    <div className="results-title-row"><div><span className="eyebrow">STYLE INDEX / SEARCH 001</span><h1>Find your match<span className="heading-period">.</span></h1><p>“{q}”에 어울리는 스타일을 발견하세요.</p></div><div className="result-count">{String(matched.length).padStart(2, "0")}<span>ITEMS FOUND</span></div></div>
    <SearchBox initial={q} key={q}/>
    <div className="results-toolbar"><div className="toolbar-left"><SlidersHorizontal size={17}/><span>FILTER BY</span><div className="select-wrap"><select aria-label="성별 필터" value={gender} onChange={e => setGender(e.target.value)}><option>전체</option><option>여성</option><option>남성</option></select><ChevronDown size={14}/></div><div className="select-wrap"><select aria-label="연령대 필터" value={age} onChange={e => setAge(e.target.value)}><option>전체 연령</option><option>10대</option><option>20대</option><option>30대</option><option>40대 이상</option></select><ChevronDown size={14}/></div></div><span className="toolbar-note">{gender} · {age} 기준 스타일 인사이트</span></div>
    {matched.length === 0 ? <section className="empty-results"><span className="eyebrow">NO MATCHES / 000</span><h2>“{q}”에 대한 결과가 없습니다.</h2><p>아우터, 상의, 이너, 하의, 신발, 액세서리로 검색해 보세요.</p><Button asChild><Link to="/results" search={{ q: "전체" }}>전체 상품 보기 <ArrowUpRight size={16}/></Link></Button></section> : <>
    {denimSearch && <><section className="result-section"><div className="section-heading result-heading"><div><span className="eyebrow">01 / SILHOUETTE RANKING</span><h2>가장 많이 선택한 조합</h2></div><span className="section-aside">COMPARE THE LOOKS / 01—03</span></div>
      <div className="rank-grid">{looks.map((look) => <div key={look.id} className={`rank-item ${active === look.id ? "rank-item-active" : ""}`}><Button variant="ghost" className="rank-image-button" onClick={() => setActive(look.id)} aria-label={`${look.title} 조합 선택`}><img src={look.image} alt={look.description} width={1024} height={1280} loading="lazy"/><span className="rank-number">{look.rank}</span><span className="rank-match">{look.match}% MATCH</span></Button><div className="rank-detail"><div><span>{look.english} / {look.style}</span><h3>{look.title}</h3><p>{look.description}</p></div><Button variant="ghost" size="icon" onClick={() => setActive(look.id)} aria-label={`${look.title} 통계 보기`}><ArrowUpRight size={20}/></Button></div></div>)}</div>
    </section>
    <section className="insight-section"><div className="insight-top"><div><span className="eyebrow">02 / STYLE DATA</span><h2>THE STYLE BREAKDOWN<span className="heading-period">.</span></h2><p>{selected.title}와 함께한 스타일 조합</p></div><span className="data-disclaimer">ILLUSTRATIVE STYLE DATA</span></div>
      <div className="stat-groups" role="tablist" aria-label="통계 분류">
        {statGroups.map(g => <Button role="tab" aria-selected={statGroup === g.id} variant="ghost" key={g.id} className={statGroup === g.id ? "stat-group active" : "stat-group"} onClick={() => { setStatGroup(g.id); setTab(0); setSelectedStat(0); }}><span>{g.en}</span><em>{g.ko}</em></Button>)}
      </div>
      <div className="style-tabs" role="tablist" aria-label="스타일 통계">{grouped.map((section, i) => <Button role="tab" aria-selected={tab === i} variant="ghost" key={section.title} className={tab === i ? "style-tab active" : "style-tab"} onClick={() => { setTab(i); setSelectedStat(0); }}>{section.title}</Button>)}</div>
      <div className="insight-content"><div className="insight-label"><span>0{tab + 1} / 0{grouped.length}</span><h3>{activeSection.subtitle}</h3><p>선택한 실루엣에 어울리는<br/>스타일 분포를 살펴보세요.</p><div className="style-tags"><span>#{selected.style}</span><span>#데일리</span><span>#데님스타일</span></div></div><div className="insight-visual"><div className="insight-bars">{adjustedRows.map((row, i) => <Button variant="ghost" key={row.label} className={`bar-row ${selectedStat === i ? "bar-row-active" : ""}`} aria-pressed={selectedStat === i} onClick={() => setSelectedStat(i)}><span className="bar-head"><span><small>0{i + 1}</small>{row.label}</span><strong>{row.value}%</strong></span><span className="bar-track"><span style={{ width: `${row.value}%`, background: row.swatch, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.24)" }}/></span></Button>)}</div>{highlighted && <StatSilhouette region={activeSection.region} label={highlighted.label} value={highlighted.value} swatch={highlighted.swatch}/>}</div></div></section>
    </>}
    <section className="products-section"><div className="section-heading"><div><span className="eyebrow">{denimSearch ? "03 / SHOP THE LOOK" : "01 / SHOP"}</span><h2>{denimSearch ? "이 실루엣을 완성하는 아이템" : `“${q}” 검색 결과`}</h2></div><div className="select-wrap"><select aria-label="상품 정렬" value={sort} onChange={e => setSort(e.target.value)}><option>인기순</option><option>가격 낮은순</option><option>가격 높은순</option></select><ChevronDown size={14}/></div></div>
      {presentCats.length > 1 && <div className="category-chips" role="tablist" aria-label="카테고리"><Button variant="ghost" role="tab" aria-selected={activeCat === "all"} className={activeCat === "all" ? "active" : ""} onClick={() => setCat("all")}>전체 <small>{matched.length}</small></Button>{presentCats.map(c => <Button variant="ghost" role="tab" key={c.id} aria-selected={activeCat === c.id} className={activeCat === c.id ? "active" : ""} onClick={() => setCat(c.id)}>{c.ko} <small>{matched.filter(p => p.category === c.id).length}</small></Button>)}</div>}
      <div className="product-grid">{shown.map(product => <Link key={product.id} to="/product/$id" params={{ id: product.id }} className="product-tile"><div className="product-image"><img src={product.image} alt={product.name} width={1024} height={1280} loading="lazy"/><span>{product.tag}</span><span className="product-image-arrow"><ArrowUpRight size={18}/></span></div><div className="product-meta"><span>{product.brand} · {categoryOf(product.category).ko}</span><h3>{product.name}</h3><strong>₩{product.price}</strong></div></Link>)}</div></section>
    {denimSearch && <><StyleVoteBoard lookId={selected.id} lookTitle={selected.title}/>
    <Link className="fit-banner" to="/fitting" search={{ item: active }}><span><ScanFace size={26}/><span>VIRTUAL FITTING ROOM</span></span><strong>입어보기 전에, 먼저 경험해보세요.</strong><ArrowUpRight size={26}/></Link></>}</>}
  </main><SiteFooter/></>;
}
