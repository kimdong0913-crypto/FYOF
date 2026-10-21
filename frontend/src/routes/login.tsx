import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { errorText, login, signup } from "@/lib/api";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({ redirect: typeof search["redirect"] === "string" && search["redirect"].startsWith("/") ? search["redirect"] : "/" }),
  head: () => ({ meta: [{ title: "로그인 — FORME" }, { name: "description", content: "로그인하고 나만의 옷장과 커뮤니티를 이용하세요." }] }),
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "signup") {
      if (!/^[a-z0-9_]{4,20}$/.test(username.trim().toLowerCase())) { setError("아이디는 영문 소문자·숫자·_ 로 4~20자예요."); return; }
      if (password.length < 8) { setError("비밀번호는 8자 이상이어야 해요."); return; }
      if (password !== password2) { setError("비밀번호 확인이 맞지 않아요."); return; }
      if (!nickname.trim()) { setError("닉네임을 정해 주세요."); return; }
    }
    setSending(true);
    try {
      if (mode === "login") await login(username, password);
      else await signup(username, password, nickname);
      // redirect 는 "/results?q=..." 처럼 검색어가 붙을 수 있어 주소 그대로 이동한다.
      await navigate({ href: redirect });
    } catch (err) {
      setError(errorText(err, "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."));
    } finally { setSending(false); }
  };

  return <><SiteHeader/><main className="auth-page wrap">
    <div className="page-breadcrumb">ACCOUNT <span>/</span> {mode === "login" ? "LOGIN" : "SIGN UP"}</div>
    <div className="auth-layout">
      <div className="auth-intro"><span className="eyebrow">FORME ACCOUNT / 001</span><h1>{mode === "login" ? "WELCOME BACK" : "JOIN FORME"}<span className="heading-period">.</span></h1><p>로그인하면 찜한 상품과 피팅 결과를 나만의 옷장에 모아 두고,<br/>커뮤니티에 조합을 올리고 투표할 수 있어요.</p></div>
      <form className="auth-form" onSubmit={submit}>
        <div className="vote-category" role="tablist">
          <Button type="button" role="tab" aria-selected={mode === "login"} variant="outline" className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>로그인</Button>
          <Button type="button" role="tab" aria-selected={mode === "signup"} variant="outline" className={mode === "signup" ? "selected" : ""} onClick={() => { setMode("signup"); setError(""); }}>회원가입</Button>
        </div>
        <label className="vote-label" htmlFor="auth-username">아이디</label>
        <input id="auth-username" className="vote-input" autoComplete="username" maxLength={20} value={username} onChange={e => setUsername(e.target.value)} placeholder={mode === "signup" ? "영문 소문자·숫자 4~20자" : ""}/>
        <label className="vote-label" htmlFor="auth-password">비밀번호</label>
        <input id="auth-password" type="password" className="vote-input" autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={64} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "signup" ? "8자 이상" : ""}/>
        {mode === "signup" && <>
          <label className="vote-label" htmlFor="auth-password2">비밀번호 확인</label>
          <input id="auth-password2" type="password" className="vote-input" autoComplete="new-password" maxLength={64} value={password2} onChange={e => setPassword2(e.target.value)}/>
          <label className="vote-label" htmlFor="auth-nickname">닉네임 (커뮤니티에 보여요)</label>
          <input id="auth-nickname" className="vote-input" maxLength={12} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="1~12자"/>
        </>}
        {error && <p className="ai-error" role="alert">{error}</p>}
        <Button type="submit" className="vote-submit" disabled={sending}>{sending ? "잠시만요…" : mode === "login" ? "로그인" : "가입하고 시작하기"} <ArrowUpRight size={16}/></Button>
        <Link to="/" className="auth-back">홈으로 돌아가기</Link>
      </form>
    </div>
  </main><SiteFooter/></>;
}
