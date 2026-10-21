export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8081";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData 는 브라우저가 multipart 경계(boundary)를 붙이도록 Content-Type 을 직접 지정하지 않는다.
  const headers = init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}${path}`, { headers, ...init });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// 사용 예: const { message } = await api<{ message: string }>("/api/hello");
