import { itemById, slotOf, type Item, type Slot } from "@/lib/catalog";
import { colorById, type PaletteColor } from "@/lib/palette";

// 코디 한 벌: 칸마다 아이템 + 색. 비어 있는 칸은 item 이 "".
export type Piece = { item: string; color: string };
export type Outfit = Record<Slot, Piece>;
export type WeightedOutfit = { id: number; title: string; outfit: Outfit; weight: number };

export const emptyPiece: Piece = { item: "", color: "" };
export const emptyOutfit = (): Outfit => ({ outer: { ...emptyPiece }, top: { ...emptyPiece }, bottom: { ...emptyPiece }, shoes: { ...emptyPiece }, acc: { ...emptyPiece } });

export type Share<T> = { key: string; value: T; percent: number; weight: number };

function share<T>(outfits: WeightedOutfit[], pick: (o: Outfit) => string, resolve: (key: string) => T | undefined): Share<T>[] {
  const sums = new Map<string, number>();
  let total = 0;
  for (const o of outfits) {
    const key = pick(o.outfit);
    total += o.weight;
    if (key) sums.set(key, (sums.get(key) ?? 0) + o.weight);
  }
  if (!total) return [];
  return [...sums.entries()]
    .map(([key, weight]) => ({ key, weight, value: resolve(key), percent: Math.round(weight / total * 100) }))
    .filter((s): s is Share<T> => s.value !== undefined)
    .sort((a, b) => b.weight - a.weight);
}

/** 이 칸에서 사람들이 고른 색 비중 */
export const colorShare = (outfits: WeightedOutfit[], slot: Slot) => share<PaletteColor>(outfits, o => o[slot].color, colorById);

/** 이 칸에 함께 입은 아이템 비중 (칸이 빈 코디도 분모에 들어가서 "아우터 없이"가 자연히 반영된다) */
export const itemShare = (outfits: WeightedOutfit[], slot: Slot) => share<Item>(outfits, o => o[slot].item, itemById);

/** 이 칸에 함께 입은 "아이템 + 색" 비중 */
export const pieceShare = (outfits: WeightedOutfit[], slot: Slot) =>
  share<{ item: Item; color: PaletteColor }>(outfits, o => (o[slot].item ? `${o[slot].item}|${o[slot].color}` : ""), key => {
    const [id, color] = key.split("|");
    const item = itemById(id); const c = colorById(color);
    return item && c ? { item, color: c } : undefined;
  });

/** 이 아이템이 코디에서 들어가는 칸 */
export const slotForItem = (item: Item): Slot => slotOf(item);

/** 코디 제목이 비어 있을 때 쓰는 자동 제목: "화이트 옥스포드 셔츠 + 인디고 와이드 데님" */
export function outfitTitle(o: Outfit) {
  const name = (p: Piece) => `${colorById(p.color)?.ko ?? ""} ${itemById(p.item)?.name ?? ""}`.trim();
  return [o.outer.item ? name(o.outer) : "", name(o.top), name(o.bottom)].filter(Boolean).slice(0, 2).join(" + ").slice(0, 40);
}
