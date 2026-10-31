import { itemById, type Item } from "@/lib/catalog";
import { fitById, type Fit } from "@/lib/fits";

// 내 체형(키·몸무게·체형 타입)으로 어울리는 핏과 아이템을 고른다.
// 서버(/api/body)는 값만 저장하고, 추천은 여기서 규칙으로 계산한다.
export type BodyShape = "" | "balanced" | "upper" | "lower" | "belly";
export type Body = { heightCm: number; weightKg: number; shape: BodyShape };

export const shapes: { id: BodyShape; ko: string; desc: string }[] = [
  { id: "", ko: "잘 모르겠어요", desc: "키와 몸무게로만 추천해요" },
  { id: "balanced", ko: "균형형", desc: "상체와 하체가 비슷해요" },
  { id: "upper", ko: "상체형", desc: "어깨·가슴이 넓은 편이에요" },
  { id: "lower", ko: "하체형", desc: "골반·허벅지가 있는 편이에요" },
  { id: "belly", ko: "복부형", desc: "배가 신경 쓰여요" },
];

type Part = "top" | "bottom" | "outer";
export const parts: { id: Part; ko: string }[] = [{ id: "top", ko: "상의" }, { id: "bottom", ko: "하의" }, { id: "outer", ko: "아우터" }];

// 규칙 하나 = 해당하는 사람에게 권하는 핏(앞일수록 강하게), 피하면 좋은 핏, 추천 아이템, 이유
type Rule = { label: string; why: string; like: Partial<Record<Part, string[]>>; avoid?: Partial<Record<Part, string[]>>; items: string[] };

const HEIGHT_SHORT = 165;
const HEIGHT_TALL = 180;

function heightRule(h: number): Rule | null {
  if (h <= HEIGHT_SHORT) return {
    label: `키 ${HEIGHT_SHORT}cm 이하`, why: "상의는 짧게, 하의는 길게 떨어지면 다리가 길어 보여요. 무릎까지 오는 긴 아우터는 키를 눌러 보이게 해요.",
    like: { top: ["crop", "regular"], bottom: ["straight", "wide"], outer: ["crop", "regular"] },
    avoid: { top: ["over"], outer: ["long"] },
    items: ["short-padding", "ma1", "denim-jacket", "denim"],
  };
  if (h >= HEIGHT_TALL) return {
    label: `키 ${HEIGHT_TALL}cm 이상`, why: "긴 기장의 코트와 통이 넓은 바지를 잘 소화해요. 오버핏도 부담 없이 입을 수 있어요.",
    like: { top: ["over", "semi-over"], bottom: ["wide", "relaxed"], outer: ["long", "over"] },
    items: ["trench-coat", "wool-coat", "long-padding", "cargo"],
  };
  return null;
}

/** 체질량지수(BMI) = 몸무게(kg) ÷ 키(m)² */
export const bmiOf = (b: Body) => b.weightKg / (b.heightCm / 100) ** 2;

function buildRule(bmi: number): Rule {
  if (bmi < 18.5) return {
    label: "마른 편", why: "몸에 붙는 핏보다 한 치수 여유 있는 핏과 레이어드로 볼륨을 더하면 좋아요.",
    like: { top: ["semi-over", "boxy"], bottom: ["straight", "wide"], outer: ["over", "regular"] },
    avoid: { top: ["slim"], bottom: ["skinny"] },
    items: ["crew-knit", "knit-vest", "cardigan", "hoodie", "corduroy", "fleece"],
  };
  if (bmi < 23) return {
    label: "보통 체격", why: "기본 핏이 가장 잘 맞아요. 레귤러·스트레이트를 기준으로 원하는 무드에 따라 넓히거나 좁혀 보세요.",
    like: { top: ["regular", "semi-over"], bottom: ["straight", "tapered"], outer: ["regular"] },
    items: ["oxford-shirt", "slacks", "blazer", "low-sneakers"],
  };
  if (bmi < 25) return {
    label: "탄탄한 편", why: "딱 붙지도 너무 크지도 않은 핏이 단정해 보여요. 하의는 일자나 밑으로 좁아지는 핏이 좋아요.",
    like: { top: ["regular", "semi-over"], bottom: ["straight", "tapered"], outer: ["regular"] },
    avoid: { bottom: ["skinny"] },
    items: ["blazer", "slacks", "oxford-shirt", "cotton-pants"],
  };
  return {
    label: "체격이 있는 편", why: "여유 있게 떨어지는 핏과 일자 바지가 깔끔해요. 열어서 입는 아우터는 세로선을 만들어 주고, 어두운 색은 정돈돼 보여요.",
    like: { top: ["semi-over", "regular"], bottom: ["straight", "wide"], outer: ["regular", "long"] },
    avoid: { top: ["slim", "crop", "boxy"], bottom: ["skinny", "slim"] },
    items: ["blazer", "cardigan", "slacks", "trench-coat"],
  };
}

