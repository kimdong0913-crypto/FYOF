import { getToken, setSession } from "@/lib/session";

// 기본은 같은 주소의 /api (개발 서버가 백엔드로 전달, vite.config.ts). 따로 둔 서버를 쓰려면 VITE_API_URL 을 지정한다.
export const API_URL: string = import.meta.env["VITE_API_URL"] ?? "";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  // FormData 는 브라우저가 multipart 경계(boundary)를 붙이도록 Content-Type 을 직접 지정하지 않는다.
  const headers: Record<string, string> = init.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && token) setSession(null); // 토큰이 만료됐으면 로그아웃 상태로
  if (!res.ok) {
    // 서버가 { error: "..." } 로 이유를 보내 주면 그 문장을 그대로 보여준다.
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `API ${res.status}: ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** 로그인이 필요한 이미지(옷장 피팅 결과)를 받아 화면에 쓸 수 있는 주소로 바꾼다. */
export async function apiImage(path: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error("이미지를 불러오지 못했습니다.");
  return URL.createObjectURL(await res.blob());
}

/** 글 사진 주소. 사진을 바꾼 뒤 브라우저 캐시를 피하려고 v 를 붙인다. */
export const photoUrl = (id: number, v = 0) => `${API_URL}/api/style-posts/${id}/photo${v ? `?v=${v}` : ""}`;

/** 화면에 보여줄 에러 문장. 서버가 보낸 이유가 있으면 그걸, 없으면 fallback. */
export const errorText = (e: unknown, fallback: string) =>
  e instanceof Error && !e.message.startsWith("API ") && e.message !== "Failed to fetch" ? e.message : fallback;

export type AuthUser = { username: string; nickname: string };

export async function login(username: string, password: string) {
  const s = await api<{ token: string; user: AuthUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  setSession(s);
}

export async function signup(username: string, password: string, nickname: string) {
  const s = await api<{ token: string; user: AuthUser }>("/api/auth/signup", { method: "POST", body: JSON.stringify({ username, password, nickname }) });
  setSession(s);
}

export async function logout() {
  try { await api<void>("/api/auth/logout", { method: "POST" }); } catch { /* 서버가 꺼져 있어도 이 브라우저에서는 로그아웃 */ }
  setSession(null);
}

// 사용 예: const { message } = await api<{ message: string }>("/api/hello");
