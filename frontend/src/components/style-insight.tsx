import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutfitPieces } from "@/components/outfit-card";
import { StatSilhouette } from "@/components/stat-silhouette";
import { api } from "@/lib/api";
import { slots, type Item } from "@/lib/catalog";
import { colorShare, pieceShare, slotForItem, type WeightedOutfit } from "@/lib/outfit";
import { ages, colorById, genders } from "@/lib/palette";

type Stats = { posts: number; outfits: WeightedOutfit[] };

// 아이템 하나에 대해 "사람들이 어떤 색으로, 무엇과 함께 입는지"를 커뮤니티 코디로 집계해 보여준다.
export function StyleInsight({ item, version }: { item: Item; version: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [picked, setPicked] = useState<string | undefined>();
  const slot = slotForItem(item);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ item: item.id, gender, age });
    api<Stats>(`/api/style-posts/stats?${params}`)
      .then(s => { if (alive) { setStats(s); setStatus("ready"); } })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, [item.id, gender, age, version]);
  useEffect(() => { setPicked(undefined); }, [item.id, gender, age]);

  // 이 아이템이 원래 칸에 들어간 코디만 모은다
  const mine = useMemo(() => (stats?.outfits ?? []).filter(o => o.outfit[slot].item === item.id), [stats, slot, item.id]);
  const colors = useMemo(() => colorShare(mine, slot), [mine, slot]);
  const color = picked && colors.some(c => c.key === picked) ? picked : colors[0]?.key;
  const withColor = useMemo(() => mine.filter(o => o.outfit[slot].color === color), [mine, slot, color]);
  const others = slots.filter(s => s.id !== slot).map(s => ({ ...s, rows: pieceShare(withColor, s.id).slice(0, 3) }));
  const best = (id: typeof slot) => (id === slot ? colorById(color) : pieceShare(withColor, id)[0]?.value.color);
  const topOutfits = [...withColor].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const genderLabel = genders.find(g => g.id === gender && g.id)?.ko ?? "전체";
  const ageLabel = ages.find(a => a.id === age && a.id)?.ko ?? "전체 연령";
  const filterLabel = `${genderLabel} · ${ageLabel}`;

  return <section className="insight-section">
    <div className="insight-top"><div><span className="eyebrow">STYLE DATA</span><h2>HOW PEOPLE WEAR IT<span className="heading-period">.</span></h2><p>사람들이 {item.name}을(를) 입은 코디 {mine.length}개를 모았어요 · {filterLabel}</p></div>
      <div className="insight-filters">
        <div className="select-wrap select-dark"><select aria-label="성별 필터" value={gender} onChange={e => setGender(e.target.value)}>{genders.map(g => <option key={g.id} value={g.id}>{g.id ? g.ko : "전체 성별"}</option>)}</select><ChevronDown size={14}/></div>
        <div className="select-wrap select-dark"><select aria-label="연령 필터" value={age} onChange={e => setAge(e.target.value)}>{ages.map(a => <option key={a.id} value={a.id}>{a.id ? a.ko : "전체 연령"}</option>)}</select><ChevronDown size={14}/></div>
      </div>
    </div>
    {status === "loading" && <p className="insight-empty">불러오는 중…</p>}
    {status === "error" && <p className="insight-empty">스타일 데이터 서버에 연결할 수 없습니다.</p>}
    {status === "ready" && colors.length === 0 && <p className="insight-empty">아직 {filterLabel} 기준으로 {item.name} 코디가 없어요. 아래 커뮤니티에 첫 코디를 올려 보세요.</p>}
    {status === "ready" && colors.length > 0 && <>
      <div className="insight-content">
        <div className="insight-label"><span>01 / COLOR</span><h3>많이 입는 {item.name} 색</h3><p>색을 누르면 그 색 {item.name}과(와)<br/>함께 입은 아이템이 바뀌어요.</p><div className="style-tags"><span>#코디 1개 = 1표</span><span>#추천 1개 = 1표</span></div></div>
        <div className="insight-visual">
          <div className="insight-bars">{colors.map((c, i) =>
            <Button variant="ghost" key={c.key} className={`bar-row ${color === c.key ? "bar-row-active" : ""}`} aria-pressed={color === c.key} onClick={() => setPicked(c.key)}>
              <span className="bar-head"><span><small>0{i + 1}</small><i className="bar-swatch" style={{ background: c.value.hex }}/>{c.value.ko}</span><strong>{c.percent}%</strong></span>
              <span className="bar-track"><span style={{ width: `${c.percent}%`, background: c.value.hex, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.24)" }}/></span>
            </Button>)}
          </div>
          <StatSilhouette top={best("outer") ?? best("top")} bottom={best("bottom")} shoes={best("shoes")}/>
        </div>
      </div>
      <div className="insight-pairs insight-pairs-wide">
        {others.map(s => <div key={s.id}>
          <span className="insight-pair-title">{colorById(color)?.ko} {item.name}와(과) 입은 <strong>{s.ko}</strong></span>
          {s.rows.length === 0 ? <p className="insight-none">{s.required ? "아직 데이터가 없어요." : `대부분 ${s.ko} 없이 입어요.`}</p>
            : <ol className="pair-list">{s.rows.map(r => <li key={r.key}><Link to="/item/$id" params={{ id: r.value.item.id }}><i style={{ background: r.value.color.hex }}/><span>{r.value.color.ko} {r.value.item.name}</span><strong>{r.percent}%</strong></Link></li>)}</ol>}
        </div>)}
      </div>
      {topOutfits.length > 0 && <div className="insight-outfits">
        <span className="insight-pair-title">많이 추천받은 <strong>{colorById(color)?.ko} {item.name}</strong> 코디</span>
        <div className="insight-outfit-grid">{topOutfits.map(o => <div key={o.id} className="insight-outfit"><strong>{o.title}</strong><OutfitPieces outfit={o.outfit} highlight={item.id} compact/><small>추천 {o.weight - 1}</small></div>)}</div>
      </div>}
    </>}
  </section>;
}
