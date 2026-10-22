import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Plus, ScanFace, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { StyleInsight } from "@/components/style-insight";
import { StyleVoteBoard } from "@/components/style-vote-board";
import { errorText } from "@/lib/api";
import { categoryOf, fitImage, itemById, items, legacyItems } from "@/lib/catalog";
import { fitById } from "@/lib/fits";
import { toggleSaved, useSavedItems } from "@/lib/closet";
import { colorById } from "@/lib/palette";
import { useUser } from "@/lib/session";

export const Route = createFileRoute("/item/$id")({
  // ?fit=wide 처럼 핏을 고른 채로 들어올 수 있다
  validateSearch: (search: Record<string, unknown>): { fit?: string } => (typeof search["fit"] === "string" ? { fit: search["fit"] } : {}),
  loader: ({ params }) => { const item = itemById(params.id); if (!item) throw notFound(); return item; },
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.name ?? "아이템"} 코디 가이드 — FYOF` },
    { name: "description", content: `${loaderData?.name ?? "아이템"}에 어울리는 색과 함께 입는 아이템, 사람들이 많이 고른 코디를 확인하세요.` },
    { property: "og:title", content: `${loaderData?.name ?? "아이템"} 코디 가이드 — FYOF` }, { property: "og:type", content: "article" },
  ] }),
  component: ItemGuide,
});

function ItemGuide() {
  const item = Route.useLoaderData();
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const category = categoryOf(item.category);
  // 고른 핏: 주소의 ?fit → 예전 주소(/item/wide)의 핏 → 없음(전체 핏)
  const fromUrl = search.fit ?? legacyItems[id]?.fit;
  const fit = fromUrl && item.fits.includes(fromUrl) ? fromUrl : undefined;
  const setFit = (f: string | undefined) => void navigate({ to: "/item/$id", params: { id: item.id }, search: f ? { fit: f } : {}, replace: true, resetScroll: false });
  const user = useUser();
  const owned = useSavedItems().has(item.id);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [statsVersion, setStatsVersion] = useState(0); // 커뮤니티 글·추천이 바뀌면 STYLE DATA 를 다시 불러온다
  const canTryOn = category.tryOn !== null && item.hasPhoto;
  const shownFit = fit ?? item.defaultFit;
  const related = items.filter(i => i.category === item.category && i.id !== item.id).slice(0, 6);

  const own = async () => {
    if (!user) { await navigate({ to: "/login", search: { redirect: `/item/${item.id}` } }); return; }
    setError("");
    try { await toggleSaved(item.id); } catch (e) { setError(errorText(e, "옷장에 담지 못했습니다.")); }
  };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: `${item.name} 코디 가이드`, url: location.href }); else { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } } catch { /* 공유 취소 */ } };

  return <><SiteHeader/><main className="product-page wrap">
    <div className="page-breadcrumb"><Link to="/results" search={{ q: category.ko }}>{category.en}</Link><span>/</span>{item.name}</div>
    <div className="product-layout">
      <div className="detail-gallery detail-gallery-single"><div className="detail-primary"><img src={fitImage(item, shownFit)} alt={`${fitById(shownFit)?.ko ?? ""} ${item.name}`} width={1024} height={1280}/><span>{fitById(shownFit) ? `${fitById(shownFit)!.ko} 핏` : category.ko}</span></div></div>
      <div className="detail-info">
        <Link to="/results" search={{ q: category.ko }} className="back-link"><ArrowLeft size={16}/> {category.ko} 전체 보기</Link>
        <span className="eyebrow">STYLE GUIDE / {category.en}</span>
        <h1>{item.name}</h1>
        <p className="detail-en">{item.english}</p>
        <div className="detail-rule"/>
        <div className="detail-facts"><div><span>SEASON</span><strong>{item.season}</strong></div><div><span>CATEGORY</span><strong>{category.ko}</strong></div></div>
        {item.fits.length > 0 && <div className="guide-fits"><span>핏 종류 · 누르면 그 핏 코디만 볼 수 있어요</span>
          <div role="radiogroup" aria-label="핏 고르기">
            <button type="button" role="radio" aria-checked={!fit} className={!fit ? "selected" : ""} onClick={() => setFit(undefined)}><span className="fit-all">ALL</span><strong>전체</strong></button>
            {item.fits.map(f => <button type="button" role="radio" aria-checked={fit === f} key={f} className={fit === f ? "selected" : ""} title={fitById(f)?.desc} onClick={() => setFit(f)}><img src={fitImage(item, f)} alt=""/><strong>{fitById(f)?.ko}</strong></button>)}
          </div>
          {fit && <p className="guide-fit-desc">{fitById(fit)?.ko} — {fitById(fit)?.desc}</p>}
        </div>}
        <div className="guide-colors"><span>많이 입는 색</span><div>{item.colors.map(id => { const c = colorById(id); return c ? <em key={id}><i style={{ background: c.hex }}/>{c.ko}</em> : null; })}</div></div>
        <div className="detail-description"><span>HOW TO WEAR</span><ul className="guide-tips">{item.tips.map(t => <li key={t}>{t}</li>)}</ul></div>
        <div className="detail-actions">
          <Button size="lg" variant={owned ? "default" : "outline"} className="try-button" aria-pressed={owned} onClick={own}>{owned ? <><Check size={18}/> 내 옷장에 있어요</> : <><Plus size={18}/> 내 옷장에 추가</>}</Button>
          {canTryOn && <Button asChild size="lg" variant="outline" className="guide-fit"><Link to="/fitting" search={shownFit ? { item: item.id, fit: shownFit } : { item: item.id }}><ScanFace size={18}/> 입어 보기</Link></Button>}
          <Button variant="outline" size="icon" aria-label="가이드 공유" onClick={share}>{copied ? <Check size={19}/> : <Share2 size={19}/>}</Button>
        </div>
        {error && <p className="ai-error" role="alert">{error}</p>}
        <p className="detail-note">{owned ? <>내 옷장에 담겨 있어요. <Link to="/closet" className="inline-link">내 옷으로 입을 수 있는 코디 보기</Link></> : "가지고 있는 옷이면 내 옷장에 추가해 두세요. 내 옷으로 입을 수 있는 코디를 찾아 드려요."}</p>
      </div>
    </div>
    <StyleInsight item={item} fit={fit} onFitChange={setFit} version={statsVersion}/>
    <StyleVoteBoard item={item} fit={shownFit} onChange={() => setStatsVersion(v => v + 1)}/>
    {related.length > 0 && <section className="products-section"><div className="section-heading"><div><span className="eyebrow">MORE {category.en}</span><h2>다른 {category.ko}도 살펴보세요</h2></div></div>
      <div className="guide-grid">{related.map(r => <Link key={r.id} to="/item/$id" params={{ id: r.id }} className="guide-tile"><img src={r.image} alt={r.name} width={1024} height={1280} loading="lazy"/><span><strong>{r.name}</strong><small>{r.season}</small></span></Link>)}</div>
    </section>}
  </main><SiteFooter/></>;
}
