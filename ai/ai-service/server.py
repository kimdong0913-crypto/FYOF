"""FASHN VTON 추론 서버 (FastAPI). Spring Boot 백엔드가 호출한다.

실행: fashn-vton-1.5 의 .venv 파이썬으로 이 폴더에서
  python -m uvicorn server:app --port 8000
"""
import io
import os
import threading
from pathlib import Path
from typing import Literal

from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image, ImageOps

import json

import torch

from fashn_vton import TryOnPipeline
from fashn_vton.tryon_mmdit import TryOnModel

WEIGHTS_DIR = Path(os.environ.get("VTON_WEIGHTS", Path(__file__).resolve().parent.parent / "fashn-vton-1.5" / "weights"))
MAX_SIDE = int(os.environ.get("VTON_MAX_SIDE", "1280"))  # CPU 에서 너무 큰 입력은 줄여서 처리

_ST_DTYPES = {"BF16": torch.bfloat16, "F16": torch.float16, "F32": torch.float32, "F64": torch.float64,
              "I64": torch.int64, "I32": torch.int32, "I16": torch.int16, "I8": torch.int8, "U8": torch.uint8, "BOOL": torch.bool}


def _setup_tryon_model_low_mem(self):
    """원본은 가중치 전체(~2GB)를 메모리에 올린 뒤 복사해서 RAM 이 적은 PC 에서 죽는다.
    텐서를 하나씩 읽어 모델 파라미터에 바로 복사해 최대 메모리 사용량을 줄인다."""
    model_path = os.path.join(self.weights_dir, "model.safetensors")
    self.logger.info(f"Loading TryOnModel (low-mem) from {model_path}")
    self.tryon_model = TryOnModel()
    params = self.tryon_model.state_dict()
    loaded = set()
    # safetensors 의 get_tensor 는 파일 전체를 private mmap 해서 Windows 에서 파일 크기만큼 커밋 메모리를 잡는다.
    # 포맷(8바이트 헤더 길이 + JSON 헤더 + 원시 데이터)을 직접 읽어 텐서 하나 크기만 쓰도록 한다.
    with torch.no_grad(), open(model_path, "rb") as f:
        header_len = int.from_bytes(f.read(8), "little")
        header = json.loads(f.read(header_len))
        base = 8 + header_len
        for key, info in header.items():
            if key == "__metadata__":
                continue
            if key not in params:
                raise KeyError(f"Unexpected key in checkpoint: {key}")
            start, end = info["data_offsets"]
            f.seek(base + start)
            data = bytearray(f.read(end - start))
            tensor = torch.frombuffer(data, dtype=_ST_DTYPES[info["dtype"]]).reshape(info["shape"]) if data else torch.empty(info["shape"], dtype=_ST_DTYPES[info["dtype"]])
            params[key].copy_(tensor)
            loaded.add(key)
    missing = set(params) - loaded
    if missing:
        raise KeyError(f"Missing keys in checkpoint: {sorted(missing)[:5]}")
    self.tryon_model.to(self.device, dtype=self.inference_dtype).eval()
    self.logger.info("TryOnModel loaded")


TryOnPipeline._setup_tryon_model = _setup_tryon_model_low_mem

_pipeline: TryOnPipeline | None = None
_lock = threading.Lock()  # 모델은 한 번에 한 요청만 처리


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _pipeline
    _pipeline = TryOnPipeline(weights_dir=str(WEIGHTS_DIR))
    yield


app = FastAPI(title="FASHN VTON service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"ready": _pipeline is not None}


def read_image(upload: UploadFile) -> Image.Image:
    try:
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(upload.file.read()))).convert("RGB")
    except Exception:
        raise HTTPException(400, f"이미지를 읽을 수 없습니다: {upload.filename}")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    return img


@app.post("/tryon")
def tryon(
    person: UploadFile = File(...),
    garment: UploadFile = File(...),
    category: Literal["tops", "bottoms", "one-pieces"] = Form("bottoms"),
    garment_photo_type: Literal["model", "flat-lay"] = Form("model"),
    num_timesteps: int = Form(10),
    seed: int = Form(42),
):
    if _pipeline is None:
        raise HTTPException(503, "모델을 불러오는 중입니다.")
    person_img, garment_img = read_image(person), read_image(garment)
    with _lock:
        result = _pipeline(
            person_image=person_img,
            garment_image=garment_img,
            category=category,
            garment_photo_type=garment_photo_type,
            num_timesteps=num_timesteps,
            seed=seed,
        )
    buf = io.BytesIO()
    result.images[0].save(buf, format="PNG")
    return Response(buf.getvalue(), media_type="image/png")
