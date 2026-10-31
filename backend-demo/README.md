# backend-demo – 백엔드 (API 서버)

**Java Spring Boot**로 만든 서버예요. 화면(frontend)이 "글 목록 줘", "로그인할게" 같은 요청을 보내면 받아서 처리하고, DB(MySQL)에 저장하거나 꺼내서 JSON으로 돌려줘요.
포트 **8081**에서 돌아가요.

## 파일별 역할 (`src/main/java/com/kdh/demo/`)

| 파일 | 하는 일 | 주소 |
|---|---|---|
| `DemoApplication.java` | 서버를 켜는 시작점 (main) | |
| `WebConfig.java` | 다른 주소(프론트 8080)에서 오는 요청을 허락하는 설정 (CORS) | |
| `HelloController.java` | 서버가 살아 있는지 확인하는 테스트용 | `/api/hello` |
| `AuthService.java` | 회원가입·로그인 처리. 비밀번호는 BCrypt로 암호화, 로그인하면 30일짜리 토큰 발급 | |
| `AuthController.java` | 회원가입, 로그인, 로그아웃 요청을 받는 곳 | `/api/auth/...` |
| `StyleVoteController.java` | **핵심.** 코디 글 올리기·수정·삭제, 추천(좋아요), 신고, 코디 통계(%), 순위, 사진·구매처 링크, 사용자 프로필 | `/api/style-posts/...` |
| `CommentController.java` | 게시물 댓글 보기·쓰기·삭제 | `/api/style-posts/{글번호}/comments` |
| `StylePalette.java` | 코디에 쓸 수 있는 16색과 아이템 목록 (프론트 `palette.ts`와 똑같이 맞춤) | |
| `ProfanityFilter.java` | 글·댓글의 욕설 걸러내기 ("시 1 발"처럼 사이에 숫자를 넣어도 잡음) | |
| `ClosetController.java` | 내 옷장: 가진 아이템 저장, 내 아이템으로 입을 수 있는 코디 찾기, 피팅 결과 저장 | `/api/closet/...` |
| `AvatarController.java` | 프로필 사진 올리기·보기·삭제 | `/api/avatars/...` |
| `BodyController.java` | 내 체형(키·몸무게·체형) 저장 → 프론트가 핏 추천에 사용 | `/api/body` |
| `TryOnController.java` | **사진 피팅.** 사진을 AI 서버(8000)로 보내고, 작업 번호를 받아 3초마다 완료됐는지 확인 | `/api/tryon/...` |
| `LiveTryOnController.java` | **실시간 피팅.** Decart API 키를 숨긴 채 30초짜리 임시 토큰만 발급 (하루 10번 제한) | `/api/live-tryon/...` |

## 설정 파일
| 파일 | 내용 |
|---|---|
| `src/main/resources/application.properties` | 포트, DB 연결, AI 서버 주소 같은 기본 설정 |
| `db.properties` (깃에 안 올라감) | DB 비밀번호, Decart API 키 같은 비밀 값. `db.properties.example`을 복사해서 만듦 |
| `build.gradle` | 필요한 라이브러리 목록 (Spring Boot, MySQL 드라이버 등) |

## 흐름 예시: 코디 글 올리기
```
프론트 → POST /api/style-posts (글 내용 JSON)
  → StyleVoteController.create()
     ① AuthService 로 로그인 확인
     ② ProfanityFilter 로 욕설 검사
     ③ StylePalette 로 아이템·색이 맞는지 검사
     ④ MySQL style_posts 테이블에 저장
  → 저장된 글을 JSON 으로 돌려줌
```
DB 테이블은 서버가 처음 요청을 받을 때 자동으로 만들어요 (`ensureSchema()`).
