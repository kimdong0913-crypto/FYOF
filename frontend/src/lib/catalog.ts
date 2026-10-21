import wide from "@/assets/look-wide.jpg";
import straight from "@/assets/look-straight.jpg";
import relaxed from "@/assets/look-relaxed.jpg";
import denim from "@/assets/product-denim.jpg";

// 사진 대신 쓰는 SVG 일러스트 (AI 피팅에는 쓸 수 없어 hasPhoto는 false)
const illust = import.meta.glob<string>("@/assets/illust/*.svg", { eager: true, import: "default", query: "?url" });
const illustFor = (id: string) => Object.entries(illust).find(([path]) => path.endsWith(`/${id}.svg`))?.[1];

export const looks = [
  { id: "wide", rank: "01", title: "와이드 데님", english: "WIDE LEG", style: "미니멀", image: wide, description: "화이트 셔츠 + 다크 인디고 데님", match: 94, color: "화이트", type: "와이드", shoe: "블랙 로퍼", outer: "테일러드 재킷", price: "89,000" },
  { id: "straight", rank: "02", title: "스트레이트 데님", english: "STRAIGHT", style: "클래식", image: straight, description: "차콜 블레이저 + 미드 블루 데님", match: 89, color: "차콜", type: "스트레이트", shoe: "블랙 로퍼", outer: "오버핏 블레이저", price: "79,000" },
  { id: "relaxed", rank: "03", title: "릴랙스 데님", english: "RELAXED", style: "스트릿", image: relaxed, description: "크롭 재킷 + 워시드 블루 데님", match: 86, color: "블랙", type: "릴랙스", shoe: "화이트 스니커즈", outer: "크롭 재킷", price: "72,000" },
] as const;

