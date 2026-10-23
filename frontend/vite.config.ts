// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      // /api 요청은 백엔드(8081)로 대신 전달한다. 그래서 휴대폰·터널 주소에서도 주소 하나로 동작한다.
      // 브라우저 입장에선 같은 주소로 보낸 요청이라, 백엔드 CORS 에 걸리지 않게 Origin 헤더는 떼고 보낸다.
      proxy: { "/api": { target: "http://localhost:8081", changeOrigin: true, configure: proxy => { proxy.on("proxyReq", req => req.removeHeader("origin")); } } },
      // 임시 공개 주소(Cloudflare 터널)로 들어와도 열리게
      allowedHosts: [".trycloudflare.com"],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
