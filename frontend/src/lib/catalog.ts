import wide from "@/assets/look-wide.jpg";
import straight from "@/assets/look-straight.jpg";
import relaxed from "@/assets/look-relaxed.jpg";
import denim from "@/assets/product-denim.jpg";
import { flatImage } from "@/lib/flats";
import { colorById, type PaletteColor } from "@/lib/palette";


// 홈의 "오늘의 실루엣" (1차 때 찍은 데님 코디 사진)
export const looks = [
  { id: "wide", rank: "01", title: "와이드 데님", english: "WIDE LEG", style: "미니멀", image: wide, description: "화이트 셔츠 + 다크 인디고 데님" },
  { id: "straight", rank: "02", title: "스트레이트 데님", english: "STRAIGHT", style: "클래식", image: straight, description: "차콜 블레이저 + 미드 블루 데님" },
  { id: "relaxed", rank: "03", title: "릴랙스 데님", english: "RELAXED", style: "스트릿", image: relaxed, description: "크롭 재킷 + 워시드 블루 데님" },
] as const;

// slot: 코디 글에서 이 카테고리 아이템이 들어가는 칸. tryOn: AI 피팅(fashn-vton)에 보낼 category.
export const categories = [
  { id: "outer", ko: "아우터", en: "OUTER", slot: "outer", tryOn: "tops", keywords: ["아우터", "겉옷"] },
  { id: "top", ko: "상의", en: "TOP", slot: "top", tryOn: "tops", keywords: ["상의", "윗옷"] },
  { id: "inner", ko: "이너", en: "INNER", slot: "top", tryOn: "tops", keywords: ["이너", "레이어드"] },
  { id: "bottom", ko: "하의", en: "BOTTOM", slot: "bottom", tryOn: "bottoms", keywords: ["하의", "바지"] },
  { id: "shoes", ko: "신발", en: "SHOES", slot: "shoes", tryOn: null, keywords: ["신발", "슈즈"] },
  { id: "acc", ko: "액세서리", en: "ACCESSORY", slot: "acc", tryOn: null, keywords: ["액세서리", "악세사리", "소품"] },
] as const;

export type CategoryId = (typeof categories)[number]["id"];
export type Slot = (typeof categories)[number]["slot"];
export const slots: { id: Slot; ko: string; required: boolean }[] = [
  { id: "outer", ko: "아우터", required: false },
  { id: "top", ko: "상의", required: true },
  { id: "bottom", ko: "하의", required: true },
  { id: "shoes", ko: "신발", required: true },
  { id: "acc", ko: "액세서리", required: false },
];

export type Item = {
  id: string; category: CategoryId; name: string; english: string;
  season: string;      // 주로 입는 계절
  colors: string[];    // 많이 입는 색 (palette.ts id)
  tips: string[];      // 이렇게 입어요
  aliases: string[];   // 검색어
  image: string; hasPhoto: boolean; photoType?: "flat-lay" | "model";
};

