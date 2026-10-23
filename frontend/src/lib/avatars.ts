import { useEffect, useSyncExternalStore } from "react";
import { API_URL, api } from "@/lib/api";

// 프로필 사진 버전 목록 (사용자 번호 -> 버전). 한 번 받아 두고 여러 화면이 같이 쓴다.
let versions: Record<string, number> = {};
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

function load(force = false) {
  if ((loaded && !force) || (loading && !force)) return loading ?? Promise.resolve();
  loading = api<Record<string, number>>("/api/avatars")
    .then(v => { versions = v; loaded = true; emit(); })
    .catch(() => { /* 서버가 꺼져 있으면 첫 글자로 보여 준다 */ })
    .finally(() => { loading = null; });
  return loading;
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

/** 이 사용자의 프로필 사진 주소. 사진이 없으면 null. */
export function useAvatarUrl(userId: number | null | undefined): string | null {
  useEffect(() => { void load(); }, []);
  const v = useSyncExternalStore(subscribe, () => (userId ? versions[String(userId)] ?? 0 : 0), () => 0);
  return userId && v ? `${API_URL}/api/avatars/${userId}?v=${v}` : null;
}

export async function uploadAvatar(image: Blob) {
  const form = new FormData();
  form.append("image", image, "avatar.jpg");
  const saved = await api<{ userId: number; version: number }>("/api/avatars/me", { method: "PUT", body: form });
  versions = { ...versions, [String(saved.userId)]: saved.version };
  emit();
}

export async function removeAvatar(userId: number) {
  await api<void>("/api/avatars/me", { method: "DELETE" });
  const { [String(userId)]: _, ...rest } = versions;
  versions = rest;
  emit();
}
