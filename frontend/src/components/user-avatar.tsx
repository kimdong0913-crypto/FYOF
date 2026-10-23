import { useAvatarUrl } from "@/lib/avatars";

/** 프로필 사진 (없으면 닉네임 첫 글자) */
export function UserAvatar({ userId, nickname, className = "user-avatar" }: { userId: number | null | undefined; nickname: string; className?: string }) {
  const url = useAvatarUrl(userId);
  return <span className={className} aria-hidden="true">{url ? <img src={url} alt=""/> : nickname.slice(0, 1)}</span>;
}
