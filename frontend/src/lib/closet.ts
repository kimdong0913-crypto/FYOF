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

/** 여러 벌을 한 번에 담거나(on) 뺀다. 먼저 화면에 반영하고, 실패한 것만 되돌린다. */
export async function setManySaved(productIds: string[], on: boolean) {
  const targets = productIds.filter(id => saved.has(id) !== on);
  if (targets.length === 0) return;
  const next = new Set(saved);
  targets.forEach(id => (on ? next.add(id) : next.delete(id)));
  saved = next; emit();
  const results = await Promise.allSettled(targets.map(id => api<void>(`/api/closet/items/${id}`, { method: on ? "PUT" : "DELETE" })));
  const failed = targets.filter((_, i) => results[i]!.status === "rejected");
  if (failed.length) {
    const undo = new Set(saved);
    failed.forEach(id => (on ? undo.delete(id) : undo.add(id)));
    saved = undo; emit();
    throw new Error(`${failed.length}벌은 바꾸지 못했어요.`);
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
