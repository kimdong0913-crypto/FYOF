import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { categoryOf, itemById, items, type Item } from "@/lib/catalog";
import type { Outfit, Piece } from "@/lib/outfit";
import { colorById } from "@/lib/palette";

type Weighted = { id: number; title: string; outfit: Outfit | null; weight: number };

const SLOTS = ["outer", "top", "bottom", "shoes", "acc"] as const;

/** 이번 달 계절 (catalog 의 season 문구에 들어가는 글자) */
function seasonNow(month = new Date().getMonth() + 1) {
  const key = month >= 3 && month <= 5 ? "봄" : month >= 6 && month <= 8 ? "여름" : month >= 9 && month <= 11 ? "가을" : "겨울";
  return { key, title: `${key} 옷장 체크리스트` };
}

/** 코디에 들어간 아이템별 점수 (글 1개 = 1, 받은 추천 1개 = 1) */
function itemScores(outfits: Weighted[]) {
  const score = new Map<string, { weight: number; posts: number }>();
  for (const o of outfits) {
    if (!o.outfit) continue;
    const seen = new Set<string>();
    for (const s of SLOTS) {
      const id = o.outfit[s]?.item;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const cur = score.get(id) ?? { weight: 0, posts: 0 };
      score.set(id, { weight: cur.weight + o.weight, posts: cur.posts + 1 });
    }
  }
  return score;
}

