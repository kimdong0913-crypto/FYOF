import { itemById, slotOf, type Item, type Slot } from "@/lib/catalog";
import { fitById, type Fit } from "@/lib/fits";
import { colorById, type PaletteColor } from "@/lib/palette";

// 코디 한 벌: 칸마다 아이템 + 색 + 핏. 비어 있는 칸은 item 이 "", 핏이 없는 아이템은 fit 이 "".
export type Piece = { item: string; color: string; fit?: string };
export type Outfit = Record<Slot, Piece>;
export type WeightedOutfit = { id: number; title: string; outfit: Outfit; weight: number };

export const emptyPiece: Piece = { item: "", color: "", fit: "" };
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

/** 이 칸에서 사람들이 고른 핏 비중 (핏을 고르지 않은 코디는 분모에만 들어간다) */
export const fitShare = (outfits: WeightedOutfit[], slot: Slot) => share<Fit>(outfits, o => o[slot].fit ?? "", fitById);

/** 이 칸에 함께 입은 아이템 비중 */
export const itemShare = (outfits: WeightedOutfit[], slot: Slot) => share<Item>(outfits, o => o[slot].item, itemById);

/** 이 칸에 함께 입은 "아이템 + 핏 + 색" 비중 */
export const pieceShare = (outfits: WeightedOutfit[], slot: Slot) =>
  share<{ item: Item; color: PaletteColor; fit: Fit | undefined }>(outfits, o => (o[slot].item ? `${o[slot].item}|${o[slot].color}|${o[slot].fit ?? ""}` : ""), key => {
    const [id, color, fit] = key.split("|");
    const item = itemById(id); const c = colorById(color);
    return item && c ? { item, color: c, fit: fitById(fit) } : undefined;
  });

/** 이 아이템이 코디에서 들어가는 칸 */
export const slotForItem = (item: Item): Slot => slotOf(item);

/** "인디고 와이드 데님 팬츠" */
export function pieceName(p: Piece) {
  const fit = fitById(p.fit);
  return [colorById(p.color)?.ko, fit?.ko, itemById(p.item)?.name].filter(Boolean).join(" ");
}

/** 코디 제목이 비어 있을 때 쓰는 자동 제목 */
export function outfitTitle(o: Outfit) {
  return [o.outer.item ? pieceName(o.outer) : "", pieceName(o.top), pieceName(o.bottom)].filter(Boolean).slice(0, 2).join(" + ").slice(0, 40);
}
