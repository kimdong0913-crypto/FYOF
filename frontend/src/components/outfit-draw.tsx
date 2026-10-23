import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryOf, type Item } from "@/lib/catalog";

// 칸별로 뽑을 아이템 종류 (상의 칸은 상의가 없으면 이너에서)
const SLOTS = [
  { id: "outer", ko: "아우터", from: ["outer"] },
  { id: "top", ko: "상의", from: ["top", "inner"] },
  { id: "bottom", ko: "하의", from: ["bottom"] },
  { id: "shoes", ko: "신발", from: ["shoes"] },
  { id: "acc", ko: "액세서리", from: ["acc"] },
] as const;

const pick = <T,>(list: T[], avoid?: T) => {
  const pool = list.length > 1 && avoid !== undefined ? list.filter(x => x !== avoid) : list;
  return pool[Math.floor(Math.random() * pool.length)];
};

/** 내 옷장 랜덤 코디 뽑기: 칸마다 카드 한 장씩 섞었다가 차례로 뒤집는다. */
export function OutfitDraw({ mine }: { mine: Item[] }) {
  const slots = SLOTS.map(s => ({ ...s, pool: mine.filter(i => (s.from as readonly string[]).includes(i.category)) })).filter(s => s.pool.length > 0);
  const [hand, setHand] = useState<Record<string, Item | undefined>>({});
  const [phase, setPhase] = useState<"idle" | "shuffling" | "revealing" | "done">("idle");
  const [shown, setShown] = useState(0);
  const timers = useRef<number[]>([]);

  const canDraw = slots.some(s => s.id === "top") && slots.some(s => s.id === "bottom");
  const draw = () => {
    timers.current.forEach(clearTimeout);
    const next: Record<string, Item | undefined> = {};
    for (const s of slots) next[s.id] = pick(s.pool, hand[s.id]);
    setPhase("shuffling"); setShown(0);
    // 0.7초 섞고, 카드를 0.32초 간격으로 한 장씩 뒤집는다
    timers.current = [window.setTimeout(() => { setHand(next); setPhase("revealing"); }, 700)];
    slots.forEach((_, i) => timers.current.push(window.setTimeout(() => setShown(i + 1), 700 + 120 + i * 320)));
    timers.current.push(window.setTimeout(() => setPhase("done"), 700 + 120 + slots.length * 320));
  };

  return <div className="outfit-draw">
    <div className="draw-head">
      <p>{canDraw ? "내 옷장에서 칸마다 한 장씩 뽑아 오늘의 코디를 만들어 드려요." : "상의와 하의를 하나 이상 담으면 뽑을 수 있어요."}</p>
      <Button onClick={draw} disabled={!canDraw || phase === "shuffling" || phase === "revealing"}><Shuffle size={15}/> {phase === "idle" ? "코디 뽑기" : "다시 뽑기"}</Button>
    </div>
    {canDraw && <div className={`draw-table ${phase}`}>{slots.map((s, i) => {
      const item = hand[s.id];
      const flipped = phase !== "shuffling" && i < shown && item;
      return <div key={s.id} className={flipped ? "draw-card flipped" : "draw-card"} style={{ "--i": i } as React.CSSProperties}>
        <div className="draw-card-inner">
          <div className="draw-back"><span>FYOF.</span><small>{s.ko}</small></div>
          {/* 앞면은 옷장 카드와 같은 모양 */}
          <div className="draw-front">{item && <Link to="/item/$id" params={{ id: item.id }} className="hand-card-face">
            <img src={item.image} alt={item.name}/>
            <span className="hand-card-label"><small>{categoryOf(item.category).en}</small><strong>{item.name}</strong></span>
          </Link>}</div>
        </div>
      </div>;
    })}</div>}
    {phase === "done" && <p className="draw-result">오늘의 코디: {slots.map(s => hand[s.id]?.name).filter(Boolean).join(" + ")}</p>}
  </div>;
}
