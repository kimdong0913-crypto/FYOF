import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Pencil, Ruler, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorText } from "@/lib/api";
import { adviceFor, parts, shapes, type Body, type BodyShape } from "@/lib/body";
import { fitImage } from "@/lib/catalog";
import { fitById } from "@/lib/fits";

/** 내 프로필에만 보이는 "내 체형 맞춤 핏": 키·몸무게·체형을 입력하면 어울리는 핏과 아이템을 추천한다. */
export function BodyFit() {
  const [body, setBody] = useState<Body | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    api<Body | undefined>("/api/body")
      .then(b => { setBody(b ?? null); setEditing(!b); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, []);

  return <section className="body-fit" aria-label="내 체형 맞춤 핏">
    <div className="body-fit-head">
      <h2><Ruler size={16}/> 내 체형 맞춤 핏</h2>
      <span className="body-fit-private"><Lock size={11}/> 나만 볼 수 있어요</span>
    </div>
    {status === "loading" ? <p className="body-fit-note"><Loader2 className="spin" size={14}/> 불러오는 중…</p>
      : status === "error" ? <p className="body-fit-note">서버에 연결할 수 없습니다.</p>
      : editing || !body ? <BodyForm initial={body} onSaved={b => { setBody(b); setEditing(false); }} onCancel={body ? () => setEditing(false) : undefined} onRemoved={() => setBody(null)}/>
      : <BodyAdvice body={body} onEdit={() => setEditing(true)}/>}
  </section>;
}

function BodyForm({ initial, onSaved, onCancel, onRemoved }: { initial: Body | null; onSaved: (b: Body) => void; onCancel: (() => void) | undefined; onRemoved: () => void }) {
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : "");
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : "");
  const [shape, setShape] = useState<BodyShape>(initial?.shape ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const b: Body = { heightCm: Math.round(Number(height)), weightKg: Math.round(Number(weight)), shape };
    if (!(b.heightCm >= 120 && b.heightCm <= 220)) { setError("키는 120~220cm 사이로 입력해 주세요."); return; }
    if (!(b.weightKg >= 30 && b.weightKg <= 200)) { setError("몸무게는 30~200kg 사이로 입력해 주세요."); return; }
    setBusy(true); setError("");
    try { onSaved(await api<Body>("/api/body", { method: "PUT", body: JSON.stringify(b) })); }
    catch (err) { setError(errorText(err, "저장하지 못했어요.")); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError("");
    try { await api<void>("/api/body", { method: "DELETE" }); setHeight(""); setWeight(""); setShape(""); onRemoved(); }
    catch (err) { setError(errorText(err, "지우지 못했어요.")); }
    finally { setBusy(false); }
  };

  return <form className="body-form" onSubmit={e => void save(e)}>
    <p className="body-fit-note">키와 몸무게를 넣으면 어울리는 핏과 아이템을 골라 드려요.</p>
    <div className="body-inputs">
      <label>키<span><input type="number" inputMode="numeric" min={120} max={220} value={height} onChange={e => setHeight(e.target.value)} placeholder="175" required/> cm</span></label>
      <label>몸무게<span><input type="number" inputMode="numeric" min={30} max={200} value={weight} onChange={e => setWeight(e.target.value)} placeholder="68" required/> kg</span></label>
    </div>
    <fieldset className="body-shapes"><legend>체형 (선택)</legend>
      {shapes.map(s => <button type="button" key={s.id} role="radio" aria-checked={shape === s.id} className={shape === s.id ? "selected" : ""} onClick={() => setShape(s.id)}>
        <strong>{s.ko}</strong><small>{s.desc}</small>
      </button>)}
    </fieldset>
    {error && <p className="ai-error" role="alert">{error}</p>}
    <div className="body-form-actions">
      <Button type="submit" size="sm" disabled={busy}>{busy && <Loader2 className="spin" size={14}/>} 추천 받기</Button>
      {onCancel && <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>취소</Button>}
      {initial && <Button type="button" size="sm" variant="ghost" onClick={() => void remove()} disabled={busy}><Trash2 size={13}/> 체형 정보 삭제</Button>}
    </div>
  </form>;
}

function BodyAdvice({ body, onEdit }: { body: Body; onEdit: () => void }) {
  const advice = adviceFor(body);
  const shape = shapes.find(s => s.id === body.shape);
  return <div className="body-advice">
    <div className="body-summary">
      <span>{body.heightCm}cm</span><span>{body.weightKg}kg</span>{body.shape && <span>{shape?.ko}</span>}
      <button type="button" onClick={onEdit}><Pencil size={12}/> 수정</button>
    </div>
    <ul className="body-reasons">{advice.reasons.map(r => <li key={r.label}><strong>{r.label}</strong> {r.why}</li>)}</ul>
    <div className="body-parts">
      {parts.map(p => <div key={p.id} className="body-part">
        <span>{p.ko}</span>
        {advice.fits[p.id].length > 0
          ? advice.fits[p.id].map((f, i) => <p key={f.id}><strong>{i === 0 ? "추천" : "다음"} · {f.ko}</strong><small>{f.desc}</small></p>)
          : <p><small>어떤 핏이든 잘 어울려요</small></p>}
        {advice.avoid[p.id].length > 0 && <p className="body-avoid">피하면 좋아요: {advice.avoid[p.id].map(f => f.ko).join(", ")}</p>}
      </div>)}
    </div>
    <div className="body-items-head">이런 아이템부터 입어 보세요</div>
    <div className="body-items">
      {advice.items.map(({ item, fit }) => <Link key={item.id} to="/item/$id" params={{ id: item.id }} search={fit ? { fit } : {}} className="body-item">
        <img src={fit && fit !== item.defaultFit ? fitImage(item, fit) : item.image} alt="" loading="lazy"/>
        <strong>{item.name}</strong>
        <small>{fit ? `${fitById(fit)?.ko} 핏으로` : item.english}</small>
      </Link>)}
    </div>
    <p className="body-fit-note">키·몸무게로 계산한 일반적인 가이드예요. 체형 정보는 다른 사람에게 보이지 않아요.</p>
  </div>;
}
