/** 올리기 전에 사진을 긴 변 max px 의 JPEG 로 줄인다. 휴대폰 원본(5~10MB)을 수백 KB 로 만든다. */
export async function shrinkImage(file: File, max = 1080, quality = 0.86): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("사진 파일만 올릴 수 있어요.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("사진을 처리하지 못했어요.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("사진을 처리하지 못했어요.");
  return blob;
}

/** 프로필 사진용: 가운데를 정사각형으로 잘라 size px JPEG 로 만든다. */
export async function squareImage(file: File, size = 400, quality = 0.88): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("사진 파일만 올릴 수 있어요.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(size, side);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("사진을 처리하지 못했어요.");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("사진을 처리하지 못했어요.");
  return blob;
}
