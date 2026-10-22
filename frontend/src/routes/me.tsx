import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { api } from "@/lib/api";
import { useUser } from "@/lib/session";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [{ title: "내 페이지 — FYOF" }] }),
  component: Me,
});

// 내 사용자 번호를 물어보고 내 프로필(/u/번호)로 보낸다. 로그인하지 않았으면 로그인으로.
function Me() {
  const user = useUser();
  const navigate = useNavigate();
  const [message, setMessage] = useState("내 페이지로 이동하는 중…");
  useEffect(() => {
    if (!user) { void navigate({ to: "/login", search: { redirect: "/me" }, replace: true }); return; }
    api<{ id: number }>("/api/auth/me")
      .then(me => navigate({ to: "/u/$id", params: { id: String(me.id) }, replace: true }))
      .catch(() => setMessage("서버에 연결할 수 없습니다."));
  }, [user, navigate]);
  return <><SiteHeader/><main className="profile-page wrap"><section className="empty-results"><h2>{message}</h2></section></main><SiteFooter/></>;
}
