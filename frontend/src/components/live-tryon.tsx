import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Camera, Loader2, Square } from "lucide-react";
import type { RealTimeClient } from "@decartai/sdk";
import { Button } from "@/components/ui/button";
import { api, errorText } from "@/lib/api";
import { useUser } from "@/lib/session";

type Status = { enabled: boolean; maxSeconds: number; left: number };
type State = "checking" | "off" | "idle" | "connecting" | "live" | "ended" | "error";

const MODEL = "lucy-vton-latest";

/** 서버가 세션을 끊은 이유를 사용자 문장으로 */
const endReason = (reason: string) =>
  reason === "session_limit" ? "체험 시간이 끝났어요."
  : reason === "insufficient_credits" ? "AI 크레딧이 다 떨어졌어요. 관리자에게 알려 주세요."
  : reason === "moderation_violation" || reason === "policy_violation" ? "AI 정책에 맞지 않는 화면이라 멈췄어요."
  : "AI 연결이 끝났어요.";

/**
 * 카메라 실시간 AI 피팅. 시작하면 백엔드에서 짧은 토큰을 받아 Decart 와 WebRTC 로 연결하고,
 * 내 카메라 영상에 garment 사진의 옷을 입혀 돌려받는다. 요금이 초 단위라 maxSeconds 가 지나면 끊는다.
 */
export function LiveTryOn({ prompt, garment, label }: { prompt: string; garment: () => Promise<Blob>; label: string }) {
  const user = useUser();
  const location = useLocation();
  const [status, setStatus] = useState<Status | null>(null);
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("");
  const [seconds, setSeconds] = useState(0);
  const output = useRef<HTMLVideoElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const client = useRef<RealTimeClient | null>(null);
  const camera = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    api<Status>("/api/live-tryon")
      .then(s => { setStatus(s); setState(s.enabled ? "idle" : "off"); })
      .catch(() => setState("off"));
  }, [user?.username]);

  const stop = (next: State = "ended", text = "") => {
    if (timer.current !== null) { window.clearInterval(timer.current); timer.current = null; }
    try { client.current?.disconnect(); } catch { /* 이미 끊김 */ }
    client.current = null;
    camera.current?.getTracks().forEach(t => t.stop());
    camera.current = null;
    if (output.current) output.current.srcObject = null;
    if (preview.current) preview.current.srcObject = null;
    setState(next); setMessage(text);
  };
  // 페이지를 떠나면 카메라와 AI 연결을 꼭 끊는다 (안 끊으면 요금이 계속 나간다)
  useEffect(() => () => stop(), []);
  // 옷을 바꾸면 진행 중인 세션은 끝낸다
  useEffect(() => { if (client.current) stop(); }, [prompt]);

  const start = async () => {
    setState("connecting"); setMessage("");
    try {
      const { createDecartClient, models } = await import("@decartai/sdk");
      const model = models.realtime(MODEL);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: model.width }, height: { ideal: model.height } } });
      camera.current = stream;
      if (preview.current) preview.current.srcObject = stream;
      const [image, token] = await Promise.all([garment(), api<{ apiKey: string; maxSeconds: number; left: number }>("/api/live-tryon/token", { method: "POST" })]);
      setStatus(s => s && { ...s, left: token.left });
      const rt = await createDecartClient({ apiKey: token.apiKey }).realtime.connect(stream, {
        model,
        onRemoteStream: remote => { if (output.current) output.current.srcObject = remote; },
        initialState: { prompt: { text: prompt, enhance: false }, image },
      });
      if (!camera.current) { rt.disconnect(); return; } // 연결 중에 멈춤을 눌렀다
      client.current = rt;
      rt.on("sessionEnded", e => stop("ended", endReason(e.reason)));
      rt.on("error", e => stop("error", e.message || "AI 연결 중 오류가 났어요."));
      setState("live");
      setSeconds(token.maxSeconds);
      timer.current = window.setInterval(() => setSeconds(s => {
        if (s <= 1) { stop("ended", "체험 시간이 끝났어요."); return 0; }
        return s - 1;
      }), 1000);
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "NotFoundError");
      stop("error", denied ? "카메라를 쓸 수 없어요. 브라우저에서 카메라 권한을 허용해 주세요." : errorText(e, "실시간 AI 피팅을 시작하지 못했어요."));
    }
  };

  const busy = state === "connecting" || state === "live";
  return <div className="live-tryon">
    <div className="live-stage">
      <video ref={output} className={state === "live" ? "live-output visible" : "live-output"} autoPlay playsInline muted/>
      <video ref={preview} className={state === "connecting" ? "live-preview visible" : "live-preview"} autoPlay playsInline muted/>
      {state === "live" && <span className="live-badge"><i/> LIVE · {seconds}초</span>}
      {state === "connecting" && <span className="live-center"><Loader2 size={28} className="spin"/>AI에 연결하는 중…</span>}
      {!busy && <span className="live-center"><Camera size={34} strokeWidth={1}/>
        {state === "checking" ? "확인하는 중…"
          : state === "off" ? "실시간 AI 피팅은 준비 중이에요."
          : state === "ended" && message ? message : `카메라를 켜면 ${label}을(를) 실시간으로 입혀 드려요.`}
      </span>}
    </div>
    <div className="live-actions">
      {state === "live" || state === "connecting"
        ? <Button variant="outline" onClick={() => stop()}><Square size={15}/> 멈추기</Button>
        : !user ? <Button asChild disabled={state === "off"}><Link to="/login" search={{ redirect: location.href }}>로그인하고 입어보기</Link></Button>
        : <Button disabled={state === "off" || state === "checking" || status?.left === 0} onClick={() => void start()}><Camera size={16}/> {state === "ended" || state === "error" ? "다시 입어보기" : "카메라로 입어보기"}</Button>}
      {status?.enabled && <small>한 번에 {status.maxSeconds}초 · 오늘 {status.left}번 남음 · 상의·아우터만 바뀌어요</small>}
    </div>
    {state === "error" && message && <p className="ai-error" role="alert">{message}</p>}
  </div>;
}
