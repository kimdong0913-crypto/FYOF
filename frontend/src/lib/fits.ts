// 핏(실루엣) 옵션. 아이템을 핏마다 따로 만들지 않고, 아이템 안에서 고른다.
// id 는 DB(outer_fit / top_fit / bottom_fit)에 그대로 저장되므로 바꾸지 않는다.
export type Fit = { id: string; ko: string; en: string; desc: string };

export const pantsFits: Fit[] = [
  { id: "skinny", ko: "스키니", en: "SKINNY", desc: "다리에 딱 붙는 핏" },
  { id: "slim", ko: "슬림", en: "SLIM", desc: "몸에 맞게 떨어지는 날씬한 핏" },
  { id: "straight", ko: "스트레이트", en: "STRAIGHT", desc: "허벅지부터 밑단까지 일자로 떨어지는 핏" },
  { id: "tapered", ko: "테이퍼드", en: "TAPERED", desc: "위는 여유 있고 밑단으로 갈수록 좁아지는 핏" },
  { id: "wide", ko: "와이드", en: "WIDE", desc: "통이 넓게 떨어지는 핏" },
  { id: "relaxed", ko: "릴랙스", en: "RELAXED", desc: "전체적으로 여유 있는 루즈한 핏" },
  { id: "bootcut", ko: "부츠컷", en: "BOOTCUT", desc: "무릎 아래부터 살짝 퍼지는 핏" },
  { id: "flare", ko: "플레어", en: "FLARE", desc: "무릎 아래부터 크게 퍼지는 핏" },
  { id: "curved", ko: "커브드", en: "CURVED", desc: "다리 라인을 따라 둥글게 휘는 배럴 핏" },
];

export const topFits: Fit[] = [
  { id: "crop", ko: "크롭", en: "CROPPED", desc: "허리 위로 짧게 끝나는 기장" },
  { id: "slim", ko: "슬림", en: "SLIM", desc: "몸에 붙는 날씬한 핏" },
  { id: "regular", ko: "레귤러", en: "REGULAR", desc: "어깨에 맞는 기본 핏" },
  { id: "semi-over", ko: "세미오버", en: "SEMI-OVER", desc: "한 치수 정도 여유 있는 핏" },
  { id: "over", ko: "오버핏", en: "OVERSIZED", desc: "어깨선이 내려오는 넉넉한 핏" },
  { id: "boxy", ko: "박시", en: "BOXY", desc: "어깨가 넓고 기장이 짧은 네모난 핏" },
];

export const outerFits: Fit[] = [
  { id: "crop", ko: "크롭", en: "CROPPED", desc: "허리 위로 짧게 끝나는 기장" },
  { id: "regular", ko: "레귤러", en: "REGULAR", desc: "엉덩이를 살짝 덮는 기본 기장" },
  { id: "over", ko: "오버핏", en: "OVERSIZED", desc: "어깨선이 내려오는 넉넉한 핏" },
  { id: "long", ko: "롱", en: "LONG", desc: "무릎 근처까지 내려오는 기장" },
];

const all = new Map<string, Fit>([...pantsFits, ...topFits, ...outerFits].map(f => [f.id, f]));
export const fitById = (id: string | null | undefined) => (id ? all.get(id) : undefined);