// tryOn: AI 피팅(fashn-vton)에 보낼 category. 신발·액세서리는 모델이 지원하지 않아 null.
export const categories = [
  { id: "outer", ko: "아우터", en: "OUTER", tryOn: "tops", keywords: ["아우터", "자켓", "재킷", "코트", "점퍼", "블레이저", "가디건"] },
  { id: "top", ko: "상의", en: "TOP", tryOn: "tops", keywords: ["상의", "티셔츠", "셔츠", "니트", "맨투맨", "후드"] },
  { id: "inner", ko: "이너", en: "INNER", tryOn: "tops", keywords: ["이너", "나시", "슬리브리스", "탱크탑", "터틀넥"] },
  { id: "bottom", ko: "하의", en: "BOTTOM", tryOn: "bottoms", keywords: ["하의", "바지", "팬츠", "슬랙스", "데님", "청바지", "진", "denim", "jeans"] },
  { id: "shoes", ko: "신발", en: "SHOES", tryOn: null, keywords: ["신발", "스니커즈", "로퍼", "부츠", "운동화"] },
  { id: "acc", ko: "액세서리", en: "ACCESSORY", tryOn: null, keywords: ["액세서리", "악세사리", "가방", "모자", "벨트", "목걸이", "캡"] },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

// 실제 상품 사진이 들어오기 전까지 쓰는 회색 자리표시 이미지
function placeholder(category: CategoryId, label: string) {
  const c = categories.find(x => x.id === category)!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1280" viewBox="0 0 1024 1280"><rect width="1024" height="1280" fill="#e4e4e2"/><text x="512" y="600" text-anchor="middle" font-family="Manrope,Noto Sans KR,sans-serif" font-size="44" font-weight="800" letter-spacing="6" fill="#8a8a88">${c.en}</text><text x="512" y="680" text-anchor="middle" font-family="Noto Sans KR,sans-serif" font-size="36" font-weight="600" fill="#a3a3a1">${label}</text><text x="512" y="1200" text-anchor="middle" font-family="Manrope,sans-serif" font-size="22" letter-spacing="4" fill="#b5b5b3">IMAGE COMING SOON</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type Product = {
  id: string; category: CategoryId; brand: string; name: string; english: string; price: string;
  image: string; hasPhoto: boolean; photoType?: "flat-lay" | "model";
  tag: string; fit: string; color: string; description: string;
};

const draft = (p: Omit<Product, "image" | "hasPhoto">): Product => ({ ...p, image: illustFor(p.id) ?? placeholder(p.category, p.name), hasPhoto: false });

export const products: Product[] = [
  // OUTER
  draft({ id: "tailored-jacket", category: "outer", brand: "FORME", name: "테일러드 울 재킷", english: "TAILORED WOOL JACKET", price: "159,000", tag: "BEST", fit: "레귤러", color: "차콜", description: "어깨선을 살린 클래식한 테일러드 재킷. 데님부터 슬랙스까지 폭넓게 어울립니다." }),
  draft({ id: "crop-jacket", category: "outer", brand: "OFFSET", name: "크롭 워크 재킷", english: "CROPPED WORK JACKET", price: "129,000", tag: "NEW", fit: "크롭", color: "블랙", description: "짧은 기장으로 하의 비율을 길어 보이게 하는 워크 재킷." }),
  draft({ id: "mac-coat", category: "outer", brand: "ARCHIVE 09", name: "싱글 맥 코트", english: "SINGLE MAC COAT", price: "219,000", tag: "SEASON", fit: "오버핏", color: "베이지", description: "가볍게 걸치기 좋은 간절기 맥 코트." }),
  // TOP
  draft({ id: "oxford-shirt", category: "top", brand: "FORME", name: "옥스포드 버튼다운 셔츠", english: "OXFORD BUTTON-DOWN", price: "59,000", tag: "BEST", fit: "레귤러", color: "화이트", description: "데일리로 입기 좋은 탄탄한 옥스포드 원단 셔츠." }),
  draft({ id: "crew-knit", category: "top", brand: "ARCHIVE 09", name: "크루넥 램스울 니트", english: "CREW NECK LAMBSWOOL", price: "79,000", tag: "NEW", fit: "세미 오버핏", color: "그레이", description: "부드러운 램스울로 짠 기본 크루넥 니트." }),
  draft({ id: "heavy-tee", category: "top", brand: "OFFSET", name: "헤비웨이트 반팔 티셔츠", english: "HEAVYWEIGHT TEE", price: "35,000", tag: "TRENDING", fit: "오버핏", color: "블랙", description: "도톰한 원단으로 형태가 잘 잡히는 반팔 티셔츠." }),
  // INNER
  draft({ id: "ribbed-tank", category: "inner", brand: "FORME", name: "립 슬리브리스 탑", english: "RIBBED TANK TOP", price: "19,000", tag: "BASIC", fit: "슬림", color: "화이트", description: "셔츠나 재킷 안에 받쳐 입기 좋은 골지 슬리브리스." }),
  draft({ id: "turtleneck", category: "inner", brand: "ARCHIVE 09", name: "슬림 터틀넥", english: "SLIM TURTLENECK", price: "29,000", tag: "NEW", fit: "슬림", color: "블랙", description: "얇은 두께로 레이어드하기 좋은 터틀넥." }),
  // BOTTOM (1차 데님)
  { id: "wide", category: "bottom", brand: "FORME", name: "에센셜 와이드 데님 팬츠", english: "WIDE LEG DENIM PANTS", price: "89,000", image: denim, hasPhoto: true, photoType: "flat-lay", tag: "BEST", fit: "와이드", color: "딥 인디고", description: "일상의 모든 순간에 자연스럽게 스며드는 데님. 편안한 실루엣과 균형 잡힌 비율로 다양한 스타일에 어울립니다." },
  { id: "straight", category: "bottom", brand: "ARCHIVE 09", name: "데일리 스트레이트 데님", english: "STRAIGHT DENIM PANTS", price: "79,000", image: straight, hasPhoto: true, photoType: "model", tag: "NEW", fit: "스트레이트", color: "미드 블루", description: "일상의 모든 순간에 자연스럽게 스며드는 데님. 편안한 실루엣과 균형 잡힌 비율로 다양한 스타일에 어울립니다." },
  { id: "relaxed", category: "bottom", brand: "OFFSET", name: "워시드 릴랙스 진", english: "RELAXED DENIM PANTS", price: "72,000", image: relaxed, hasPhoto: true, photoType: "model", tag: "TRENDING", fit: "릴랙스", color: "라이트 블루", description: "일상의 모든 순간에 자연스럽게 스며드는 데님. 편안한 실루엣과 균형 잡힌 비율로 다양한 스타일에 어울립니다." },
  draft({ id: "wool-slacks", category: "bottom", brand: "FORME", name: "원턱 울 슬랙스", english: "ONE-TUCK WOOL SLACKS", price: "69,000", tag: "SEASON", fit: "세미 와이드", color: "차콜", description: "한 줄 주름으로 여유 있는 실루엣을 만든 울 슬랙스." }),
  // SHOES
  draft({ id: "penny-loafer", category: "shoes", brand: "ARCHIVE 09", name: "페니 로퍼", english: "PENNY LOAFER", price: "139,000", tag: "BEST", fit: "-", color: "블랙", description: "데님과 슬랙스 모두에 어울리는 클래식 페니 로퍼." }),
  draft({ id: "court-sneaker", category: "shoes", brand: "OFFSET", name: "로우 코트 스니커즈", english: "LOW COURT SNEAKER", price: "89,000", tag: "NEW", fit: "-", color: "화이트", description: "어떤 코디에도 무난한 화이트 레더 스니커즈." }),
  draft({ id: "chelsea-boots", category: "shoes", brand: "FORME", name: "첼시 부츠", english: "CHELSEA BOOTS", price: "169,000", tag: "SEASON", fit: "-", color: "브라운", description: "스트레이트 데님과 잘 어울리는 스웨이드 첼시 부츠." }),
  // ACCESSORY
  draft({ id: "leather-belt", category: "acc", brand: "FORME", name: "레더 벨트", english: "LEATHER BELT", price: "39,000", tag: "BASIC", fit: "-", color: "블랙", description: "슬림한 버클의 소가죽 벨트." }),
  draft({ id: "ball-cap", category: "acc", brand: "OFFSET", name: "워시드 볼캡", english: "WASHED BALL CAP", price: "29,000", tag: "TRENDING", fit: "-", color: "네이비", description: "자연스럽게 물 빠진 코튼 볼캡." }),
  draft({ id: "tote-bag", category: "acc", brand: "ARCHIVE 09", name: "캔버스 토트백", english: "CANVAS TOTE BAG", price: "49,000", tag: "NEW", fit: "-", color: "아이보리", description: "노트북도 들어가는 넉넉한 캔버스 토트백." }),
];

export const categoryOf = (id: CategoryId) => categories.find(c => c.id === id)!;

// 검색어가 카테고리 키워드나 상품 이름에 걸리면 해당 상품을 돌려준다.
export function searchProducts(q: string): Product[] {
  const query = q.trim().toLowerCase();
  if (!query || ["전체", "all", "옷", "상품"].includes(query)) return products;
  return products.filter(p => {
    const c = categoryOf(p.category);
    return c.keywords.some(k => query.includes(k) || k.includes(query)) || p.name.toLowerCase().includes(query) || p.color.includes(query);
  });
}

export const stats = {
  colors: [{ label: "인디고", value: 42, swatch: "#4353A8" }, { label: "미드 블루", value: 29, swatch: "#6E8FC4" }, { label: "블랙", value: 18, swatch: "#2E2E2E" }, { label: "라이트 블루", value: 11, swatch: "#AFC7E3" }],
  types: [{ label: "와이드 데님", value: 46, swatch: "#35418F" }, { label: "스트레이트 데님", value: 34, swatch: "#5A77B8" }, { label: "릴랙스 데님", value: 20, swatch: "#9DB8DA" }],
  shoeColors: [{ label: "블랙", value: 48, swatch: "#2E2E2E" }, { label: "화이트", value: 32, swatch: "#F1F0EC" }, { label: "브라운", value: 12, swatch: "#8A5A34" }, { label: "기타", value: 8, swatch: "#6B6B6B" }],
  shoes: [{ label: "블랙 로퍼", value: 38, swatch: "#2E2E2E" }, { label: "화이트 스니커즈", value: 32, swatch: "#F1F0EC" }, { label: "부츠", value: 20, swatch: "#8A5A34" }, { label: "기타", value: 10, swatch: "#6B6B6B" }],
  outers: [{ label: "블레이저", value: 44, swatch: "#4A4A4A" }, { label: "가죽 재킷", value: 29, swatch: "#2B2B2B" }, { label: "셔츠", value: 17, swatch: "#F1F0EC" }, { label: "기타", value: 10, swatch: "#6B6B6B" }],
};