const shapeRules: Record<Exclude<BodyShape, "" | "balanced">, Rule> = {
  upper: {
    label: "상체형", why: "하의에 통을 주면 넓은 어깨와 균형이 맞아요. 상의는 군더더기 없는 레귤러가 좋아요.",
    like: { top: ["regular"], bottom: ["wide", "straight"] },
    avoid: { top: ["boxy"], bottom: ["skinny"] },
    items: ["cargo", "denim", "oxford-shirt"],
  },
  lower: {
    label: "하체형", why: "상의에 볼륨을 주고 하의는 일자로 떨어지게 입으면 시선이 위로 가요.",
    like: { top: ["semi-over", "boxy"], bottom: ["straight", "bootcut"] },
    avoid: { bottom: ["skinny", "slim"] },
    items: ["sweatshirt", "denim", "blazer"],
  },
  belly: {
    label: "복부형", why: "짧은 상의보다 엉덩이를 살짝 덮는 기장이 편해요. 단추를 열어 입는 아우터가 세로선을 만들어 줘요.",
    like: { top: ["regular", "semi-over"], bottom: ["tapered", "straight"], outer: ["regular", "long"] },
    avoid: { top: ["crop", "slim"] },
    items: ["cardigan", "blazer", "oxford-shirt", "slacks"],
  },
};

/** 규칙 아이템이 6개가 안 될 때 채우는 기본 아이템 */
const STAPLES = ["oxford-shirt", "slacks", "denim", "low-sneakers"];

export type Advice = {
  bmi: number;
  reasons: { label: string; why: string }[];
  fits: Record<Part, Fit[]>;   // 권하는 핏 (최대 2개)
  avoid: Record<Part, Fit[]>;  // 피하면 좋은 핏
  items: { item: Item; fit: string | undefined }[];
};

/** 체형으로 어울리는 핏·아이템을 고른다. 규칙마다 앞쪽 핏에 2점, 다음 핏에 1점, 피할 핏에 -3점을 준다. */
export function adviceFor(body: Body): Advice {
  const bmi = bmiOf(body);
  const rules = [heightRule(body.heightCm), buildRule(bmi), body.shape && body.shape !== "balanced" ? shapeRules[body.shape] : null]
    .filter((r): r is Rule => r !== null);

  const fits = {} as Record<Part, Fit[]>, avoid = {} as Record<Part, Fit[]>;
  for (const { id: part } of parts) {
    const score = new Map<string, number>();
    const add = (f: string, n: number) => score.set(f, (score.get(f) ?? 0) + n);
    for (const r of rules) {
      r.like[part]?.forEach((f, i) => add(f, i === 0 ? 2 : 1));
      r.avoid?.[part]?.forEach(f => add(f, -3));
    }
    const ranked = [...score].sort((a, b) => b[1] - a[1]);
    fits[part] = ranked.filter(([, n]) => n > 0).slice(0, 2).map(([f]) => fitById(f)!).filter(Boolean);
    avoid[part] = ranked.filter(([, n]) => n < 0).map(([f]) => fitById(f)!).filter(Boolean);
  }

  // 아이템은 규칙 순서대로 모으고, 그 아이템이 고를 수 있는 핏 중 권하는 핏을 붙인다
  const partOf = (item: Item): Part => item.category === "outer" ? "outer" : item.category === "bottom" ? "bottom" : "top";
  const seen = new Set<string>();
  const items = [...rules.flatMap(r => r.items), ...STAPLES].filter(id => !seen.has(id) && seen.add(id))
    .map(id => itemById(id)).filter((i): i is Item => i !== undefined).slice(0, 6)
    .map(item => ({ item, fit: fits[partOf(item)].find(f => item.fits.includes(f.id))?.id }));

  return { bmi, reasons: rules.map(r => ({ label: r.label, why: r.why })), fits, avoid, items };
}
