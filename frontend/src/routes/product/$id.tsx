import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Heart, ScanFace, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ComboRecommend } from "@/components/combo-recommend";
import { api, errorText } from "@/lib/api";
import { categoryOf, looks, products } from "@/lib/catalog";
import { toggleSaved, useSavedItems } from "@/lib/closet";
import { colorById } from "@/lib/palette";
import { useUser } from "@/lib/session";

type Combo = { bottom: string; top: string; shoe: string; weight: number };

// 커뮤니티 집계에서 이 데님 색과 가장 많이 입은 상의·신발 색을 찾는다.
function topPick(combos: Combo[], key: "top" | "shoe") {
  const sums = new Map<string, number>();
  for (const c of combos) sums.set(c[key], (sums.get(c[key]) ?? 0) + c.weight);
  return [...sums.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

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
  const [size, setSize] = useState(product.category === "shoes" ? "260" : product.category === "acc" ? "FREE" : "M");
  const user = useUser();
  const navigate = useNavigate();
  const savedItems = useSavedItems();
  const liked = savedItems.has(product.id);
  const [likeError, setLikeError] = useState("");
  const [pairing, setPairing] = useState<{ top?: string | undefined; shoe?: string | undefined } | null>(null);
  const [copied, setCopied] = useState(false);
  const look = looks.find(l => l.id === product.id); // 1차 데님 3종만 착용 사진이 있다
  const category = categoryOf(product.category);
  const canTryOn = category.tryOn !== null && product.hasPhoto;
  const sizes = product.category === "shoes" ? ["250", "260", "270", "280"] : product.category === "acc" ? ["FREE"] : ["S", "M", "L", "XL"];
  const like = async () => {
    if (!user) { await navigate({ to: "/login", search: { redirect: `/product/${product.id}` } }); return; }
    setLikeError("");
    try { await toggleSaved(product.id); } catch (e) { setLikeError(errorText(e, "옷장에 저장하지 못했습니다.")); }
  };
  useEffect(() => {
    if (!look) { setPairing(null); return; }
    let alive = true;
    api<{ combos: Combo[] }>(`/api/style-posts/stats?lookId=${look.id}`).then(({ combos }) => {
      const same = combos.filter(c => c.bottom === product.colorId);
      const base = same.length ? same : combos; // 이 색 조합이 아직 없으면 이 핏 전체 기준
      if (alive) setPairing({ top: topPick(base, "top"), shoe: topPick(base, "shoe") });
    }).catch(() => { if (alive) setPairing(null); });
    return () => { alive = false; };
  }, [look, product.colorId]);
  const share = async () => { try { if (navigator.share) await navigator.share({ title: product.name, url: location.href }); else { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } } catch { /* share dismissed */ } };
  return <><SiteHeader/><main className="product-page wrap"><div className="page-breadcrumb"><Link to="/results" search={{ q: category.ko }}>{category.en}</Link><span>/</span>{product.brand}<span>/</span>{product.name}</div><div className="product-layout"><div className={look ? "detail-gallery" : "detail-gallery detail-gallery-single"}><div className="detail-primary"><img src={product.image} alt={product.name} width={1024} height={1280}/><span>{product.tag}</span></div>{look && <div className="detail-secondary"><img src={look.image} alt={`${product.name} 착용 스타일`} width={1024} height={1280} loading="lazy"/></div>}</div><div className="detail-info"><Link to="/results" search={{ q: category.ko }} className="back-link"><ArrowLeft size={16}/> BACK TO RESULTS</Link><span className="eyebrow">{product.brand} / {category.en}</span><h1>{product.name}</h1><p className="detail-en">{product.english}</p><strong className="detail-price">₩{product.price}</strong><div className="detail-rule"/><div className="detail-facts"><div><span>FIT</span><strong>{product.fit}</strong></div><div><span>COLOR</span><strong>{product.color}</strong></div><div><span>{look ? "STYLE MATCH" : "CATEGORY"}</span><strong>{look ? `${look.match}%` : category.ko}</strong></div></div><div className="size-section"><div><span>SELECT SIZE</span><span>사이즈 가이드</span></div><div className="size-options">{sizes.map(s => <Button key={s} variant="outline" aria-pressed={size === s} onClick={() => setSize(s)} className={size === s ? "selected" : ""}>{s}</Button>)}</div></div><div className="detail-actions">{canTryOn ? <Button asChild size="lg" className="try-button"><Link to="/fitting" search={{ item: product.id }}><ScanFace size={18}/> 가상 피팅으로 입어보기 <ArrowUpRight size={18}/></Link></Button> : <Button size="lg" className="try-button" disabled><ScanFace size={18}/> 가상 피팅 준비 중</Button>}<Button variant="outline" size="icon" aria-label={liked ? "옷장에서 빼기" : "옷장에 담기"} title={liked ? "옷장에서 빼기" : "옷장에 담기"} aria-pressed={liked} onClick={like}><Heart size={19} fill={liked ? "currentColor" : "none"}/></Button><Button variant="outline" size="icon" aria-label="상품 공유" onClick={share}>{copied ? <Check size={19}/> : <Share2 size={19}/>}</Button></div><p className="detail-note">{canTryOn ? "내 사진에 입혀 보고 어울리는 핏을 미리 확인해보세요." : category.tryOn === null ? `${category.ko}는 AI 가상 피팅을 지원하지 않습니다.` : "상품 사진이 준비되면 가상 피팅을 이용할 수 있습니다."}</p>{likeError && <p className="ai-error" role="alert">{likeError}</p>}{liked && <p className="detail-note">나만의 옷장에 담았어요. <Link to="/closet" className="inline-link">옷장 보기</Link></p>}<div className="detail-description"><span>ABOUT THIS PIECE</span><p>{product.description}</p></div></div></div>{pairing && (pairing.top || pairing.shoe) && <section className="detail-pairing"><ComboRecommend title="이 데님과 사람들이 많이 입은 조합" top={colorById(pairing.top)} shoes={colorById(pairing.shoe)} hide="bottom"/></section>}</main><SiteFooter/></>;
}
