import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Heart, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Comments } from "@/components/comments";
import { LinkList, TaggedPhoto, type LinkTag } from "@/components/link-tags";
import { OutfitPieces } from "@/components/outfit-card";
import { TierBadge } from "@/components/tier-badge";
import { UserAvatar } from "@/components/user-avatar";
import { api, photoUrl } from "@/lib/api";
import { itemById } from "@/lib/catalog";
import { likeBurst } from "@/lib/like-burst";
import type { Outfit } from "@/lib/outfit";

/** 게시물 창에 필요한 글 정보 (글 목록 API 가 주는 모양) */
export type ModalPost = {
  id: number; item: string; category: "OUTFIT" | "TIP"; title: string; colors: string[]; comment: string; createdAt: string;
  outfit: Outfit | null; votes: number; voted: boolean; mine: boolean; hasPhoto: boolean; links: LinkTag[];
  nickname?: string; authorUserId?: number | null; authorTier?: number;
};

/** 좋아요 누르기/취소 (서버가 바뀐 개수와 내 상태를 돌려준다) */
export const toggleVote = (postId: number) => api<{ votes: number; voted: boolean }>(`/api/style-posts/${postId}/vote`, { method: "POST" });

/** 게시물을 크게 보는 창. 코디 구성의 아이템을 누르면 그 아이템의 스타일 가이드로 간다. */
export function PostModal({ post, onClose, onVote, error }: { post: ModalPost; onClose: () => void; onVote: () => void; error?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const item = itemById(post.item);
  return <div className="feed-modal" role="dialog" aria-modal="true" aria-label={post.title} onClick={onClose}>
    <div className="feed-modal-card" onClick={e => e.stopPropagation()}>
      <button type="button" className="feed-close" aria-label="닫기" onClick={onClose}><X size={18}/></button>
      <div className="feed-modal-media">{post.hasPhoto ? <TaggedPhoto src={photoUrl(post.id)} alt={post.title} links={post.links}/>
        : post.category === "OUTFIT" ? <span className="feed-colors">{post.colors.map((c, i) => <i key={i} style={{ background: c }}/>)}</span>
        : <span className="feed-tip"><Lightbulb size={24}/></span>}</div>
      <div className="feed-modal-info">
        <span className="eyebrow">{post.category === "OUTFIT" ? "OUTFIT" : "TIP"} · {new Date(post.createdAt).toLocaleDateString("ko-KR")}</span>
        <h2>{post.title}</h2>
        {post.nickname && <span className="modal-author">
          <UserAvatar userId={post.authorUserId} nickname={post.nickname}/>
          {post.authorUserId ? <Link to="/u/$id" params={{ id: String(post.authorUserId) }} onClick={onClose}>{post.nickname}</Link> : post.nickname}
          <TierBadge tier={post.authorTier ?? 0}/>
        </span>}
        {post.outfit && <>
          <small className="modal-hint">코디 구성 · 아이템을 누르면 스타일 가이드로 가요</small>
          <OutfitPieces outfit={post.outfit} highlight={post.item}/>
        </>}
        {!post.outfit && item && <Link to="/item/$id" params={{ id: post.item }} className="inline-link">{item.name} 스타일 가이드 보기</Link>}
        {post.comment && <p>{post.comment}</p>}
        <LinkList links={post.links}/>
        <Button variant="outline" className={post.voted ? "vote-button voted" : "vote-button"} aria-pressed={post.voted} onClick={e => { likeBurst(e.currentTarget, !post.voted); onVote(); }}><Heart size={15} fill={post.voted ? "currentColor" : "none"}/><strong key={post.votes} className="like-count">{post.votes}</strong></Button>
        {post.mine && <small className="vote-form-note">내 글에는 추천할 수 있지만 순위에는 들어가지 않아요.</small>}
        {error && <p className="ai-error">{error}</p>}
        <Comments key={post.id} postId={post.id} onNavigate={onClose}/>
      </div>
    </div>
  </div>;
}
