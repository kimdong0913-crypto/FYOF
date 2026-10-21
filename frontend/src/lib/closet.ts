import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { useUser } from "@/lib/session";

// 찜한 상품 id 목록. 상품 상세의 하트와 옷장 페이지가 같은 목록을 본다.
let saved: ReadonlySet<string> = new Set();
let loadedFor: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const empty: ReadonlySet<string> = new Set();

export async function refreshCloset() {
  const closet = await api<{ items: { productId: string }[] }>("/api/closet");
  saved = new Set(closet.items.map(i => i.productId));
  emit();
}

export async function toggleSaved(productId: string) {
  const next = new Set(saved);
  const wasSaved = next.has(productId);
  if (wasSaved) next.delete(productId); else next.add(productId);
  saved = next; emit(); // 먼저 화면에 반영하고, 실패하면 되돌린다
  try {
    await api<void>(`/api/closet/items/${productId}`, { method: wasSaved ? "DELETE" : "PUT" });
  } catch (e) {
    const undo = new Set(saved);
    if (wasSaved) undo.add(productId); else undo.delete(productId);
    saved = undo; emit();
    throw e;
  }
}

/** 로그인한 사용자의 찜 목록. 로그인하지 않았으면 빈 목록. */
export function useSavedItems(): ReadonlySet<string> {
  const user = useUser();
  useEffect(() => {
    if (!user) { saved = new Set(); loadedFor = null; emit(); return; }
    if (loadedFor === user.username) return;
    loadedFor = user.username;
    refreshCloset().catch(() => { loadedFor = null; });
  }, [user]);
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => saved, () => empty);
}
