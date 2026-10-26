import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { categoryOf, type Item } from "@/lib/catalog";

/**
 * 내 옷장 카드 패: 손에 쥔 카드처럼 겹쳐 펼친다. 가로로 스크롤(또는 끌기)하면
 * 가운데 카드는 앞으로 크게, 양옆 카드는 기울어지며 뒤로 빠진다.
 */
export function CardHand({ items, onRemove }: { items: Item[]; onRemove: (id: string) => void }) {
  const track = useRef<HTMLDivElement>(null);

  // 스크롤할 때마다 카드마다 가운데에서 얼마나 떨어졌는지로 기울기·높이·크기를 정한다
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const layout = () => {
      frame = 0;
      if (el.scrollTop !== 0) el.scrollTop = 0; // 세로로 밀렸으면 제자리로
      const box = el.getBoundingClientRect();
      const mid = box.left + box.width / 2;
      const cards = el.querySelectorAll<HTMLElement>(".hand-card");
      cards.forEach(card => {
        const r = card.getBoundingClientRect();
        const d = (r.left + r.width / 2 - mid) / (r.width * 1.6);          // 가운데 0, 옆으로 갈수록 ±1, ±2…
        const a = Math.max(-3, Math.min(3, d));
        card.style.setProperty("--rot", `${a * 9}deg`);
        card.style.setProperty("--lift", `${Math.min(70, a * a * 16)}px`);
        card.style.setProperty("--scale", `${Math.max(0.78, 1.08 - Math.abs(a) * 0.12)}`);
        card.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
        card.classList.toggle("is-center", Math.abs(d) < 0.35);
      });
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(layout); };
    // 처음엔 가운데 카드를 정중앙에 둬서 부채꼴이 양쪽으로 고르게 펼쳐지게
    const cards = el.querySelectorAll<HTMLElement>(".hand-card");
    const middle = cards[Math.floor((cards.length - 1) / 2)];
    if (middle) el.scrollLeft = middle.offsetLeft + middle.offsetWidth / 2 - el.clientWidth / 2;
    layout();
    el.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => { el.removeEventListener("scroll", request); window.removeEventListener("resize", request); cancelAnimationFrame(frame); };
  }, [items]);

  // Shift + 휠이면 카드를 옆으로 넘긴다. 그냥 휠은 페이지 스크롤 그대로 (위아래로 내리다 카드가 움직이지 않게)
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault(); el.scrollBy({ left: e.deltaY * 0.3, behavior: "smooth" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // 마우스로 끌어서 넘기기 (조금이라도 끌었으면 카드 클릭은 무시)
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !track.current) return;
    drag.current = { down: true, x: e.clientX, left: track.current.scrollLeft, moved: false };
    track.current.classList.add("is-dragging");
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.down || !track.current) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 5) d.moved = true;
    track.current.scrollLeft = d.left - dx;
  };
  const endDrag = () => { drag.current.down = false; track.current?.classList.remove("is-dragging"); };

  return <div className="card-hand">
    <div ref={track} className="hand-track" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}
      onClickCapture={e => { if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; } }}>
      {items.map((item, i) => <div key={item.id} className="hand-card" style={{ "--i": i } as React.CSSProperties}>
        <div className="hand-card-inner">
          <Link to="/item/$id" params={{ id: item.id }} className="hand-card-face" draggable={false}>
            <img src={item.image} alt={item.name} draggable={false}/>
            <span className="hand-card-label"><small>{categoryOf(item.category).en}</small><strong>{item.name}</strong></span>
          </Link>
          <button type="button" className="hand-card-remove" aria-label={`${item.name} 옷장에서 빼기`} onClick={() => onRemove(item.id)}><X size={13}/> 빼기</button>
        </div>
      </div>)}
    </div>
    {items.length > 2 && <p className="hand-hint">← 끌거나 Shift + 휠로 넘겨 보세요 →</p>}
  </div>;
}