/** 위(상의, 없으면 아우터) 색 + 하의 색 조합 */
function colorPairs(outfits: Weighted[]) {
  const pairs = new Map<string, { upper: Piece; lower: Piece; weight: number; items: Map<string, number> }>();
  for (const o of outfits) {
    const upper = o.outfit?.top?.item ? o.outfit.top : o.outfit?.outer;
    const lower = o.outfit?.bottom;
    if (!upper?.item || !lower?.item) continue;
    const key = `${upper.color}+${lower.color}`;
    const cur = pairs.get(key) ?? { upper, lower, weight: 0, items: new Map<string, number>() };
    cur.weight += o.weight;
    const name = `${itemById(upper.item)?.name ?? ""} + ${itemById(lower.item)?.name ?? ""}`;
    cur.items.set(name, (cur.items.get(name) ?? 0) + o.weight);
    pairs.set(key, cur);
  }
  return [...pairs.values()].sort((a, b) => b.weight - a.weight).slice(0, 4)
    .map(p => ({ ...p, example: [...p.items.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "" }));
}

/** 메인 화면: 지금 계절 아이템 + 2×2 리포트(인기 아이템 · 색 조합 · 아래 두 칸은 밖에서 받음) */
export function HomeInsights({ version, bottomLeft, bottomRight }: { version: number; bottomLeft?: ReactNode; bottomRight?: ReactNode }) {
  const [week, setWeek] = useState<Weighted[] | null>(null);
  const [all, setAll] = useState<Weighted[] | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api<Weighted[]>("/api/style-posts/popular?days=7&limit=500"), api<Weighted[]>("/api/style-posts/popular?limit=500")])
      .then(([w, a]) => { if (alive) { setWeek(w); setAll(a); } })
      .catch(() => { if (alive) { setWeek(cur => cur ?? []); setAll(cur => cur ?? []); } });
    return () => { alive = false; };
  }, [version]);

  // 이번 주 글이 너무 적으면 전체 기간으로 보여 준다
  const weekScores = week ? itemScores(week) : new Map();
  const useWeek = weekScores.size >= 3;
  const scores = useWeek ? weekScores : all ? itemScores(all) : new Map<string, { weight: number; posts: number }>();
  const top = [...scores.entries()].sort((a, b) => b[1].weight - a[1].weight || b[1].posts - a[1].posts).slice(0, 5)
    .map(([id, s]) => ({ item: itemById(id), ...s })).filter((r): r is { item: Item; weight: number; posts: number } => Boolean(r.item));
  const pairs = all ? colorPairs(useWeek && week ? week : all) : [];

  const season = seasonNow();
  const allScores = all ? itemScores(all) : new Map<string, { weight: number; posts: number }>();
  const seasonal = items.filter(i => i.season.includes(season.key))
    .sort((a, b) => (allScores.get(b.id)?.weight ?? 0) - (allScores.get(a.id)?.weight ?? 0))
    .slice(0, 6);

  return <>
    <section className="home-season wrap">
      <div className="section-heading"><div><span className="eyebrow">SEASON / {season.key}</span><h2>{season.title}<span className="heading-period">.</span></h2><p className="section-sub">지금 계절에 많이 입는 아이템이에요. 코디가 많이 올라온 순서예요.</p></div>
        <Link to="/results" search={{ q: "전체" }} className="inline-link">전체 아이템 보기 <ArrowUpRight size={14}/></Link></div>
      <div className="guide-grid">{seasonal.map((i, n) => <Link key={i.id} to="/item/$id" params={{ id: i.id }} className="guide-tile season-tile">
        <span className="season-media"><img src={i.image} alt={i.name} width={1024} height={1280} loading="lazy"/><span className="feed-rank">{n + 1}</span></span>
        <span><strong>{i.name}</strong><small>{i.season}</small></span>
      </Link>)}</div>
      {seasonal.some(i => i.aiPhoto) && <p className="ai-note-line season-note">아이템 이미지는 이해를 돕기 위해 AI로 만든 예시 이미지예요. 실제 옷과 색감이나 디테일이 다를 수 있어요.</p>}
    </section>
    <section className="home-insights wrap">
      <div className="section-heading"><div><span className="eyebrow">STYLE DATA / {useWeek ? "THIS WEEK" : "ALL TIME"}</span><h2>{useWeek ? "이번 주 스타일 리포트" : "스타일 리포트"}<span className="heading-period">.</span></h2><p className="section-sub">올라온 코디와 추천 수로 집계했어요. (글 1개 = 1점, 추천 1개 = 1점)</p></div></div>
      <div className="insight-cols">
        <div className="insight-col">
          <span className="fit-control-heading">{useWeek ? "이번 주" : "전체 기간"} 인기 아이템 TOP 5</span>
          {all === null ? <p className="vote-form-note">불러오는 중…</p> : top.length === 0 ? <p className="vote-form-note">아직 집계할 코디가 없어요.</p>
            : <ol className="top-items">{top.map((r, i) => <li key={r.item.id}><Link to="/item/$id" params={{ id: r.item.id }}>
                <span className="top-rank">{i + 1}</span>
                <img src={r.item.image} alt="" loading="lazy"/>
                <span className="top-name"><strong>{r.item.name}</strong><small>{categoryOf(r.item.category).ko} · 코디 {r.posts}개</small></span>
                <span className="top-score">{r.weight}점</span>
              </Link></li>)}</ol>}
        </div>
        <div className="insight-col">
          <span className="fit-control-heading">많이 입는 색 조합 (상의 + 하의)</span>
          {all === null ? <p className="vote-form-note">불러오는 중…</p> : pairs.length === 0 ? <p className="vote-form-note">아직 집계할 코디가 없어요.</p>
            : <ol className="color-pairs">{pairs.map((p, i) => {
                const u = colorById(p.upper.color), l = colorById(p.lower.color);
                return <li key={`${p.upper.color}+${p.lower.color}`}>
                  <span className="top-rank">{i + 1}</span>
                  <span className="pair-swatch"><i style={{ background: u?.hex }}/><i style={{ background: l?.hex }}/></span>
                  <span className="pair-name"><strong>{u?.ko} + {l?.ko}</strong><small>예) {p.example}</small></span>
                  <span className="top-score">{p.weight}점</span>
                </li>;
              })}</ol>}
        </div>
        {bottomLeft && <div className="insight-col">{bottomLeft}</div>}
        {bottomRight && <div className="insight-col">{bottomRight}</div>}
      </div>
    </section>

  </>;
}
