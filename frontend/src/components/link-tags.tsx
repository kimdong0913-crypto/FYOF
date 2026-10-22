import { useState, type MouseEvent } from "react";
import { ExternalLink, Tag, Trash2 } from "lucide-react";

// 사진 속 아이템 구매처 태그. x·y 는 사진 위 위치(0~100%), 사진 없이 목록으로만 달면 null.
export type LinkTag = { label: string; url: string; domain?: string; x: number | null; y: number | null };
export const MAX_LINKS = 5;

export const domainOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
export const isValidUrl = (url: string) => /^https?:\/\//i.test(url.trim()) && domainOf(url.trim()).includes(".");

// 밖으로 나가는 링크: 새 탭 + 작성자가 단 링크라는 표시(ugc, nofollow)
const external = { target: "_blank", rel: "noopener noreferrer nofollow ugc" } as const;

/** 태그가 달린 사진. 점을 누르면 아이템 이름과 사이트 주소, 구매처 링크가 뜬다. */
export function TaggedPhoto({ src, alt, links, className }: { src: string; alt: string; links: LinkTag[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const placed = links.map((l, i) => ({ ...l, n: i + 1 })).filter(l => l.x !== null && l.y !== null);
  return <div className={`tagged-photo ${className ?? ""}`}>
    <img src={src} alt={alt} loading="lazy"/>
    {placed.map(l => <span key={l.n} className="tag-pin-wrap" style={{ left: `${l.x}%`, top: `${l.y}%` }}>
      <button type="button" className={`tag-pin ${open === l.n ? "open" : ""}`} aria-label={`${l.label} 구매처 보기`} aria-expanded={open === l.n} onClick={() => setOpen(o => (o === l.n ? null : l.n))}>{l.n}</button>
      {open === l.n && <span className={`tag-pop ${(l.x ?? 0) > 60 ? "left" : ""}`}><strong>{l.label}</strong><small>{l.domain || domainOf(l.url)}</small><a href={l.url} {...external}>구매처 열기 <ExternalLink size={12}/></a></span>}
    </span>)}
    {links.length > 0 && <span className="tag-count"><Tag size={12}/> {links.length}</span>}
  </div>;
}

/** 사진 아래(또는 사진 없는 글)에 보여주는 태그 목록 */
export function LinkList({ links }: { links: LinkTag[] }) {
  if (links.length === 0) return null;
  return <ul className="link-list" aria-label="구매처 링크">{links.map((l, i) => <li key={i}>
    <span className="link-no">{i + 1}</span><span className="link-label">{l.label}</span>
    <a href={l.url} {...external}>{l.domain || domainOf(l.url)} <ExternalLink size={11}/></a>
  </li>)}</ul>;
}

/** 올릴 때 태그 달기: 사진을 누르면 그 자리에 점이 생기고, 이름과 링크를 적는다. */
export function LinkTagEditor({ src, links, onChange }: { src: string | null; links: LinkTag[]; onChange: (l: LinkTag[]) => void }) {
  const full = links.length >= MAX_LINKS;
  const add = (x: number | null, y: number | null) => { if (!full) onChange([...links, { label: "", url: "", x, y }]); };
  const place = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    add(Math.round((e.clientX - r.left) / r.width * 100), Math.round((e.clientY - r.top) / r.height * 100));
  };
  const update = (i: number, patch: Partial<LinkTag>) => onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return <div className="tag-editor">
    {src && <div className={`tag-editor-photo ${full ? "full" : ""}`} onClick={place} role="button" tabIndex={-1} aria-label="사진을 눌러 구매처 태그 추가">
      <img src={src} alt="태그를 달 사진"/>
      {links.map((l, i) => l.x !== null && l.y !== null && <span key={i} className="tag-pin static" style={{ left: `${l.x}%`, top: `${l.y}%` }}>{i + 1}</span>)}
    </div>}
    <p className="tag-hint"><Tag size={12}/> {src ? (full ? `태그는 ${MAX_LINKS}개까지예요.` : "사진에서 아이템을 누르면 구매처 태그를 달 수 있어요.") : "구매처 링크를 달 수 있어요."}</p>
    {links.map((l, i) => {
      const bad = l.url.trim() !== "" && !isValidUrl(l.url);
      return <div key={i} className="tag-row">
        <span className="link-no">{i + 1}</span>
        <input className="vote-input" aria-label={`태그 ${i + 1} 아이템 이름`} maxLength={40} placeholder="아이템 이름 (예: 브라운 무스탕)" value={l.label} onChange={e => update(i, { label: e.target.value })}/>
        <input className={`vote-input ${bad ? "invalid" : ""}`} aria-label={`태그 ${i + 1} 구매 링크`} maxLength={500} placeholder="https://… 구매한 곳 링크" value={l.url} onChange={e => update(i, { url: e.target.value })}/>
        <button type="button" className="tag-remove" aria-label={`태그 ${i + 1} 지우기`} onClick={() => onChange(links.filter((_, j) => j !== i))}><Trash2 size={14}/></button>
        {bad && <small className="ai-error">http:// 또는 https:// 로 시작하는 주소를 넣어 주세요.</small>}
      </div>;
    })}
    {!full && <button type="button" className="tag-add-list" onClick={() => add(null, null)}>+ {src ? "위치 없이 " : ""}링크 추가</button>}
  </div>;
}

/** 저장 전 확인: 이름과 올바른 링크가 다 있는지 */
export function linksProblem(links: LinkTag[]) {
  const i = links.findIndex(l => !l.label.trim() || !isValidUrl(l.url));
  return i < 0 ? null : `${i + 1}번 태그의 아이템 이름과 링크(https://…)를 확인해 주세요.`;
}