// 도식 그림이 없는 아이템에 쓰는 회색 자리표시 이미지
function placeholder(category: CategoryId, label: string) {
  const c = categories.find(x => x.id === category)!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1280" viewBox="0 0 1024 1280"><rect width="1024" height="1280" fill="#e4e4e2"/><text x="512" y="600" text-anchor="middle" font-family="Manrope,Noto Sans KR,sans-serif" font-size="44" font-weight="800" letter-spacing="6" fill="#8a8a88">${c.en}</text><text x="512" y="680" text-anchor="middle" font-family="Noto Sans KR,sans-serif" font-size="40" font-weight="700" fill="#a3a3a1">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type Def = [id: string, name: string, english: string, season: string, colors: string, tips: string[], aliases?: string];
const photos: Record<string, { image: string; photoType: "flat-lay" | "model" }> = {
  wide: { image: denim, photoType: "flat-lay" },
  straight: { image: straight, photoType: "model" },
  relaxed: { image: relaxed, photoType: "model" },
};

function build(category: CategoryId, defs: Def[]): Item[] {
  return defs.map(([id, name, english, season, colors, tips, aliases = ""]) => {
    const photo = photos[id];
    return {
      id, category, name, english, season, tips,
      colors: colors.split(" "),
      aliases: aliases ? aliases.split(" ") : [],
      // 사진이 있으면 사진, 없으면 대표 색으로 칠한 도식 그림 (flats.ts)
      image: photo?.image ?? flatImage(id, colorById(colors.split(" ")[0])?.hex ?? "#9A9A9A") ?? placeholder(category, name),
      hasPhoto: Boolean(photo),
      ...(photo ? { photoType: photo.photoType } : {}),
    };
  });
}

export const items: Item[] = [
  ...build("outer", [
    ["mustang", "무스탕", "SHEARLING JACKET", "겨울", "brown camel black", ["안쪽 털이 보이는 칼라가 포인트라 이너는 단정한 니트나 터틀넥이 좋아요.", "부피가 있어서 하의는 스트레이트·슬림한 핏으로 균형을 맞춰요."], "무스탕 시어링 양털"],
    ["light-padding", "경량패딩", "LIGHT DOWN JACKET", "가을·겨울", "black navy beige khaki", ["얇아서 코트·재킷 안에 이너 패딩으로 겹쳐 입기 좋아요.", "단독으로 입을 땐 후드티를 받쳐 캐주얼하게 입어요."], "경량 이너패딩 초경량"],
    ["long-padding", "롱패딩", "LONG PADDED COAT", "겨울", "black navy beige white", ["무릎 아래까지 덮으니 하의는 슬림하게, 신발은 볼륨 있는 걸로 맞춰요.", "블랙이 가장 무난하고, 베이지·화이트는 밝은 니트와 잘 어울려요."], "롱패딩 벤치파카"],
    ["short-padding", "숏패딩", "SHORT PUFFER", "겨울", "black ivory navy olive", ["짧은 기장이라 와이드 팬츠와 입으면 비율이 좋아 보여요.", "볼륨이 커서 상의는 얇게, 하의는 넉넉하게 입어요."], "숏패딩 푸퍼 패딩"],
    ["padding-vest", "패딩 베스트", "PADDED VEST", "가을·겨울", "black khaki navy", ["후드티나 셔츠 위에 겹쳐 입는 레이어드 아이템이에요.", "팔이 자유로워 활동적인 코디에 좋아요."], "패딩조끼 베스트"],
    ["hood-zipup", "후드집업", "HOODED ZIP-UP", "봄·가을", "gray black navy ivory", ["반팔이나 롱슬리브 위에 가볍게 걸쳐요.", "코트 안에 받쳐 입으면 후드가 밖으로 나와 꾸안꾸 느낌이 나요."], "후드집업 집업후드 후드자켓"],
    ["blazer", "블레이저", "BLAZER", "봄·가을", "charcoal navy beige black", ["데님과 입으면 캐주얼, 슬랙스와 입으면 포멀해져요.", "이너는 화이트 티셔츠나 셔츠가 가장 무난해요."], "블레이저 정장자켓 테일러드"],
    ["trench-coat", "트렌치코트", "TRENCH COAT", "봄·가을", "beige khaki navy black", ["허리 벨트를 묶으면 실루엣이 정돈돼요.", "베이지 트렌치엔 화이트·네이비 이너가 잘 어울려요."], "트렌치 바바리"],
    ["wool-coat", "울 코트", "WOOL COAT", "겨울", "camel charcoal black navy", ["니트·터틀넥과 입으면 차분한 겨울 코디가 돼요.", "카멜 코트는 블랙·화이트 이너와 대비가 좋아요."], "코트 싱글코트 롱코트 울코트"],
    ["leather-jacket", "가죽 자켓", "LEATHER JACKET", "봄·가을", "black brown", ["화이트 티셔츠 + 데님이 정석 조합이에요.", "부츠와 함께 입으면 단단한 인상이 강해져요."], "가죽자켓 라이더자켓 레더"],
    ["denim-jacket", "데님 자켓", "DENIM JACKET", "봄·가을", "mid-blue light-blue indigo black", ["하의는 데님보다 블랙·베이지 팬츠로 톤을 나누면 깔끔해요.", "후드티를 안에 입으면 캐주얼한 레이어드가 돼요."], "청자켓 데님자켓 트러커"],
    ["ma1", "항공점퍼", "MA-1 BOMBER", "가을·겨울", "khaki black navy", ["짧은 기장이라 와이드·카고 팬츠와 잘 맞아요.", "후드티를 받쳐 입으면 스트릿 무드가 나요."], "항공점퍼 블루종 봄버"],
    ["windbreaker", "바람막이", "WINDBREAKER", "봄·가을", "black navy khaki", ["가벼운 아웃도어 무드라 조거·카고 팬츠와 어울려요.", "슬랙스와 섞으면 요즘 많이 입는 고프코어 스타일이 돼요."], "바람막이 윈드브레이커 아노락"],
    ["fleece", "플리스", "FLEECE JACKET", "가을·겨울", "ivory brown gray", ["포근한 질감이라 데님과 입으면 편한 주말 코디가 돼요.", "아이보리 플리스는 브라운·카키 하의와 잘 어울려요."], "플리스 후리스 뽀글이"],
    ["cardigan", "가디건", "CARDIGAN", "봄·가을", "gray navy ivory black", ["티셔츠 위에 단추를 열어 걸치면 부드러운 인상이 돼요.", "단추를 모두 잠그면 니트처럼 단독으로도 입을 수 있어요."], "가디건 니트가디건"],
    ["field-jacket", "필드 자켓", "FIELD JACKET", "봄·가을", "khaki olive beige", ["주머니가 많은 밀리터리 아이템이라 하의는 단순하게 입어요.", "카키 자켓 + 화이트 티 + 데님이 무난한 조합이에요."], "야상 필드자켓 사파리"],
    ["work-jacket", "워크 자켓", "WORK JACKET", "봄·가을", "brown black beige", ["캔버스 원단의 워크웨어라 카펜터·데님 팬츠와 잘 맞아요.", "후드티를 받쳐 입으면 늦가을까지 입을 수 있어요."], "워크자켓 초어자켓 카펜터"],
  ]),
  ...build("top", [
    ["short-tee", "반팔 티셔츠", "SHORT SLEEVE TEE", "여름", "white black gray navy", ["가장 기본 아이템이라 어떤 하의와도 잘 어울려요.", "오버핏 반팔은 와이드 팬츠, 레귤러핏은 슬림 팬츠와 맞춰요."], "반팔 티셔츠 반팔티 티"],
    ["long-sleeve", "롱슬리브", "LONG SLEEVE TEE", "봄·가을", "white black gray ivory", ["단독으로도, 반팔 안에 레이어드해도 좋아요.", "셔츠나 후드집업 안에 받쳐 입는 이너로도 많이 써요."], "롱슬리브 긴팔티 긴팔 롱티"],
    ["sweatshirt", "맨투맨", "SWEATSHIRT", "봄·가을", "gray navy black ivory", ["안에 셔츠 칼라를 꺼내 입으면 단정해 보여요.", "그레이 맨투맨 + 데님은 실패 없는 조합이에요."], "맨투맨 스웨트셔츠 스웻"],
    ["hoodie", "후드티", "HOODIE", "봄·가을·겨울", "gray black navy ivory", ["코트·블레이저 안에 입으면 후드가 포인트가 돼요.", "와이드 팬츠나 조거와 입으면 편한 스트릿 코디가 돼요."], "후드티 후디 후드"],
    ["half-zip", "하프집업", "HALF ZIP SWEAT", "가을·겨울", "gray navy ivory", ["지퍼를 열어 안에 티셔츠를 살짝 보이게 입어요.", "슬랙스와 입으면 캐주얼하면서 단정해요."], "하프집업 반집업 하프지퍼"],
    ["crew-knit", "크루넥 니트", "CREW NECK KNIT", "가을·겨울", "ivory gray navy brown", ["셔츠를 안에 받쳐 입는 레이어드가 정석이에요.", "코트 안에 입기 좋은 겨울 기본 아이템이에요."], "니트 스웨터 크루넥"],
    ["knit-vest", "니트 베스트", "KNIT VEST", "봄·가을", "ivory navy brown gray", ["셔츠나 롱슬리브 위에 겹쳐 입는 아이템이에요.", "슬랙스와 입으면 단정한 프레피 스타일이 돼요."], "니트베스트 니트조끼 조끼"],
    ["oxford-shirt", "옥스포드 셔츠", "OXFORD SHIRT", "봄·가을", "white light-blue pink", ["단추를 몇 개 열고 소매를 걷으면 캐주얼해져요.", "니트나 맨투맨 안에 받쳐 입는 레이어드 아이템으로도 좋아요."], "셔츠 옥스포드셔츠 남방"],
    ["stripe-shirt", "스트라이프 셔츠", "STRIPE SHIRT", "봄·여름", "light-blue white navy", ["무늬가 있으니 하의는 단색으로 정리해요.", "블루 스트라이프 + 베이지 팬츠가 산뜻해요."], "스트라이프셔츠 줄무늬셔츠"],
    ["linen-shirt", "린넨 셔츠", "LINEN SHIRT", "여름", "white beige khaki", ["통기성이 좋아 여름 반팔 대신 많이 입어요.", "단추를 열어 반팔 위에 걸치면 아우터처럼 입을 수 있어요."], "린넨셔츠 마셔츠"],
    ["flannel-shirt", "체크 셔츠", "FLANNEL CHECK SHIRT", "가을·겨울", "burgundy navy khaki", ["열어서 반팔·후드티 위에 걸치면 아우터처럼 쓸 수 있어요.", "체크 색 중 하나를 하의 색으로 맞추면 통일감이 생겨요."], "체크셔츠 플란넬 남방"],
    ["denim-shirt", "데님 셔츠", "DENIM SHIRT", "봄·가을", "light-blue mid-blue", ["하의는 블랙·베이지로 톤을 나눠 입어요.", "화이트 티 위에 셔켓처럼 열어 입어도 좋아요."], "청남방 데님셔츠"],
    ["polo-shirt", "폴로 셔츠", "POLO SHIRT", "여름", "navy white black", ["칼라가 있어 반팔 티보다 단정해 보여요.", "슬랙스·치노와 입으면 깔끔한 여름 출근룩이 돼요."], "피케 카라티 폴로"],
    ["rugby-shirt", "럭비 셔츠", "RUGBY SHIRT", "봄·가을", "navy burgundy", ["굵은 줄무늬가 포인트라 하의는 단색이 좋아요.", "데님과 입으면 캐주얼한 빈티지 무드가 나요."], "럭비티 카라맨투맨"],
    ["blouse", "블라우스", "BLOUSE", "봄·여름", "white ivory pink", ["슬랙스·스커트와 입으면 단정한 오피스룩이 돼요.", "데님과 입으면 꾸민 듯 편한 데일리룩이 돼요."], "블라우스"],
    ["crop-tee", "크롭 티셔츠", "CROPPED TEE", "여름", "white black gray", ["하이웨스트 하의와 입으면 다리가 길어 보여요.", "셔츠나 자켓을 열어 걸치면 노출을 줄일 수 있어요."], "크롭티 크롭"],
  ]),
  ...build("inner", [
    ["sleeveless", "슬리브리스", "SLEEVELESS TOP", "여름", "white black gray", ["셔츠나 가디건 안에 받쳐 입는 레이어드용으로 좋아요.", "와이드 팬츠와 단독으로 입으면 시원한 여름 코디가 돼요."], "나시 민소매 슬리브리스 탱크탑"],
    ["turtleneck", "터틀넥", "TURTLENECK", "가을·겨울", "black ivory gray navy", ["코트·블레이저 안에 입으면 셔츠보다 부드러운 인상이 돼요.", "블랙 터틀넥은 어떤 아우터와도 잘 맞아요."], "터틀넥 폴라 목폴라"],
    ["thermal", "발열 내의", "THERMAL INNER", "겨울", "black white gray", ["두께가 얇아 셔츠·니트 안에 입어도 티가 안 나요.", "흰 셔츠 안에는 베이지 계열이 비치지 않아 좋아요."], "히트텍 발열내의 내복"],
    ["henley", "헨리넥", "HENLEY TEE", "봄·가을", "white gray navy", ["단추 몇 개만 있는 넥라인이라 단독으로 입어도 멋스러워요.", "셔츠나 가디건 안에 레이어드해도 좋아요."], "헨리넥 단추티"],
    ["camisole", "캐미솔", "CAMISOLE", "여름", "black white beige", ["셔츠·가디건 안에 입으면 은은한 레이어드가 돼요.", "슬립 원피스 대신 스커트와 맞춰 입어도 좋아요."], "캐미솔 슬립탑"],
  ]),
  ...build("bottom", [
    ["wide", "와이드 데님", "WIDE LEG DENIM", "사계절", "indigo mid-blue black light-blue", ["상의는 짧거나 넣어 입어 허리 위치를 보여 주면 비율이 좋아요.", "로퍼·스니커즈처럼 앞코가 둥근 신발이 잘 어울려요."], "데님 청바지 진 와이드 jeans denim"],
    ["straight", "스트레이트 데님", "STRAIGHT DENIM", "사계절", "mid-blue indigo black light-blue", ["가장 무난한 핏이라 어떤 상의와도 잘 맞아요.", "블레이저와 입으면 오피스 캐주얼이 돼요."], "데님 청바지 진 스트레이트 jeans denim"],
    ["relaxed", "릴랙스 데님", "RELAXED DENIM", "사계절", "light-blue mid-blue gray", ["여유 있는 핏이라 크롭 아우터와 입으면 비율이 좋아요.", "스니커즈와 입으면 편한 스트릿 무드가 나요."], "데님 청바지 진 릴랙스 jeans denim"],
    ["bootcut", "부츠컷 데님", "BOOTCUT DENIM", "사계절", "indigo black mid-blue", ["밑단이 넓어서 굽 있는 부츠나 로퍼로 길이를 살려요.", "상의는 짧게 입어야 다리가 길어 보여요."], "부츠컷 세미부츠컷 데님 청바지"],
    ["skinny", "스키니 데님", "SKINNY DENIM", "사계절", "black indigo", ["오버핏 상의·롱 아우터와 입으면 균형이 맞아요.", "첼시 부츠와 함께 입으면 깔끔해요."], "스키니 슬림 데님 청바지"],
    ["slacks", "슬랙스", "SLACKS", "사계절", "charcoal black gray beige", ["셔츠·니트와 입으면 단정하고, 후드티와 입으면 편안해요.", "로퍼·더비와 입으면 포멀, 스니커즈와 입으면 캐주얼이에요."], "슬랙스 정장바지 울팬츠"],
    ["chinos", "치노 팬츠", "CHINO PANTS", "봄·여름·가을", "beige khaki navy", ["베이지 치노 + 네이비 상의가 대표적인 조합이에요.", "셔츠·폴로와 입으면 깔끔한 캐주얼이 돼요."], "치노 면바지"],
    ["cargo", "카고 팬츠", "CARGO PANTS", "사계절", "khaki black beige", ["옆 주머니가 포인트라 상의는 심플하게 입어요.", "짧은 아우터·스니커즈와 입으면 스트릿 무드가 나요."], "카고 건빵바지"],
    ["jogger", "조거 팬츠", "JOGGER PANTS", "사계절", "gray black navy", ["밑단이 조여 있어 운동화가 잘 보여요.", "후드티·바람막이와 입으면 편한 애슬레저룩이 돼요."], "조거 츄리닝"],
    ["track-pants", "트랙 팬츠", "TRACK PANTS", "사계절", "black navy", ["옆 라인이 포인트라 상의는 단색이 좋아요.", "블레이저와 섞어 입으면 요즘 유행하는 믹스매치가 돼요."], "트랙팬츠 트레이닝바지 저지"],
    ["shorts", "반바지", "SHORTS", "여름", "beige black navy khaki", ["무릎 위 기장이면 시원하고, 버뮤다 기장이면 단정해요.", "반팔 셔츠·폴로와 입으면 여름 정석 코디예요."], "반바지 쇼츠 버뮤다"],
    ["corduroy", "코듀로이 팬츠", "CORDUROY PANTS", "가을·겨울", "brown beige ivory", ["골지 질감이 따뜻해 보여 니트와 잘 어울려요.", "브라운 코듀로이 + 아이보리 니트가 대표 조합이에요."], "코듀로이 골덴"],
    ["mini-skirt", "미니 스커트", "MINI SKIRT", "봄·여름", "black indigo beige", ["상의는 여유 있는 니트·셔츠로 균형을 맞춰요.", "롱부츠·로퍼와 함께 입으면 단정해요."], "미니스커트 숏스커트 치마"],
    ["long-skirt", "롱 스커트", "LONG SKIRT", "사계절", "black beige indigo", ["상의는 짧게 넣어 입어 허리선을 살려요.", "스니커즈와 입으면 캐주얼, 부츠와 입으면 분위기 있어요."], "롱스커트 맥시스커트 치마"],
    ["pleated-skirt", "플리츠 스커트", "PLEATED SKIRT", "봄·가을", "gray navy black", ["니트·셔츠와 입으면 단정한 프레피 스타일이 돼요.", "로퍼·메리제인과 잘 어울려요."], "플리츠 주름치마"],
  ]),
  ...build("shoes", [
    ["low-sneakers", "로우 스니커즈", "LOW SNEAKERS", "사계절", "white black", ["화이트 스니커즈는 어떤 코디에도 무난해요.", "슬랙스와 입으면 캐주얼하게 힘을 뺄 수 있어요."], "스니커즈 운동화 컨버스 로우"],
    ["high-sneakers", "하이탑 스니커즈", "HIGH-TOP SNEAKERS", "사계절", "black white", ["발목을 덮어 밑단을 살짝 접은 팬츠와 잘 어울려요.", "스트릿 무드의 카고·와이드 팬츠와 맞춰요."], "하이탑 척 스니커즈"],
    ["running-shoes", "러닝화", "RUNNING SHOES", "사계절", "gray black white", ["조거·트랙 팬츠와 입으면 애슬레저룩이 돼요.", "슬랙스와 섞으면 요즘 유행하는 고프코어 스타일이에요."], "러닝화 운동화 조깅화"],
    ["loafers", "로퍼", "LOAFERS", "사계절", "black brown", ["흰 양말·블랙 양말로 분위기를 바꿀 수 있어요.", "와이드 데님·슬랙스 모두와 잘 어울려요."], "로퍼 페니로퍼"],
    ["derby", "더비 슈즈", "DERBY SHOES", "사계절", "black brown", ["끈이 있는 구두라 로퍼보다 단단한 인상이에요.", "슬랙스·스트레이트 데님과 잘 맞아요."], "더비 구두"],
    ["chelsea-boots", "첼시 부츠", "CHELSEA BOOTS", "가을·겨울", "black brown", ["슬림·스트레이트 팬츠와 입으면 깔끔해요.", "코트와 함께 입으면 단정한 겨울 코디가 돼요."], "첼시부츠 부츠"],
    ["work-boots", "워커", "WORK BOOTS", "가을·겨울", "black brown", ["볼륨이 커서 와이드·카고 팬츠와 잘 맞아요.", "밑단을 부츠 위에 살짝 걸치게 입어요."], "워커 워크부츠 군화"],
    ["ugg-boots", "어그 부츠", "SHEEPSKIN BOOTS", "겨울", "beige brown black", ["조거·레깅스처럼 밑단이 좁은 하의와 잘 어울려요.", "롱패딩·플리스와 함께 입으면 따뜻한 겨울 코디가 돼요."], "어그 양털부츠"],
    ["sandals", "샌들", "SANDALS", "여름", "black brown", ["반바지·린넨 팬츠와 입으면 시원한 여름 코디가 돼요.", "양말과 함께 신는 스타일도 많이 입어요."], "샌들"],
    ["slides", "슬리퍼", "SLIDES", "여름", "black white", ["가벼운 외출용으로 반바지·조거와 맞춰요.", "슬랙스와 섞어 입으면 힘 뺀 스타일이 돼요."], "슬리퍼 슬라이드 쪼리"],
    ["mary-jane", "메리제인", "MARY JANE SHOES", "봄·가을", "black burgundy", ["스커트·와이드 팬츠 모두와 잘 어울려요.", "흰 양말과 신으면 귀여운 분위기가 나요."], "메리제인 플랫"],
  ]),
  ...build("acc", [
    ["ball-cap", "볼캡", "BALL CAP", "사계절", "black navy beige", ["캐주얼한 코디에 힘을 빼고 싶을 때 좋아요.", "상의나 신발 색과 맞추면 통일감이 생겨요."], "볼캡 모자 캡"],
    ["beanie", "비니", "BEANIE", "가을·겨울", "black gray ivory", ["코트·패딩 모두와 어울리는 겨울 소품이에요.", "머리를 덮는 깊이에 따라 분위기가 달라져요."], "비니 털모자"],
    ["bucket-hat", "버킷햇", "BUCKET HAT", "봄·여름", "black beige khaki", ["반팔·반바지 여름 코디에 포인트가 돼요.", "아웃도어 무드의 바람막이와도 잘 맞아요."], "버킷햇 벙거지"],
    ["muffler", "머플러", "MUFFLER", "겨울", "camel gray burgundy", ["단색 코트에 색 포인트를 줄 때 좋아요.", "목에 한 번 감아 앞으로 늘어뜨리면 자연스러워요."], "머플러 목도리 스카프"],
    ["belt", "벨트", "BELT", "사계절", "black brown", ["상의를 넣어 입을 때 허리선을 정리해 줘요.", "신발 색과 맞추면 깔끔해 보여요."], "벨트"],
    ["tote-bag", "토트백", "TOTE BAG", "사계절", "ivory black beige", ["캔버스 토트는 캐주얼, 가죽 토트는 단정한 코디에 좋아요."], "토트백 에코백 가방"],
    ["cross-bag", "크로스백", "CROSSBODY BAG", "사계절", "black navy", ["작은 크로스백은 어떤 코디에도 부담 없이 맞아요.", "아우터 위로 메면 실루엣이 정리돼요."], "크로스백 메신저백 가방"],
    ["backpack", "백팩", "BACKPACK", "사계절", "black navy gray", ["캐주얼·애슬레저 코디와 잘 어울려요.", "블랙 백팩이 가장 무난해요."], "백팩 책가방 가방"],
    ["glasses", "안경", "GLASSES", "사계절", "black brown", ["뿔테는 부드럽게, 메탈테는 깔끔하게 보여요."], "안경 선글라스"],
  ]),
];

export const itemById = (id: string | null | undefined) => (id ? items.find(i => i.id === id) : undefined);
export const categoryOf = (id: CategoryId) => categories.find(c => c.id === id)!;
export const slotOf = (item: Item): Slot => categoryOf(item.category).slot;

// 검색어가 아이템 이름·별칭에 걸리거나, 카테고리 이름(아우터·하의…)이면 그 카테고리 전체를 돌려준다.
export function searchItems(q: string): Item[] {
  const query = q.trim().toLowerCase().replace(/\s+/g, "");
  if (!query || ["전체", "all", "옷", "아이템"].includes(query)) return items;
  return items.filter(i => {
    const c = categoryOf(i.category);
    const words = [i.name.replace(/\s+/g, ""), i.english.toLowerCase().replace(/\s+/g, ""), ...i.aliases.map(a => a.toLowerCase())];
    return words.some(w => w.includes(query) || (query.length >= 2 && query.includes(w)))
      || (c.keywords as readonly string[]).includes(query);
  });
}

/** 해당 칸에 들어갈 수 있는 아이템 (상의 칸에는 이너도 들어간다) */
export const itemsForSlot = (slot: Slot) => items.filter(i => slotOf(i) === slot);

/** 색 목록에서 이 아이템이 많이 입는 색을 앞으로 */
export function colorsFirst(item: Item | undefined, all: PaletteColor[]) {
  if (!item) return all;
  return [...all].sort((a, b) => (item.colors.includes(b.id) ? 1 : 0) - (item.colors.includes(a.id) ? 1 : 0));
}
