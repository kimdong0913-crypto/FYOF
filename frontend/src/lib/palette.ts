// 코디 글에서 고를 수 있는 색. 자유 색상은 집계가 안 되므로 정해진 목록에서만 고른다.
// 백엔드 StylePalette.java 와 id 를 똑같이 맞춰야 한다.
export type PaletteColor = { id: string; ko: string; hex: string };

export const palette: PaletteColor[] = [
  { id: "white", ko: "화이트", hex: "#F1F0EC" },
  { id: "ivory", ko: "아이보리", hex: "#E9E2D0" },
  { id: "beige", ko: "베이지", hex: "#D8C7A8" },
  { id: "camel", ko: "카멜", hex: "#B98A55" },
  { id: "brown", ko: "브라운", hex: "#8A5A34" },
  { id: "khaki", ko: "카키", hex: "#7A7550" },
  { id: "olive", ko: "올리브", hex: "#556B2F" },
  { id: "black", ko: "블랙", hex: "#2E2E2E" },
  { id: "charcoal", ko: "차콜", hex: "#4A4A4A" },
  { id: "gray", ko: "그레이", hex: "#9A9A9A" },
  { id: "navy", ko: "네이비", hex: "#26304F" },
  { id: "indigo", ko: "인디고", hex: "#2F3B7A" },
  { id: "mid-blue", ko: "미드 블루", hex: "#6E8FC4" },
  { id: "light-blue", ko: "라이트 블루", hex: "#AFC7E3" },
  { id: "burgundy", ko: "버건디", hex: "#6E2233" },
  { id: "pink", ko: "핑크", hex: "#E3B5B8" },
];

const byId = new Map(palette.map(c => [c.id, c]));
export const colorById = (id: string | null | undefined) => (id ? byId.get(id) : undefined);

export const genders = [{ id: "", ko: "선택 안 함" }, { id: "F", ko: "여성" }, { id: "M", ko: "남성" }] as const;
export const ages = [{ id: "", ko: "선택 안 함" }, { id: "10s", ko: "10대" }, { id: "20s", ko: "20대" }, { id: "30s", ko: "30대" }, { id: "40s", ko: "40대 이상" }] as const;
