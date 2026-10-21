import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Heart, ScanFace, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { looks, products } from "@/lib/catalog";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => { const product = products.find(p => p.id === params.id); if (!product) throw notFound(); return product; },
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.name ?? "상품"} — FORME` }, { name: "description", content: `${loaderData?.name ?? "상품"}의 핏과 스타일링을 살펴보고 가상으로 입어보세요.` },
    { property: "og:title", content: `${loaderData?.name ?? "상품"} — FORME` }, { property: "og:description", content: `${loaderData?.name ?? "상품"}의 핏과 스타일링을 살펴보세요.` },
    { property: "og:type", content: "product" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: ProductDetail,
});
function ProductDetail() {
  const product = Route.useLoaderData();
  const [size, setSize] = useState("M");
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const look = looks.find(l => l.id === product.id) ?? looks[0];
  const share = async () => { try { if (navigator.share) await navigator.share({ title: product.name, url: location.href }); else { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } } catch { /* share dismissed */ } };
  return <><SiteHeader/><main className="product-page wrap"><div className="page-breadcrumb"><Link to="/results" search={{ q: "데님 바지" }}>STYLE INDEX</Link><span>/</span>{product.brand}<span>/</span>{product.name}</div><div className="product-layout"><div className="detail-gallery"><div className="detail-primary"><img src={product.image} alt={product.name} width={1024} height={1280}/><span>{product.tag}</span></div><div className="detail-secondary"><img src={look.image} alt={`${product.name} 착용 스타일`} width={1024} height={1280} loading="lazy"/></div></div><div className="detail-info"><Link to="/results" search={{ q: "데님 바지" }} className="back-link"><ArrowLeft size={16}/> BACK TO RESULTS</Link><span className="eyebrow">{product.brand} / DENIM COLLECTION</span><h1>{product.name}</h1><p className="detail-en">{look.english} DENIM PANTS</p><strong className="detail-price">₩{product.price}</strong><div className="detail-rule"/><div className="detail-facts"><div><span>FIT</span><strong>{product.fit}</strong></div><div><span>COLOR</span><strong>{product.color}</strong></div><div><span>STYLE MATCH</span><strong>{look.match}%</strong></div></div><div className="size-section"><div><span>SELECT SIZE</span><span>사이즈 가이드</span></div><div className="size-options">{["S", "M", "L", "XL"].map(s => <Button key={s} variant="outline" aria-pressed={size === s} onClick={() => setSize(s)} className={size === s ? "selected" : ""}>{s}</Button>)}</div></div><div className="detail-actions"><Button asChild size="lg" className="try-button"><Link to="/fitting" search={{ item: product.id }}><ScanFace size={18}/> 가상 피팅으로 입어보기 <ArrowUpRight size={18}/></Link></Button><Button variant="outline" size="icon" aria-label={liked ? "찜 해제" : "찜하기"} aria-pressed={liked} onClick={() => setLiked(!liked)}><Heart size={19} fill={liked ? "currentColor" : "none"}/></Button><Button variant="outline" size="icon" aria-label="상품 공유" onClick={share}>{copied ? <Check size={19}/> : <Share2 size={19}/>}</Button></div><p className="detail-note">카메라를 켜고 나에게 어울리는 핏을 미리 확인해보세요.</p><div className="detail-description"><span>ABOUT THIS PIECE</span><p>일상의 모든 순간에 자연스럽게 스며드는 데님. 편안한 실루엣과 균형 잡힌 비율로 다양한 스타일에 어울립니다.</p></div></div></div></main><SiteFooter/></>;
}
