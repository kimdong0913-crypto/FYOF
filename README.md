# FYOF 2차 프로젝트

TEAM07 소상공인 프로젝트 FYOF(AI 가상 피팅)를 이어서 보완하는 폴더.
1차 발표(2026-10-13) 때 GCP VM에서 돌리던 코드를 그대로 가져왔다.

## 폴더 구성

| 폴더 | 내용 | 기술 |
|---|---|---|
| `frontend/` | 웹 화면 | React + Vite (Node.js 24) |
| `backend-demo/` | API 서버 | Spring Boot (Java 21, Gradle), 포트 8081 |
| `ai/ai-service/` | 가상 피팅 추론 서버 (`server.py`) | FastAPI, 포트 8000 |
| `ai/fashn-vton-1.5/` | 피팅 모델 코드 ([fashn-AI/fashn-vton-1.5](https://github.com/fashn-AI/fashn-vton-1.5)) | PyTorch |
| `docs/` | 기술구성 PDF, 공부정리, 발표 대본, VM 명령어 기록 | |

> 폴더 이름(`backend-demo`, `fashn-vton-1.5`)은 코드 안에서 경로로 쓰고 있어서 원래대로 뒀다.

## 따로 만들어야 하는 설정 파일 (git에 안 올라감)

- `frontend/.env`
  ```
  VITE_API_URL=http://<백엔드 주소>:8081
  ```
- `backend-demo/db.properties` (`db.properties.example` 참고)
  ```
  spring.datasource.url=jdbc:mysql://<DB 주소>:3306/fyof?createDatabaseIfNotExist=true&characterEncoding=UTF-8&serverTimezone=UTC
  DB_USER=root
  DB_PASSWORD=...
  app.cors.origins=http://<프론트 주소>:8080,http://localhost:*
  ```

## 다시 설치해야 하는 것

| 무엇 | 명령 (해당 폴더에서) |
|---|---|
| 프론트 패키지 (`node_modules`) | `npm install` |
| AI 파이썬 환경 (`.venv`) | `python3 -m venv .venv` → `.venv/bin/pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu` → `.venv/bin/pip install -e .` → `.venv/bin/pip install onnxruntime fastapi "uvicorn[standard]" python-multipart` |
| AI 모델 가중치 (2.2GB) | `.venv/bin/python scripts/download_weights.py --weights-dir ./weights` |

## 실행 (VM에서 쓰던 명령)

```bash
# AI 서버 (켜지는 데 1~2분)
cd ai/ai-service && nohup ../fashn-vton-1.5/.venv/bin/python -m uvicorn server:app --port 8000 > ~/ai.log 2>&1 &

# 백엔드
cd backend-demo && chmod +x gradlew && nohup ./gradlew bootRun > ~/backend.log 2>&1 &

# 프론트 (외부 접속용)
cd frontend && nohup npm run dev -- --host 0.0.0.0 --port 8080 --strictPort > ~/frontend.log 2>&1 &
```

확인:
```bash
curl localhost:8081/api/hello   # 백엔드
curl localhost:8000/health      # AI → {"ready":true}
```

## 1차 때 알게 된 것

- 피팅 1회 약 7분 반 (CPU, 16코어). `server.py`의 `num_timesteps`를 20 → 10으로 줄여서 썼다.
- AI 서버는 메모리를 많이 써서 VM에 swap 8GB를 붙였다.
- VM 외부 IP가 바뀌면 `frontend/.env`의 `VITE_API_URL`과 `db.properties`의 `app.cors.origins`를 같이 바꿔야 한다.
- 방화벽: 8080(프론트), 8081(백엔드)만 열었다. 8000(AI)은 외부 차단.
- 1차 때 못 한 것: 나만의 옷장, 데님 외 옷 추가, 실시간 AI 피팅. 투표 버그(다른 사람이 누르면 내 하트가 취소됨).

## 2차에서 추가한 것

- 상품 6개 카테고리 18종 (사진 없는 상품은 회색 자리표시)
- 로그인: 아이디·비밀번호 (BCrypt 암호화, 30일 토큰). `users`, `sessions` 테이블
- 나만의 옷장 `/closet`: 찜한 상품 + 저장한 피팅 결과 (`closet_items`, `closet_fits`)
- 커뮤니티: 로그인한 사람만 글·투표·신고, 내 글 수정·삭제, 욕설 필터, 신고 3회 숨김, 패셔니스타 뱃지·순위
- STYLE DATA: 커뮤니티 색조합 글로 실제 집계 (`/api/style-posts/stats`), 데님 색 → 어울리는 상의·신발 색 → 같은 색 상품 추천
- 테이블은 백엔드가 처음 요청을 받을 때 자동으로 만든다 (1차 DB 에는 없는 칸만 덧붙임)

## GCP

1차 프로젝트(`<GCP-프로젝트-ID>`)는 2026-10-14에 삭제했다. 11/13쯤까지는 복구할 수 있다.
```bash
gcloud auth login
gcloud projects undelete <GCP-프로젝트-ID>
# 그다음 결제 계정 다시 연결
```
