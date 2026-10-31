# frontend – 웹 화면

**React + TypeScript**로 만든 화면이에요. 처음 화면은 Lovable(AI 화면 제작 도구)로 만들고 그 뒤로 직접 고쳤어요.
포트 **8080**에서 돌아가고, 데이터는 백엔드(8081)에 요청해서 받아 와요.

## 폴더 구조
```
src/
├─ routes/      페이지 (파일 하나 = 주소 하나)
├─ components/  여러 페이지에서 같이 쓰는 화면 조각
├─ lib/         화면이 아닌 기능 코드 (데이터, 계산, 서버 요청)
├─ assets/      아이템 사진 등 이미지
└─ styles.css   전체 디자인 (글꼴, 색, 배치)
```

## routes/ – 페이지
| 파일 | 주소 | 화면 |
|---|---|---|
| `__root.tsx` | (모든 페이지) | 공통 틀 |
| `index.tsx` | `/` | 홈: 검색창, 지금 뜨는 코디, 스타일 랭킹, 방금 올라온 코디 |
| `results.tsx` | `/results?q=` | 아이템 검색 결과 |
| `item/$id.tsx` | `/item/데님` 등 | 아이템 스타일 가이드: 사진, 핏 종류, 많이 입는 색, 코디 통계, 커뮤니티 글 |
| `fitting.tsx` | `/fitting` | 가상 피팅 (실시간 AI 피팅 / 사진 피팅 탭) |
| `closet.tsx` | `/closet` | 내 옷장: 가진 아이템, 내 아이템으로 입을 수 있는 코디, 랜덤 코디 뽑기 |
| `u/$id.tsx` | `/u/사용자번호` | 사용자 프로필: 게시물 피드, 등급, 배지, (내 프로필이면) 체형 핏 추천 |
| `me.tsx` | `/me` | 내 프로필로 이동 |
| `people.tsx` | `/people` | 유저 검색 |
| `login.tsx` | `/login` | 로그인·회원가입 |

## components/ – 화면 조각
| 파일 | 역할 |
|---|---|
| `site-header.tsx` | 맨 위 메뉴 (홈, 스타일 가이드, 가상 피팅, 옷장, 유저 검색) |
| `search-box.tsx` | 아이템 검색창 |
| `style-vote-board.tsx` | 아이템 페이지의 커뮤니티: 코디 올리기 폼, 글 목록, 추천·신고·수정·삭제 |
| `style-insight.tsx` | 아이템 하나를 "어떤 색, 무엇과 함께 입는지" 통계로 보여 줌 (STYLE DATA) |
| `stat-silhouette.tsx` | 고른 색으로 사람 실루엣을 칠해서 보여 줌 |
| `outfit-card.tsx` | 코디 한 벌을 칸별(아우터·상의·하의·신발·액세서리)로 보여 줌 |
| `post-modal.tsx` | 게시물을 크게 보는 창 (좋아요, 댓글, "이 코디 입어보기") |
| `comments.tsx` | 댓글 목록과 입력칸 |
| `link-tags.tsx` | 코디 사진 위 구매처 링크 태그 |
| `ranking-panel.tsx` | 추천을 많이 받은 사람 순위 (이번 주 / 전체) |
| `tier-badge.tsx`, `badge-case.tsx` | 활동 등급 표시, 업적 배지 |
| `user-avatar.tsx` | 프로필 사진 동그라미 |
| `home-insights.tsx` | 홈의 "이번 주 인기 아이템", "많이 입는 색 조합" |
| `card-hand.tsx`, `outfit-draw.tsx` | 옷장 카드 펼치기, 랜덤 코디 뽑기 |
| `live-tryon.tsx` | 실시간 피팅: 카메라 켜기, Decart 연결, 30초 타이머 |
| `live-fitting.tsx` | 실시간 피팅 탭 전체 (입을 옷 고르기, 게시물 코디 불러오기) |
| `body-fit.tsx` | 체형 입력과 핏 추천 칸 |
| `ui/` | 버튼 같은 기본 부품 (shadcn/ui 라이브러리) |

## lib/ – 기능 코드
| 파일 | 역할 |
|---|---|
| `api.ts` | 백엔드에 요청 보내는 공통 함수 (로그인 토큰 자동으로 붙임) |
| `session.ts` | 로그인 상태 저장 (브라우저 localStorage) |
| `catalog.ts` | 아이템 73종 정보 (이름, 계절, 많이 입는 색, 입는 팁, 사진) |
| `fits.ts` | 핏 종류 (스키니, 와이드, 오버핏 등) |
| `palette.ts` | 코디에 쓰는 16색 (백엔드 `StylePalette.java`와 같게) |
| `outfit.ts` | 코디 한 벌 데이터 모양과 통계 계산 |
| `flats.ts` | 아이템 도식 그림 (사진이 없을 때 쓰는 선 그림) |
| `body.ts` | 키·몸무게·체형으로 핏 추천 계산 |
| `live-tryon.ts` | 실시간 피팅에 보낼 영어 설명 문장 만들기 |
| `achievements.ts` | 업적 배지 계산 |
| `avatars.ts` | 프로필 사진 주소 관리 |
| `closet.ts` | 옷장 아이템 목록 |
| `image.ts` | 사진 올리기 전에 크기 줄이기 |
| `like-burst.ts` | 좋아요 누를 때 하트 애니메이션 |
| `error-*.ts`, `lovable-error-reporting.ts` | 에러 처리 (Lovable 기본 코드) |

## 실행
```
npm install          # 처음 한 번
npm run dev -- --port 8080
```
`.env`에 백엔드 주소(`VITE_API_URL`)를 적어야 해요.
