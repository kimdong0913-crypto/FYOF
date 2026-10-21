import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Sparkles, Loader2, Upload, ImageOff, Download, Minus, Plus, RotateCcw, Share2, Check, Move, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { api, API_URL, errorText } from "@/lib/api";
import { useUser } from "@/lib/session";
import { categoryOf, products } from "@/lib/catalog";
import wideOverlay from "@/assets/denim-overlay.png";
import straightOverlay from "@/assets/straight-overlay.png";
import relaxedOverlay from "@/assets/relaxed-overlay.png";

export const Route = createFileRoute("/fitting")({
  validateSearch: (search: Record<string, unknown>) => ({ item: typeof search["item"] === "string" ? search["item"] : "wide" }),
  head: () => ({ meta: [
    { title: "가상 피팅룸 — FORME" }, { name: "description", content: "내 사진 위에 옷 이미지를 겹쳐보고 피팅 결과를 저장하거나 공유하세요." },
    { property: "og:title", content: "가상 피팅룸 — FORME" }, { property: "og:description", content: "내 사진 위에 옷 이미지를 겹쳐보고 피팅 결과를 저장하거나 공유하세요." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Fitting,
});
function Fitting() {
  const { item } = Route.useSearch();
  const product = products.find(p => p.id === item) ?? products.find(p => p.id === "wide")!;
  const tryOn = categoryOf(product.category).tryOn;
  const canAi = tryOn !== null && product.hasPhoto;
  // 1차 데님 3종은 배경을 뺀 오버레이 이미지가 따로 있고, 나머지는 상품 이미지를 그대로 겹친다.
  const overlay = product.id === "straight" ? straightOverlay : product.id === "relaxed" ? relaxedOverlay : product.id === "wide" ? wideOverlay : product.image;
  const input = useRef<HTMLInputElement>(null);
  const photoEl = useRef<HTMLImageElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const running = photo !== null;
  const [file, setFile] = useState<File | null>(null);
  const [ai, setAi] = useState<{ state: "idle" | "running" | "done" | "error"; url?: string; message?: string }>({ state: "idle" });
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => () => { if (ai.url) URL.revokeObjectURL(ai.url); }, [ai.url]);
  // 사진 + 상품 이미지를 백엔드로 보내 AI 합성을 요청하고, 끝날 때까지 상태를 확인한다.
  const aiFit = async () => {
    if (!file || !tryOn) return;
    setAi({ state: "running" });
    try {
      const garment = await (await fetch(product.image)).blob();
      const form = new FormData();
      form.append("person", file);
      form.append("garment", garment, "garment.jpg");
      form.append("category", tryOn);
      form.append("garmentPhotoType", product.photoType ?? "flat-lay");
      const { jobId } = await api<{ jobId: string }>("/api/tryon", { method: "POST", body: form });
      for (;;) {
        await new Promise(r => setTimeout(r, 3000));
        if (!alive.current) return;
        const job = await api<{ status: "PENDING" | "DONE" | "FAILED"; error?: string }>(`/api/tryon/${jobId}`);
        if (job.status === "FAILED") throw new Error(job.error ?? "AI 처리에 실패했습니다.");
        if (job.status === "DONE") break;
      }
      const img = await fetch(`${API_URL}/api/tryon/${jobId}/image`);
      if (!img.ok) throw new Error("결과 이미지를 가져오지 못했습니다.");
      if (alive.current) setAi({ state: "done", url: URL.createObjectURL(await img.blob()) });
    } catch (e) {
      if (alive.current) setAi({ state: "error", message: e instanceof Error ? e.message : "AI 피팅 중 오류가 발생했습니다." });
    }
  };
  const [error, setError] = useState("");
  const [scale, setScale] = useState(55);
  const [offset, setOffset] = useState({ x: 50, y: 53 });
  const [opacity, setOpacity] = useState(85);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const user = useUser();
  const navigate = useNavigate();
  const [closetMsg, setClosetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // 피팅 결과를 나만의 옷장에 저장한다. ai=true 면 AI 합성 결과, 아니면 지금 화면(사진+오버레이)을 캡처해서 저장.
  const saveToCloset = async (useAi: boolean) => {
    if (!user) { await navigate({ to: "/login", search: { redirect: `/fitting?item=${product.id}` } }); return; }
    setClosetMsg(null);
    try {
      const blob = useAi && ai.url ? await (await fetch(ai.url)).blob() : await capture();
      if (!blob) return;
      const form = new FormData();
      form.append("image", blob, "fit.png");
      form.append("productId", product.id);
      form.append("ai", String(useAi));
      await api("/api/closet/fits", { method: "POST", body: form });
      setClosetMsg({ ok: true, text: "나만의 옷장에 저장했어요." });
    } catch (e) { setClosetMsg({ ok: false, text: errorText(e, "옷장에 저장하지 못했습니다.") }); }
  };
  const clear = () => { setPhoto(null); setFile(null); setAi({ state: "idle" }); setSaved(false); };
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  const load = (file?: File) => { if (!file) return; if (!file.type.startsWith("image/")) { setError("이미지 파일만 올릴 수 있습니다."); return; } setError(""); setSaved(false); setFile(file); setAi({ state: "idle" }); setPhoto(URL.createObjectURL(file)); };
  const capture = async (): Promise<Blob | null> => {
    const p = photoEl.current; const rect = stage.current?.getBoundingClientRect();
    if (!p || !p.naturalWidth || !rect) return null;
    const fit = Math.min(rect.width / p.naturalWidth, rect.height / p.naturalHeight);
    const k = Math.min(1 / fit, 4096 / Math.max(rect.width, rect.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.round(rect.width * k); canvas.height = Math.round(rect.height * k);
    const ctx = canvas.getContext("2d"); if (!ctx) return null;
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const pw = p.naturalWidth * fit; const ph = p.naturalHeight * fit;
    ctx.drawImage(p, (rect.width - pw) / 2 * k, (rect.height - ph) / 2 * k, pw * k, ph * k);
    const image = new Image(); image.src = overlay; await image.decode();
    const displayedWidth = rect.width * scale / 100; const displayedHeight = displayedWidth * image.height / image.width;
    ctx.globalAlpha = opacity / 100;
    ctx.drawImage(image, (rect.width * offset.x / 100 - displayedWidth / 2) * k, (rect.height * offset.y / 100 - displayedHeight / 2) * k, displayedWidth * k, displayedHeight * k);
    return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  };
  const save = async () => { const blob = await capture(); if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `forme-fitting-${product.id}.png`; a.click(); setSaved(true); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const share = async () => { const blob = await capture(); if (!blob) return; const file = new File([blob], `forme-fitting-${product.id}.png`, { type: "image/png" }); try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "FORME 가상 피팅" }); else await save(); } catch { /* share dismissed */ } };
  return <><SiteHeader/><main className="fitting-page wrap"><div className="page-breadcrumb"><Link to="/product/$id" params={{ id: product.id }}>PRODUCT</Link><span>/</span>VIRTUAL FITTING</div><div className="fitting-header"><div><span className="eyebrow">FORME LAB / 001</span><h1>VIRTUAL FIT<span className="heading-period">.</span></h1><p>내 사진 위에 {product.name}을(를) 직접 매치해보세요.</p></div><span>YOUR LOOK, YOUR WAY. / 01</span></div><div className="fitting-layout"><div className="camera-column"><div className="camera-stage" ref={stage} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); load(e.dataTransfer.files[0]); }}>
    {!running && <div className="camera-idle"><Upload size={38} strokeWidth={1}/><span>PHOTO UPLOAD</span><p>전신 사진을 올리면 피팅을 시작할 수 있습니다.</p><Button onClick={() => input.current?.click()}><Upload size={16}/> 사진 올리기</Button>{error && <p className="camera-error" role="alert">{error}</p>}</div>}
    <input ref={input} type="file" accept="image/*" hidden onChange={e => { load(e.target.files?.[0]); e.target.value = ""; }}/>
    <img ref={photoEl} src={photo ?? undefined} alt="업로드한 사진" draggable={false} className={running ? "fit-photo visible" : "fit-photo"}/>
    {running && <><div className="camera-topline"><span><i/> PHOTO PREVIEW</span><span>FORME / FITTING 001</span></div><img className="garment-overlay" src={overlay} alt={`${product.name} 오버레이`} width={768} height={1024} draggable={false} style={{ width: `${scale}%`, left: `${offset.x}%`, top: `${offset.y}%`, opacity: opacity / 100 }} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); }} onPointerMove={e => { if (dragging && stage.current) { const rect = stage.current.getBoundingClientRect(); setOffset({ x: Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (e.clientY - rect.top) / rect.height * 100)) }); } }} onPointerUp={() => setDragging(false)}/><div className="camera-bottomline"><Move size={15}/> 드래그하여 위치를 조절하세요</div></>}
  </div><div className="camera-under"><span>01 — REAL-TIME OVERLAY DEMO</span><span>업로드한 사진은 서버로 전송되지 않고 이 브라우저에서만 사용됩니다.</span></div>{ai.state === "done" && ai.url && <div className="ai-result"><span className="eyebrow">AI RESULT</span><img src={ai.url} alt="AI 피팅 결과"/><a className="ai-download" href={ai.url} download={`forme-ai-${product.id}.png`}><Download size={16}/> AI 결과 저장</a><Button variant="outline" className="ai-download" onClick={() => saveToCloset(true)}><Shirt size={16}/> AI 결과 옷장에 저장</Button></div>}</div><aside className="fitting-controls"><div className="fit-product"><img src={product.image} alt={product.name} width={1024} height={1280}/><div><span>{product.brand} / {product.fit}</span><h2>{product.name}</h2><strong>₩{product.price}</strong></div></div><div className="fit-control-section"><div className="fit-control-heading"><span>01 / POSITION & SCALE</span><Button variant="ghost" size="icon" title="위치 초기화" aria-label="위치 초기화" onClick={() => { setScale(55); setOffset({ x: 50, y: 53 }); setOpacity(85); }}><RotateCcw size={16}/></Button></div><label htmlFor="scale">크기 <strong>{scale}%</strong></label><div className="range-line"><Button variant="ghost" size="icon" aria-label="크기 줄이기" onClick={() => setScale(Math.max(25, scale - 5))}><Minus size={16}/></Button><input id="scale" type="range" min="25" max="90" value={scale} onChange={e => setScale(Number(e.target.value))}/><Button variant="ghost" size="icon" aria-label="크기 늘리기" onClick={() => setScale(Math.min(90, scale + 5))}><Plus size={16}/></Button></div><label htmlFor="opacity">투명도 <strong>{opacity}%</strong></label><input id="opacity" type="range" min="20" max="100" value={opacity} onChange={e => setOpacity(Number(e.target.value))}/></div><div className="fit-control-section"><span className="fit-control-heading">02 / PHOTO</span><Button variant="outline" className="camera-toggle" onClick={() => input.current?.click()}><Upload size={17}/> {running ? "사진 변경" : "사진 올리기"}</Button>{running && <Button variant="outline" className="camera-toggle" onClick={clear}><ImageOff size={17}/> 사진 지우기</Button>}</div><div className="fit-control-section"><span className="fit-control-heading">03 / AI FITTING</span><Button className="ai-fit-button" disabled={!canAi || !running || ai.state === "running"} onClick={aiFit}>{ai.state === "running" ? <><Loader2 size={17} className="spin"/> AI가 합성 중...</> : <><Sparkles size={17}/> AI로 입어보기</>}</Button><p className="ai-note">{ai.state === "running" ? "GPU가 없는 PC에서는 몇 분 걸릴 수 있습니다. 창을 닫지 마세요." : !canAi ? (tryOn === null ? "이 카테고리는 AI 피팅을 지원하지 않습니다." : "상품 사진이 준비되면 AI 피팅을 이용할 수 있습니다.") : "올린 사진에 이 상품을 AI가 자연스럽게 합성합니다."}</p>{ai.state === "error" && <p className="camera-error ai-error" role="alert">{ai.message}</p>}</div><div className="fit-control-section fit-save"><span className="fit-control-heading">04 / YOUR RESULT</span><Button className="download-button" disabled={!running} onClick={save}>{saved ? <Check size={17}/> : <Download size={17}/>} {saved ? "저장 완료" : "피팅 결과 저장"}</Button><Button variant="outline" disabled={!running} onClick={() => saveToCloset(false)}><Shirt size={17}/> 옷장에 저장</Button><Button variant="outline" disabled={!running} onClick={share}><Share2 size={17}/> 결과 공유하기</Button>{closetMsg && <p className={closetMsg.ok ? "detail-note" : "ai-error"} role="status">{closetMsg.text} {closetMsg.ok && <Link to="/closet" className="inline-link">옷장 보기</Link>}</p>}</div><Link to="/product/$id" params={{ id: product.id }} className="fit-back"><ArrowLeft size={16}/> 상품으로 돌아가기</Link></aside></div><div className="fit-notice"><span>NOTE /</span> 화면 속 옷 이미지를 겹쳐 보여주는 데모입니다. 실제 착용 핏과 다를 수 있습니다.</div></main><SiteFooter/></>;
}
