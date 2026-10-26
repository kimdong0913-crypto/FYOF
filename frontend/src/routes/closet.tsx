import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCheck, Download, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardHand } from "@/components/card-hand";
import { OutfitPieces } from "@/components/outfit-card";
import { OutfitDraw } from "@/components/outfit-draw";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { api, apiImage, errorText } from "@/lib/api";
import { categories, categoryOf, itemById, items } from "@/lib/catalog";
import { setManySaved, toggleSaved, useSavedItems } from "@/lib/closet";
import type { WeightedOutfit } from "@/lib/outfit";
import { useUser } from "@/lib/session";

export const Route = createFileRoute("/closet")({
  head: () => ({ meta: [{ title: "내 옷장 — FYOF" }, { name: "description", content: "가지고 있는 아이템을 등록하면 그 아이템으로 입을 수 있는 인기 코디를 찾아 드려요." }] }),
  component: Closet,
});

type Fit = { id: number; productId: string; ai: boolean; savedAt: string };

function FitCard({ fit, onDelete }: { fit: Fit; onDelete: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const item = itemById(fit.productId);
  useEffect(() => {
    let url: string | null = null;
    apiImage(`/api/closet/fits/${fit.id}/image`).then(u => { url = u; setSrc(u); }).catch(() => setSrc(null));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [fit.id]);
  return <div className="closet-fit">
    <div className="closet-fit-image">{src ? <img src={src} alt={`${item?.name ?? "아이템"} 피팅 결과`}/> : <span>불러오는 중…</span>}<span className="closet-fit-tag">{fit.ai ? <><Sparkles size={11}/> AI</> : "OVERLAY"}</span></div>
    <div className="closet-fit-meta"><span>{new Date(fit.savedAt).toLocaleDateString("ko-KR")}</span><strong>{item?.name ?? fit.productId}</strong></div>
    <div className="vote-owner-actions">{src && <a className="closet-download" href={src} download={`fyof-closet-${fit.id}.png`}><Download size={13}/> 저장</a>}<Button size="sm" variant="ghost" onClick={onDelete}><Trash2 size={13}/> 삭제</Button></div>
  </div>;
}

function Closet() {
  const user = useUser();
  const saved = useSavedItems();
  const [fits, setFits] = useState<Fit[]>([]);
  const [outfits, setOutfits] = useState<WeightedOutfit[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [addCat, setAddCat] = useState<string>("outer");

  useEffect(() => {
    if (!user) return;
    api<{ fits: Fit[] }>("/api/closet").then(c => { setFits(c.fits); setStatus("ready"); }).catch(() => setStatus("error"));
  }, [user]);
  // 옷장이 바뀔 때마다 내 아이템으로 입을 수 있는 코디를 다시 찾는다
  const savedKey = [...saved].sort().join(",");
  useEffect(() => {
    if (!user) return;
    api<WeightedOutfit[]>("/api/closet/outfits").then(setOutfits).catch(() => setOutfits([]));
  }, [user, savedKey]);

  if (!user) return <><SiteHeader/><main className="closet-page wrap"><div className="page-breadcrumb">ACCOUNT <span>/</span> MY CLOSET</div><section className="empty-results"><span className="eyebrow">MY CLOSET / 000</span><h2>로그인하면 내 옷장을 쓸 수 있어요.</h2><p>가지고 있는 아이템을 등록하면, 그 아이템들로 입을 수 있는 인기 코디를 찾아 드려요.</p><Button asChild><Link to="/login" search={{ redirect: "/closet" }}>로그인하기 <ArrowUpRight size={16}/></Link></Button></section></main><SiteFooter/></>;

  const mine = items.filter(i => saved.has(i.id));
  const addList = items.filter(i => i.category === addCat);
  // 아이템 추가하기: 지금 보고 있는 칸 전체 담기 / 전체 빼기
  const bulk = async (on: boolean) => { setError(""); try { await setManySaved(addList.map(i => i.id), on); } catch (e) { setError(errorText(e, "옷장을 바꾸지 못했습니다.")); } };
  const toggle = async (id: string) => { setError(""); try { await toggleSaved(id); } catch (e) { setError(errorText(e, "옷장을 바꾸지 못했습니다.")); } };
  const removeFit = async (id: number) => {
    try { await api<void>(`/api/closet/fits/${id}`, { method: "DELETE" }); setFits(list => list.filter(f => f.id !== id)); }
    catch (e) { setError(errorText(e, "삭제하지 못했습니다.")); }
  };

  return <><SiteHeader/><main className="closet-page wrap">
    <div className="page-breadcrumb">ACCOUNT <span>/</span> MY CLOSET</div>
    <div className="results-title-row"><div><span className="eyebrow">MY CLOSET / {user.nickname}</span><h1>My closet<span className="heading-period">.</span></h1><p>가지고 있는 아이템을 등록하면, 그 아이템으로 입을 수 있는 코디를 찾아 드려요.</p></div><div className="result-count">{String(mine.length).padStart(2, "0")}<span>MY ITEMS</span></div></div>
    {error && <p className="ai-error" role="alert">{error}</p>}

    <section className="products-section closet-section"><div className="section-heading"><div><span className="eyebrow">01 / MY ITEMS</span><h2>내가 가진 아이템</h2></div><Button variant={adding ? "default" : "outline"} onClick={() => setAdding(a => !a)}>{adding ? <><X size={15}/> 닫기</> : <><Plus size={15}/> 아이템 추가하기</>}</Button></div>
      {adding && <div className="closet-adder">
        <div className="adder-top">
          <div className="category-chips">{categories.map(c => <Button key={c.id} variant="ghost" className={addCat === c.id ? "active" : ""} onClick={() => setAddCat(c.id)}>{c.ko}</Button>)}</div>
          <div className="adder-bulk">
            <Button size="sm" variant="outline" disabled={addList.every(i => saved.has(i.id))} onClick={() => void bulk(true)}><CheckCheck size={14}/> 전체 선택</Button>
            <Button size="sm" variant="outline" disabled={!addList.some(i => saved.has(i.id))} onClick={() => void bulk(false)}><X size={14}/> 전체 취소</Button>
          </div>
        </div>
        <div className="closet-adder-grid">{addList.map(i => <button type="button" key={i.id} className={saved.has(i.id) ? "selected" : ""} aria-pressed={saved.has(i.id)} onClick={() => toggle(i.id)}>
          <img src={i.image} alt="" loading="lazy"/><span className="adder-mark">{saved.has(i.id) ? "✓" : "+"}</span><strong>{i.name}</strong>
        </button>)}</div>
      </div>}
      {mine.length === 0 ? <p className="vote-empty">아직 등록한 아이템이 없어요. "아이템 추가하기"나 아이템 가이드의 "내 옷장에 추가"로 담아 보세요.</p>
        : <div className="closet-rows">{categories.filter(c => mine.some(i => i.category === c.id)).map(c => {
            const row = mine.filter(i => i.category === c.id);
            return <div key={c.id} className="closet-row">
              <div className="closet-row-head"><strong>{c.ko}</strong><span>{c.en}</span><small>{row.length}개</small></div>
              <CardHand items={row} onRemove={id => void toggle(id)}/>
            </div>;
          })}</div>}
    </section>

    {mine.length > 0 && <section className="products-section closet-section"><div className="section-heading"><div><span className="eyebrow">02 / TODAY'S PICK</span><h2>오늘의 코디 뽑기</h2></div></div>
      <OutfitDraw mine={mine}/>
    </section>}

    <section className="products-section closet-section"><div className="section-heading"><div><span className="eyebrow">03 / OUTFITS FROM MY CLOSET</span><h2>내 아이템으로 입을 수 있는 인기 코디</h2></div></div>
      {outfits.length === 0 ? <p className="vote-empty">{mine.length === 0 ? "아이템을 등록하면 여기에 코디가 나와요." : "아직 내 아이템만으로 맞출 수 있는 코디가 없어요. 상의·하의·신발을 함께 등록해 보세요."}</p>
        : <div className="insight-outfit-grid home-outfit-grid">{outfits.map(o => <div key={o.id} className="insight-outfit light"><strong>{o.title}</strong><OutfitPieces outfit={o.outfit} compact/><small>추천 {o.weight - 1} · {categoryOf(itemById(o.outfit.bottom.item)?.category ?? "bottom").ko} 기준</small></div>)}</div>}
    </section>

    <section className="products-section closet-section"><div className="section-heading"><div><span className="eyebrow">04 / FITTING RESULTS</span><h2>저장한 피팅 결과</h2></div><Button asChild variant="link"><Link to="/fitting" search={{ item: "denim", fit: "wide" }}>피팅하러 가기 <ArrowUpRight size={16}/></Link></Button></div>
      {status === "loading" && <p className="vote-empty">불러오는 중…</p>}
      {status === "error" && <p className="vote-empty">옷장 서버에 연결할 수 없습니다.</p>}
      {status === "ready" && fits.length === 0 && <p className="vote-empty">아직 저장한 피팅 결과가 없어요. 가상 피팅에서 "옷장에 저장"을 눌러 보세요.</p>}
      {fits.length > 0 && <div className="closet-fit-grid">{fits.map(f => <FitCard key={f.id} fit={f} onDelete={() => removeFit(f.id)}/>)}</div>}
    </section>
  </main><SiteFooter/></>;
}
