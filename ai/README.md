# ai – 사진 가상 피팅 AI

내 사진 + 옷 사진을 받아서 **옷을 입힌 사진**을 만들어 주는 부분이에요. 백엔드(`TryOnController.java`)가 여기로 사진을 보내요.

| 폴더·파일 | 역할 |
|---|---|
| `ai-service/server.py` | **우리가 만든 AI 서버 (Python FastAPI, 포트 8000).** 사진을 받아서 모델을 돌리고 결과 이미지를 돌려줌. 계산 단계를 20 → 10으로 줄여 속도를 높임 |
| `fashn-vton-1.5/` | 가상 피팅 오픈소스 모델 코드 ([fashn-AI/fashn-vton-1.5](https://github.com/fashn-AI/fashn-vton-1.5)). 직접 만든 게 아니라 가져와서 사용 |

## 흐름
```
백엔드 → POST :8000/tryon (사람 사진, 옷 사진, 상의/하의 종류)
  → server.py 가 FASHN VTON 모델 실행 (CPU 기준 약 7분)
  → 옷을 입힌 PNG 이미지를 돌려줌
```

## 참고
- 모델 가중치 파일(2.2GB)은 깃에 안 올라가요. `fashn-vton-1.5/scripts/download_weights.py`로 받아요.
- 실시간 카메라 피팅은 이 폴더가 아니라 외부 서비스(Decart API)를 써요 → `backend-demo/LiveTryOnController.java`, `frontend/src/components/live-tryon.tsx`
