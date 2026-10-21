import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatSilhouette } from "@/components/stat-silhouette";
import { api } from "@/lib/api";
import { colorById, denimColors, wearColors, type PaletteColor } from "@/lib/palette";

type Combo = { bottom: string; top: string; shoe: string; weight: number };
type Item = { title: string; colors: string[]; weight: number };
type Stats = { posts: number; combos: Combo[]; items: Item[] };
type Row = { color: PaletteColor; value: number };

// 같은 색끼리 비중을 더해 % 로 바꾼다. 팔레트 순서가 아니라 많이 고른 순으로 정렬한다.
function share(combos: Combo[], key: "bottom" | "top" | "shoe", palette: PaletteColor[]): Row[] {
  const total = combos.reduce((sum, c) => sum + c.weight, 0);
  if (!total) return [];
  const sums = new Map<string, number>();
  for (const c of combos) sums.set(c[key], (sums.get(c[key]) ?? 0) + c.weight);
  return palette.filter(p => sums.has(p.id))
    .map(p => ({ color: p, value: Math.round((sums.get(p.id) ?? 0) / total * 100) }))
    .sort((a, b) => b.value - a.value);
}

function Bars({ rows, selected, onSelect, small = false }: { rows: Row[]; selected?: string | undefined; onSelect?: (id: string) => void; small?: boolean }) {
  return <div className={small ? "insight-bars insight-bars-small" : "insight-bars"}>{rows.map((row, i) =>
    <Button variant="ghost" key={row.color.id} className={`bar-row ${selected === row.color.id ? "bar-row-active" : ""}`} aria-pressed={selected === row.color.id} onClick={() => onSelect?.(row.color.id)}>
      <span className="bar-head"><span><small>0{i + 1}</small><i className="bar-swatch" style={{ background: row.color.hex }}/>{row.color.ko}</span><strong>{row.value}%</strong></span>
      <span className="bar-track"><span style={{ width: `${row.value}%`, background: row.color.hex, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.24)" }}/></span>
    </Button>)}
  </div>;
}

export function StyleInsight({ lookId, lookTitle, gender, age, filterLabel, version }: { lookId: string; lookTitle: string; gender: string; age: string; filterLabel: string; version: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [view, setView] = useState<"COLOR" | "ITEM">("COLOR");
  const [pick, setPick] = useState<{ bottom?: string | undefined; top?: string | undefined; shoe?: string | undefined }>({});

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ lookId, gender, age });
    api<Stats>(`/api/style-posts/stats?${params}`)
      .then(s => { if (alive) { setStats(s); setStatus("ready"); } })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, [lookId, gender, age, version]);

  useEffect(() => { setPick({}); }, [lookId, gender, age]);

  const combos = useMemo(() => stats?.combos ?? [], [stats]);
  const bottoms = useMemo(() => share(combos, "bottom", denimColors), [combos]);
  const bottom = pick.bottom && bottoms.some(r => r.color.id === pick.bottom) ? pick.bottom : bottoms[0]?.color.id;
  const withBottom = useMemo(() => combos.filter(c => c.bottom === bottom), [combos, bottom]);
  const tops = useMemo(() => share(withBottom, "top", wearColors), [withBottom]);
  const shoes = useMemo(() => share(withBottom, "shoe", wearColors), [withBottom]);
  const top = pick.top && tops.some(r => r.color.id === pick.top) ? pick.top : tops[0]?.color.id;
  const shoe = pick.shoe && shoes.some(r => r.color.id === pick.shoe) ? pick.shoe : shoes[0]?.color.id;
  const bottomColor = colorById(bottom);

  const items = stats?.items ?? [];
  const itemTotal = items.reduce((sum, it) => sum + it.weight, 0);

  return <section className="insight-section">
    <div className="insight-top"><div><span className="eyebrow">02 / STYLE DATA</span><h2>THE STYLE BREAKDOWN<span className="heading-period">.</span></h2><p>{lookTitle}에 사람들이 고른 조합 · {filterLabel}</p></div><span className="data-disclaimer">{status === "ready" ? `BASED ON ${stats?.posts ?? 0} COMBINATIONS` : "COMMUNITY DATA"}</span></div>
    <div className="stat-groups" role="tablist" aria-label="통계 분류">
      {([["COLOR", "COLOR MATCH", "색 조합"], ["ITEM", "TOP ITEMS", "인기 아이템"]] as const).map(([id, en, ko]) => <Button role="tab" aria-selected={view === id} variant="ghost" key={id} className={view === id ? "stat-group active" : "stat-group"} onClick={() => setView(id)}><span>{en}</span><em>{ko}</em></Button>)}
    </div>
    {status === "loading" && <p className="insight-empty">불러오는 중…</p>}
    {status === "error" && <p className="insight-empty">스타일 데이터 서버에 연결할 수 없습니다.</p>}
    {status === "ready" && view === "COLOR" && (bottoms.length === 0
      ? <p className="insight-empty">아직 {filterLabel} 기준으로 올라온 색조합이 없어요. 아래 커뮤니티에 첫 조합을 올려 보세요.</p>
      : <>
        <div className="insight-content">
          <div className="insight-label"><span>01 / DENIM COLOR</span><h3>많이 고른 데님 색</h3><p>색을 누르면 그 데님과 어울리는<br/>상의·신발 색을 볼 수 있어요.</p><div className="style-tags"><span>#글 1개 = 1표</span><span>#추천 1개 = 1표</span></div></div>
          <div className="insight-visual">
            <Bars rows={bottoms} selected={bottom} onSelect={id => setPick({ bottom: id })}/>
            <StatSilhouette top={colorById(top)} bottom={bottomColor} shoes={colorById(shoe)}/>
          </div>
        </div>
        <div className="insight-pairs">
          <div><span className="insight-pair-title">{bottomColor?.ko} 데님과 어울리는 <strong>상의 색</strong></span><Bars small rows={tops} selected={top} onSelect={id => setPick(p => ({ ...p, bottom, top: id }))}/></div>
          <div><span className="insight-pair-title">{bottomColor?.ko} 데님과 어울리는 <strong>신발 색</strong></span><Bars small rows={shoes} selected={shoe} onSelect={id => setPick(p => ({ ...p, bottom, shoe: id }))}/></div>
        </div>
      </>)}
    {status === "ready" && view === "ITEM" && (items.length === 0
      ? <p className="insight-empty">아직 {filterLabel} 기준으로 올라온 아이템이 없어요.</p>
      : <div className="insight-content">
        <div className="insight-label"><span>02 / ITEMS</span><h3>함께 많이 추천한 아이템</h3><p>커뮤니티에 올라온 아이템 중<br/>추천을 많이 받은 순서예요.</p></div>
        <div className="insight-bars">{items.map((it, i) => {
          const value = itemTotal ? Math.round(it.weight / itemTotal * 100) : 0;
          return <div key={`${it.title}-${i}`} className="bar-row bar-row-static">
            <span className="bar-head"><span><small>0{i + 1}</small>{it.colors[0] && <i className="bar-swatch" style={{ background: it.colors[0] }}/>}{it.title}</span><strong>{value}%</strong></span>
            <span className="bar-track"><span style={{ width: `${value}%` }}/></span>
          </div>;
        })}</div>
      </div>)}
  </section>;
}
