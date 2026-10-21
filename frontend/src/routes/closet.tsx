import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Download, Heart, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { api, apiImage, errorText } from "@/lib/api";
import { categories, categoryOf, products } from "@/lib/catalog";
import { toggleSaved, useSavedItems } from "@/lib/closet";
import { useUser } from "@/lib/session";

export const Route = createFileRoute("/closet")({
  head: () => ({ meta: [{ title: "나만의 옷장 — FORME" }, { name: "description", content: "찜한 상품과 저장한 피팅 결과를 한곳에서 보세요." }] }),
  component: Closet,
});

type Fit = { id: number; productId: string; ai: boolean; savedAt: string };

function FitCard({ fit, onDelete }: { fit: Fit; onDelete: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const product = products.find(p => p.id === fit.productId);
  useEffect(() => {
    let url: string | null = null;
    apiImage(`/api/closet/fits/${fit.id}/image`).then(u => { url = u; setSrc(u); }).catch(() => setSrc(null));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [fit.id]);
  return <div className="closet-fit">
    <div className="closet-fit-image">{src ? <img src={src} alt={`${product?.name ?? "상품"} 피팅 결과`}/> : <span>불러오는 중…</span>}<span className="closet-fit-tag">{fit.ai ? <><Sparkles size={11}/> AI</> : "OVERLAY"}</span></div>
    <div className="closet-fit-meta"><span>{new Date(fit.savedAt).toLocaleDateString("ko-KR")}</span><strong>{product?.name ?? fit.productId}</strong></div>
    <div className="vote-owner-actions">{src && <a className="closet-download" href={src} download={`forme-closet-${fit.id}.png`}><Download size={13}/> 저장</a>}<Button size="sm" variant="ghost" onClick={onDelete}><Trash2 size={13}/> 삭제</Button></div>
  </div>;
}

function Closet() {
  const user = useUser();
  const saved = useSavedItems();
  const [fits, setFits] = useState<Fit[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [cat, setCat] = useState<"all" | string>("all");

  useEffect(() => {
    if (!user) return;
    api<{ fits: Fit[] }>("/api/closet").then(c => { setFits(c.fits); setStatus("ready"); }).catch(() => setStatus("error"));
  }, [user]);

  if (!user) return <><SiteHeader/><main className="closet-page wrap"><div className="page-breadcrumb">ACCOUNT <span>/</span> MY CLOSET</div><section className="empty-results"><span className="eyebrow">MY CLOSET / 000</span><h2>로그인하면 나만의 옷장을 쓸 수 있어요.</h2><p>상품을 찜하거나 피팅 결과를 저장해 두고 언제든 다시 볼 수 있어요.</p><Button asChild><Link to="/login" search={{ redirect: "/closet" }}>로그인하기 <ArrowUpRight size={16}/></Link></Button></section></main><SiteFooter/></>;

  const items = products.filter(p => saved.has(p.id));
  const presentCats = categories.filter(c => items.some(p => p.category === c.id));
  const shown = cat === "all" ? items : items.filter(p => p.category === cat);
  const removeFit = async (id: number) => {
    try { await api<void>(`/api/closet/fits/${id}`, { method: "DELETE" }); setFits(list => list.filter(f => f.id !== id)); }
    catch (e) { setError(errorText(e, "삭제하지 못했습니다.")); }
  };
  const unsave = async (id: string) => { try { await toggleSaved(id); } catch (e) { setError(errorText(e, "옷장에서 빼지 못했습니다.")); } };

  return <><SiteHeader/><main className="closet-page wrap">
    <div className="page-breadcrumb">ACCOUNT <span>/</span> MY CLOSET</div>
    <div className="results-title-row"><div><span className="eyebrow">MY CLOSET / {user.nickname}</span><h1>나만의 옷장<span className="heading-period">.</span></h1><p>찜한 상품과 저장한 피팅 결과를 모아 봤어요.</p></div><div className="result-count">{String(items.length + fits.length).padStart(2, "0")}<span>SAVED</span></div></div>
    {error && <p className="ai-error" role="alert">{error}</p>}

    <section className="products-section closet-section"><div className="section-heading"><div><span className="eyebrow">01 / SAVED ITEMS</span><h2>찜한 상품</h2></div></div>
      {items.length === 0 ? <p className="vote-empty">아직 찜한 상품이 없어요. 상품 페이지에서 <Heart size={13}/> 를 눌러 담아 보세요.</p> : <>
        {presentCats.length > 1 && <div className="category-chips"><Button variant="ghost" className={cat === "all" ? "active" : ""} onClick={() => setCat("all")}>전체 <small>{items.length}</small></Button>{presentCats.map(c => <Button variant="ghost" key={c.id} className={cat === c.id ? "active" : ""} onClick={() => setCat(c.id)}>{c.ko} <small>{items.filter(p => p.category === c.id).length}</small></Button>)}</div>}
        <div className="product-grid">{shown.map(p => <div key={p.id} className="product-tile closet-item"><Link to="/product/$id" params={{ id: p.id }}><div className="product-image"><img src={p.image} alt={p.name} width={1024} height={1280} loading="lazy"/><span>{categoryOf(p.category).ko}</span></div><div className="product-meta"><span>{p.brand}</span><h3>{p.name}</h3><strong>₩{p.price}</strong></div></Link><Button size="sm" variant="ghost" className="closet-unsave" onClick={() => unsave(p.id)} aria-label={`${p.name} 옷장에서 빼기`}><Heart size={14} fill="currentColor"/> 빼기</Button></div>)}</div>
      </>}
    </section>

    <section className="products-section closet-section"><div className="section-heading"><div><span className="eyebrow">02 / FITTING RESULTS</span><h2>저장한 피팅 결과</h2></div><Button asChild variant="link"><Link to="/fitting" search={{ item: "wide" }}>피팅하러 가기 <ArrowUpRight size={16}/></Link></Button></div>
      {status === "loading" && <p className="vote-empty">불러오는 중…</p>}
      {status === "error" && <p className="vote-empty">옷장 서버에 연결할 수 없습니다.</p>}
      {status === "ready" && fits.length === 0 && <p className="vote-empty">아직 저장한 피팅 결과가 없어요. 가상 피팅에서 "옷장에 저장"을 눌러 보세요.</p>}
      {fits.length > 0 && <div className="closet-fit-grid">{fits.map(f => <FitCard key={f.id} fit={f} onDelete={() => removeFit(f.id)}/>)}</div>}
    </section>
  </main><SiteFooter/></>;
}
