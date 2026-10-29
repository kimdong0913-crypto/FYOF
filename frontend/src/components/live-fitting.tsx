import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, X } from "lucide-react";
import { LiveTryOn } from "@/components/live-tryon";
import { api, garmentUrl, photoUrl } from "@/lib/api";
import { colorsFirst, itemById, itemsForSlot } from "@/lib/catalog";
import { fitById } from "@/lib/fits";
import { canLiveTry, livePiece, livePrompt } from "@/lib/live-tryon";
import { emptyOutfit, type Outfit } from "@/lib/outfit";
import { colorById, palette } from "@/lib/palette";

type Post = { id: number; title: string; nickname: string; authorUserId: number | null; outfit: Outfit | null; hasPhoto: boolean; hasGarment: boolean };

/** 실시간 피팅이 입힐 수 있는 아이템 (아우터 + 상의) */
const wearable = [...itemsForSlot("outer"), ...itemsForSlot("top")];

const blobOf = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("옷 사진을 불러오지 못했어요.");
  return res.blob();
};

/**
 * 가상 피팅 "실시간 AI" 탭. 게시물(postId)에서 왔으면 그 코디의 상의·아우터를, 아니면 직접 고른 아이템을 카메라에 입힌다.
 * 입힐 사진은 옷 사진 → 게시물 사진 → 아이템 기본 사진 순으로 쓴다 (옷만 찍힌 사진일수록 정확하다).
 */
export function LiveFitting({ itemId, fit, postId }: { itemId: string; fit?: string | undefined; postId?: number | undefined }) {
  const navigate = useNavigate();
  const start = itemById(itemId);
  const [piece, setPiece] = useState(() => {
    const item = start && wearable.includes(start) ? start : itemById("short-tee")!;
    return { item: item.id, color: item.colors[0] ?? "white", fit: fit && item.fits.includes(fit) ? fit : item.defaultFit ?? "" };
  });
  const [post, setPost] = useState<Post | null>(null);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    setPost(null); setPostError("");
    if (!postId) return;
    api<Post>(`/api/style-posts/${postId}`)
      .then(p => { if (canLiveTry(p.outfit)) setPost(p); else setPostError("이 게시물에는 입어 볼 상의·아우터가 없어요. 아래에서 직접 골라 주세요."); })
      .catch(() => setPostError("게시물을 불러오지 못했어요. 아래에서 직접 골라 주세요."));
  }, [postId]);

  const item = itemById(piece.item)!;
  // 게시물 코디 또는 직접 고른 한 벌로 만든 코디
  const outfit = useMemo<Outfit>(() => {
    if (post?.outfit) return post.outfit;
    const o = emptyOutfit();
    o[itemsForSlot("outer").includes(item) ? "outer" : "top"] = piece;
    return o;
  }, [post, piece, item]);
  const main = itemById(livePiece(outfit).item)!;
  const source = post ? (post.hasGarment ? "garment" : post.hasPhoto ? "photo" : "item") : "item";
  const sourceUrl = post && source === "garment" ? garmentUrl(post.id) : post && source === "photo" ? photoUrl(post.id) : main.image;
  const prompt = livePrompt(outfit);
  const clearPost = () => navigate({ to: "/fitting", search: { mode: "live", item: main.id } });

  return <div className="fitting-layout">
    <div>
      <LiveTryOn prompt={prompt} garment={() => blobOf(sourceUrl)} label={post ? `"${post.title}" 코디` : item.name}/>
      <div className="camera-under"><span>01 — REAL-TIME AI FITTING (BETA)</span><span>카메라 영상은 AI 서버(Decart)로 보내 처리하고, FYOF에는 저장하지 않아요.</span></div>
    </div>
    <aside className="fitting-controls">
      {post ? <div className="fit-control-section">
        <div className="fit-control-heading"><span>01 / 이 코디 입어보기</span><button type="button" className="live-clear" onClick={() => void clearPost()}><X size={13}/> 직접 고르기</button></div>
        <div className="fit-product"><img src={sourceUrl} alt=""/><div>
          <span>{post.authorUserId ? <Link to="/u/$id" params={{ id: String(post.authorUserId) }}>{post.nickname}</Link> : post.nickname}님의 코디</span>
          <h2>{post.title}</h2>
          <strong>{colorById(livePiece(outfit).color)?.ko} {main.name}</strong>
        </div></div>
        <p className="live-source">{source === "garment" ? "👕 작성자가 올린 옷 사진으로 입혀요. 가장 정확해요."
          : source === "photo" ? "📷 게시물 사진을 참고해서 입혀요. 옷 사진이 있는 게시물보다 덜 정확할 수 있어요."
          : "🧩 사진이 없는 게시물이라 아이템 기본 사진에 코디 색을 입혀요."}</p>
      </div> : <div className="fit-control-section">
        <span className="fit-control-heading">01 / 입어 볼 옷</span>
        {postError && <p className="ai-error">{postError}</p>}
        <div className="fit-product"><img src={item.image} alt=""/><div><span>{itemsForSlot("outer").includes(item) ? "아우터" : "상의"}</span><h2>{fitById(piece.fit) ? `${fitById(piece.fit)!.ko} ` : ""}{item.name}</h2><strong>{colorById(piece.color)?.ko}</strong></div></div>
        <label htmlFor="live-item">아이템</label>
        <div className="select-wrap live-select"><select id="live-item" value={piece.item} onChange={e => { const next = itemById(e.target.value)!; setPiece({ item: next.id, color: next.colors.includes(piece.color) ? piece.color : next.colors[0] ?? "white", fit: next.defaultFit ?? "" }); }}>
          <optgroup label="아우터">{itemsForSlot("outer").map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</optgroup>
          <optgroup label="상의">{itemsForSlot("top").map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</optgroup>
        </select><ChevronDown size={14}/></div>
        {item.fits.length > 0 && <><label>핏</label><div className="fit-row" role="radiogroup" aria-label="핏">{item.fits.map(f => <button type="button" role="radio" aria-checked={piece.fit === f} key={f} className={piece.fit === f ? "selected" : ""} title={fitById(f)?.desc} onClick={() => setPiece({ ...piece, fit: f })}>{fitById(f)?.ko}</button>)}</div></>}
        <label>색</label>
        <div className="swatch-row" role="radiogroup" aria-label="색">
          {colorsFirst(item, palette).map(c => <button type="button" role="radio" aria-checked={piece.color === c.id} key={c.id} title={c.ko} aria-label={c.ko} className={`${piece.color === c.id ? "selected" : ""} ${item.colors.includes(c.id) ? "" : "rare"}`} style={{ background: c.hex }} onClick={() => setPiece({ ...piece, color: c.id })}/>)}
          <span className="swatch-name">{colorById(piece.color)?.ko}</span>
        </div>
        <p className="live-source">커뮤니티 게시물의 <strong>"📷 이 코디 입어보기"</strong>를 누르면 그 사람의 옷을 바로 입어 볼 수 있어요.</p>
      </div>}
      <div className="fit-control-section">
        <span className="fit-control-heading">02 / 이렇게 써 보세요</span>
        <ul className="live-tips">
          <li>상반신이 화면에 다 나오게, 밝은 곳에서 정면으로 서 주세요.</li>
          <li>지금은 <strong>상의·아우터만</strong> 바뀌어요. 하의·신발은 아직 지원하지 않아요.</li>
          <li>사진으로 천천히 고화질 합성을 하고 싶으면 <strong>사진 피팅</strong> 탭을 쓰세요.</li>
        </ul>
      </div>
    </aside>
  </div>;
}
