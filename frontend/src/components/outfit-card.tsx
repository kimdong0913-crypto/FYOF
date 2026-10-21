import { Link } from "@tanstack/react-router";
import { itemById, slots } from "@/lib/catalog";
import type { Outfit } from "@/lib/outfit";
import { colorById } from "@/lib/palette";

// 코디 한 벌을 칸별로 보여준다. 아이템을 누르면 그 아이템 가이드로 이동.
export function OutfitPieces({ outfit, highlight, compact = false }: { outfit: Outfit; highlight?: string | undefined; compact?: boolean }) {
  return <ul className={compact ? "outfit-pieces outfit-pieces-compact" : "outfit-pieces"}>
    {slots.map(s => {
      const piece = outfit[s.id];
      const item = itemById(piece.item);
      if (!item) return null;
      const color = colorById(piece.color);
      return <li key={s.id} className={item.id === highlight ? "is-highlight" : ""}>
        <span className="outfit-slot">{s.ko}</span>
        <i style={{ background: color?.hex ?? "transparent" }} title={color?.ko}/>
        <Link to="/item/$id" params={{ id: item.id }}>{color?.ko} {item.name}</Link>
      </li>;
    })}
  </ul>;
}
