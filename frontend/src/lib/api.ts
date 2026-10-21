export const API_URL: string = import.meta.env["VITE_API_URL"] ?? "http://localhost:8081";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  // FormData 는 브라우저가 multipart 경계(boundary)를 붙이도록 Content-Type 을 직접 지정하지 않는다.
  const headers: HeadersInit = init.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    // 서버가 { error: "..." } 로 이유를 보내 주면 그 문장을 그대로 보여준다.
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `API ${res.status}: ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// 사용 예: const { message } = await api<{ message: string }>("/api/hello");
