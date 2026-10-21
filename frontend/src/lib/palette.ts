// 색조합 글에서 고를 수 있는 색. 자유 색상은 집계가 안 되므로 정해진 목록에서만 고른다.
// 백엔드 StylePalette.java 와 id·hex 를 똑같이 맞춰야 한다.
export type PaletteColor = { id: string; ko: string; hex: string };

export const denimColors: PaletteColor[] = [
  { id: "indigo", ko: "인디고", hex: "#2F3B7A" },
  { id: "mid-blue", ko: "미드 블루", hex: "#6E8FC4" },
  { id: "light-blue", ko: "라이트 블루", hex: "#AFC7E3" },
  { id: "black-denim", ko: "블랙", hex: "#2B2B2B" },
  { id: "gray-denim", ko: "그레이", hex: "#8C9097" },
  { id: "ecru", ko: "에크루", hex: "#E6DFCC" },
];

export const wearColors: PaletteColor[] = [
  { id: "white", ko: "화이트", hex: "#F1F0EC" },
  { id: "black", ko: "블랙", hex: "#2E2E2E" },
  { id: "charcoal", ko: "차콜", hex: "#4A4A4A" },
  { id: "gray", ko: "그레이", hex: "#9A9A9A" },
  { id: "beige", ko: "베이지", hex: "#D8C7A8" },
  { id: "brown", ko: "브라운", hex: "#8A5A34" },
  { id: "navy", ko: "네이비", hex: "#26304F" },
  { id: "khaki", ko: "카키", hex: "#7A7550" },
  { id: "sky", ko: "스카이", hex: "#B9D3EA" },
  { id: "burgundy", ko: "버건디", hex: "#6E2233" },
];

const all = new Map([...denimColors, ...wearColors].map(c => [c.id, c]));
export const colorById = (id: string | null | undefined) => (id ? all.get(id) : undefined);

export const genders = [{ id: "", ko: "선택 안 함" }, { id: "F", ko: "여성" }, { id: "M", ko: "남성" }] as const;
export const ages = [{ id: "", ko: "선택 안 함" }, { id: "10s", ko: "10대" }, { id: "20s", ko: "20대" }, { id: "30s", ko: "30대" }, { id: "40s", ko: "40대 이상" }] as const;
