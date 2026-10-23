import { itemById } from "@/lib/catalog";
import type { Outfit } from "@/lib/outfit";

// 업적 배지: 프로필의 글 목록으로 계산한다 (서버에 따로 저장하지 않는다).
// 배지마다 4단계(동 → 은 → 금 → 백금) 목표가 있어서, 따고 나서도 계속 올릴 수 있다.
type PostLike = { category: "OUTFIT" | "TIP"; outfit: Outfit | null; votes: number; hasPhoto: boolean; createdAt: string; links: unknown[] };

export const LEVELS = [
  { id: "bronze", ko: "동", en: "BRONZE" },
  { id: "silver", ko: "은", en: "SILVER" },
  { id: "gold", ko: "금", en: "GOLD" },
  { id: "platinum", ko: "백금", en: "PLATINUM" },
] as const;

export type Achievement = {
  id: string; name: string; what: string; unit: string;
  value: number; goals: readonly [number, number, number, number];
  level: number;          // 0 = 아직, 1 동, 2 은, 3 금, 4 백금
  next: number | null;    // 다음 등급 목표 (백금이면 null)
};

const SLOTS = ["outer", "top", "bottom", "shoes", "acc"] as const;

export function achievements(posts: PostLike[]): Achievement[] {
  const outfits = posts.map(p => p.outfit).filter((o): o is Outfit => Boolean(o));
  const piecesOf = (o: Outfit) => SLOTS.map(s => o[s]).filter(p => p?.item);
  const pieces = outfits.flatMap(piecesOf);
  const distinct = (category: string) => new Set(pieces.filter(p => itemById(p.item)?.category === category).map(p => p.item)).size;

  const list: Omit<Achievement, "level" | "next">[] = [
    { id: "posts", name: "코디 기록", what: "올린 글", unit: "개", value: posts.length, goals: [1, 10, 30, 100] },
    { id: "photo", name: "사진 장인", what: "사진 있는 글", unit: "개", value: posts.filter(p => p.hasPhoto).length, goals: [3, 10, 30, 80] },
    { id: "color", name: "컬러 마스터", what: "써 본 색", unit: "가지", value: new Set(pieces.map(p => p.color)).size, goals: [4, 8, 12, 16] },
    { id: "colorful", name: "컬러풀", what: "색 4가지 이상 코디", unit: "개", value: outfits.filter(o => new Set(piecesOf(o).map(p => p.color)).size >= 4).length, goals: [1, 3, 10, 25] },
    { id: "allblack", name: "올블랙", what: "3칸 이상 전부 블랙인 코디", unit: "개", value: outfits.filter(o => { const ps = piecesOf(o); return ps.length >= 3 && ps.every(p => p.color === "black"); }).length, goals: [1, 3, 10, 25] },
    { id: "denim", name: "데님 러버", what: "데님이 들어간 코디", unit: "개", value: outfits.filter(o => piecesOf(o).some(p => ["denim", "denim-jacket", "denim-shirt"].includes(p.item))).length, goals: [3, 5, 15, 40] },
    { id: "outer", name: "아우터 수집가", what: "입어 본 아우터", unit: "종", value: distinct("outer"), goals: [3, 6, 12, 18] },
    { id: "shoes", name: "신발 부자", what: "신어 본 신발", unit: "종", value: distinct("shoes"), goals: [3, 6, 9, 11] },
    { id: "hot", name: "인기 폭발", what: "글 하나의 최고 추천", unit: "개", value: Math.max(0, ...posts.map(p => p.votes)), goals: [10, 30, 100, 300] },
    { id: "links", name: "링크 장인", what: "단 구매 링크", unit: "개", value: posts.reduce((n, p) => n + p.links.length, 0), goals: [3, 10, 30, 100] },
    { id: "steady", name: "꾸준러", what: "글 올린 날", unit: "일", value: new Set(posts.map(p => new Date(p.createdAt).toDateString())).size, goals: [3, 7, 30, 100] },
  ];
  return list.map(a => {
    const level = a.goals.filter(g => a.value >= g).length;
    return { ...a, level, next: level < 4 ? a.goals[level]! : null };
  });
}
