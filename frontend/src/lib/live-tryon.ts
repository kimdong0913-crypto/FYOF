import { itemById, type Item } from "@/lib/catalog";
import { fitById } from "@/lib/fits";
import type { Outfit, Piece } from "@/lib/outfit";
import { palette } from "@/lib/palette";

// 카메라 실시간 AI 피팅(Decart Lucy VTON)에 보낼 옷 설명. 모델은 상의만 바꾸므로 아우터 → 상의 순으로 하나를 고른다.

const colorEn = (id: string) => (palette.some(c => c.id === id) ? id.replace(/-/g, " ") : "");
const nameEn = (item: Item) => item.english.toLowerCase();
const fitEn = (fit?: string) => { const f = fit ? fitById(fit) : undefined; return f ? f.en.toLowerCase() : ""; };

function describe(piece: Piece) {
  const item = itemById(piece.item);
  if (!item) return "";
  return [colorEn(piece.color), nameEn(item)].filter(Boolean).join(" ");
}

/** 실시간 피팅이 입힐 수 있는 코디인지 (아우터나 상의가 있어야 한다) */
export const canLiveTry = (o: Outfit | null | undefined) => !!o && (!!itemById(o.outer.item) || !!itemById(o.top.item));

/** 이 코디에서 입힐 옷 (아우터가 있으면 아우터, 없으면 상의) */
export const livePiece = (o: Outfit): Piece => (itemById(o.outer.item) ? o.outer : o.top);

/**
 * Decart 권장 형식("Substitute the current top with ...", 20~30 단어)으로 설명을 만든다.
 * 아우터 안에 상의가 있으면 "~ worn open over a white t-shirt" 처럼 같이 적는다.
 */
export function livePrompt(o: Outfit) {
  const main = livePiece(o);
  const fit = fitEn(main.fit);
  const inner = main === o.outer && itemById(o.top.item) ? describe(o.top) : "";
  return `Substitute the current top with a ${describe(main)}${fit ? ` with a ${fit} fit` : ""}`
    + (inner ? `, worn open over a ${inner}` : "")
    + ", keeping the exact color, texture and details of the reference garment, natural lighting";
}
