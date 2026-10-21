import { useSyncExternalStore } from "react";

// 로그인 상태(토큰 + 사용자). 브라우저 localStorage 에 두고, 바뀌면 구독한 컴포넌트를 다시 그린다.
export type SessionUser = { username: string; nickname: string };
type Session = { token: string; user: SessionUser } | null;

const KEY = "fyof-session";
const listeners = new Set<() => void>();
let cached: Session | undefined;

function read(): Session {
  if (cached !== undefined) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    cached = raw ? JSON.parse(raw) as Session : null;
  } catch { cached = null; }
  return cached;
}

export function setSession(next: Session) {
  cached = next;
  try { if (next) localStorage.setItem(KEY, JSON.stringify(next)); else localStorage.removeItem(KEY); } catch { /* 저장 못 해도 이 탭에서는 유지 */ }
  listeners.forEach(l => l());
}

export const getToken = () => (typeof window === "undefined" ? null : read()?.token ?? null);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** 로그인한 사용자. 서버 렌더링 중이거나 로그인하지 않았으면 null. */
export function useUser(): SessionUser | null {
  return useSyncExternalStore(subscribe, () => read()?.user ?? null, () => null);
}
