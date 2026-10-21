import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { productsFor } from "@/lib/catalog";
import type { PaletteColor } from "@/lib/palette";

type Slot = "top" | "bottom" | "shoes";
const slotLabel: Record<Slot, string> = { top: "상의", bottom: "데님", shoes: "신발" };

// STYLE DATA 에서 고른 색조합을 실제 상품으로 이어 준다.
export function ComboRecommend({ top, bottom, shoes, hide, title = "이 조합을 완성하는 상품" }: { top?: PaletteColor | undefined; bottom?: PaletteColor | undefined; shoes?: PaletteColor | undefined; hide?: Slot; title?: string }) {
  const slots = ([["top", top], ["bottom", bottom], ["shoes", shoes]] as [Slot, PaletteColor | undefined][]).filter(([slot]) => slot !== hide);
  return <div className="combo-recommend">
    <div className="combo-recommend-head"><span className="eyebrow">SHOP THIS COMBINATION</span><h3>{title}</h3></div>
    <div className={`combo-recommend-grid combo-cols-${slots.length}`}>{slots.map(([slot, color]) => {
      const list = productsFor(slot, color);
      return <div key={slot} className="combo-slot">
        <span className="combo-slot-title"><i style={{ background: color?.hex ?? "transparent" }}/>{slotLabel[slot]} · {color?.ko ?? "—"}</span>
        {list.length === 0
          ? <p className="combo-empty">아직 {color?.ko ?? ""} {slotLabel[slot]} 상품이 없어요.</p>
          : list.map(p => <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="combo-product"><img src={p.image} alt={p.name} width={64} height={80} loading="lazy"/><span><small>{p.brand}</small><strong>{p.name}</strong><em>₩{p.price}</em></span><ArrowUpRight size={15}/></Link>)}
      </div>;
    })}</div>
  </div>;
}
