import wide from "@/assets/look-wide.jpg";
import straight from "@/assets/look-straight.jpg";
import relaxed from "@/assets/look-relaxed.jpg";
import denim from "@/assets/product-denim.jpg";

export const looks = [
  { id: "wide", rank: "01", title: "와이드 데님", english: "WIDE LEG", style: "미니멀", image: wide, description: "화이트 셔츠 + 다크 인디고 데님", match: 94, color: "화이트", type: "와이드", shoe: "블랙 로퍼", outer: "테일러드 재킷", price: "89,000" },
  { id: "straight", rank: "02", title: "스트레이트 데님", english: "STRAIGHT", style: "클래식", image: straight, description: "차콜 블레이저 + 미드 블루 데님", match: 89, color: "차콜", type: "스트레이트", shoe: "블랙 로퍼", outer: "오버핏 블레이저", price: "79,000" },
  { id: "relaxed", rank: "03", title: "릴랙스 데님", english: "RELAXED", style: "스트릿", image: relaxed, description: "크롭 재킷 + 워시드 블루 데님", match: 86, color: "블랙", type: "릴랙스", shoe: "화이트 스니커즈", outer: "크롭 재킷", price: "72,000" },
] as const;

export const products = [
  { id: "wide", brand: "FORME", name: "에센셜 와이드 데님 팬츠", price: "89,000", image: denim, tag: "BEST", fit: "와이드", color: "딥 인디고" },
  { id: "straight", brand: "ARCHIVE 09", name: "데일리 스트레이트 데님", price: "79,000", image: straight, tag: "NEW", fit: "스트레이트", color: "미드 블루" },
  { id: "relaxed", brand: "OFFSET", name: "워시드 릴랙스 진", price: "72,000", image: relaxed, tag: "TRENDING", fit: "릴랙스", color: "라이트 블루" },
] as const;

export const stats = {
  colors: [{ label: "인디고", value: 42, swatch: "#4353A8" }, { label: "미드 블루", value: 29, swatch: "#6E8FC4" }, { label: "블랙", value: 18, swatch: "#2E2E2E" }, { label: "라이트 블루", value: 11, swatch: "#AFC7E3" }],
  types: [{ label: "와이드 데님", value: 46, swatch: "#35418F" }, { label: "스트레이트 데님", value: 34, swatch: "#5A77B8" }, { label: "릴랙스 데님", value: 20, swatch: "#9DB8DA" }],
  shoeColors: [{ label: "블랙", value: 48, swatch: "#2E2E2E" }, { label: "화이트", value: 32, swatch: "#F1F0EC" }, { label: "브라운", value: 12, swatch: "#8A5A34" }, { label: "기타", value: 8, swatch: "#6B6B6B" }],
  shoes: [{ label: "블랙 로퍼", value: 38, swatch: "#2E2E2E" }, { label: "화이트 스니커즈", value: 32, swatch: "#F1F0EC" }, { label: "부츠", value: 20, swatch: "#8A5A34" }, { label: "기타", value: 10, swatch: "#6B6B6B" }],
  outers: [{ label: "블레이저", value: 44, swatch: "#4A4A4A" }, { label: "가죽 재킷", value: 29, swatch: "#2B2B2B" }, { label: "셔츠", value: 17, swatch: "#F1F0EC" }, { label: "기타", value: 10, swatch: "#6B6B6B" }],
};
