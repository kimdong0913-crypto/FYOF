import { ChevronDown, CalendarCheck, Camera, Flame, Footprints, Link2, Moon, Palette, PenLine, Rainbow, Scissors, Shirt, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { LEVELS, type Achievement } from "@/lib/achievements";

// 배지 아이콘 (모양은 모두 같은 가로형 육각형)
const ICON: Record<string, LucideIcon> = {
  posts: PenLine, photo: Camera, color: Palette, colorful: Rainbow, allblack: Moon, denim: Scissors,
  outer: Shirt, shoes: Footprints, hot: Flame, links: Link2, steady: CalendarCheck,
};

// 설명 창 문구: 무엇을 하면 올라가는지
const TIP: Record<string, string> = {
  posts: "코디 글을 올릴 때마다 올라가요.",
  photo: "사진을 붙인 글을 올리면 올라가요.",
  color: "코디에 서로 다른 색을 많이 써 볼수록 올라가요. (16색 중)",
  colorful: "한 코디에 색을 4가지 이상 섞으면 1개로 세요.",
  allblack: "3칸 이상을 전부 블랙으로 맞춘 코디를 올리면 올라가요.",
  denim: "데님 팬츠·자켓·셔츠가 들어간 코디를 올리면 올라가요.",
  outer: "서로 다른 아우터를 코디에 써 볼수록 올라가요. (18종 중)",
  shoes: "서로 다른 신발을 코디에 써 볼수록 올라가요. (11종 중)",
  hot: "글 하나가 받은 추천 수가 기준이에요. 가장 많이 받은 글로 세요.",
  links: "사진에 구매 링크 태그를 달면 올라가요.",
  steady: "글을 올린 날이 하루씩 늘 때마다 올라가요. (같은 날은 1일)",
};

// 가로형 육각형 (viewBox 100 x 86)
const hex = (inset: number) => {
  const w = 100, h = 86, i = inset, k = i * 0.58;
  return [[25 + k, i], [75 - k, i], [w - i, h / 2], [75 - k, h - i], [25 + k, h - i], [i, h / 2]].map(p => p.join(",")).join(" ");
};

/** 메달 하나: 금속 테두리(빛·그늘) + 안쪽 면 + 새긴 선 + 등급 다이아 4개 + 아이콘 */
function Medal({ a }: { a: Achievement }) {
  const Icon = ICON[a.id] ?? PenLine;
  const g = `badge-${a.id}`;
  return <span className="badge-medal">
    <svg viewBox="0 0 100 86" aria-hidden="true">
      <defs>
        <linearGradient id={`${g}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--rim-hi)" }}/><stop offset=".45" style={{ stopColor: "var(--rim)" }}/>
          <stop offset=".7" style={{ stopColor: "var(--rim-lo)" }}/><stop offset="1" style={{ stopColor: "var(--rim)" }}/>
        </linearGradient>
        <linearGradient id={`${g}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--face-hi)" }}/><stop offset="1" style={{ stopColor: "var(--face-lo)" }}/>
        </linearGradient>
      </defs>
      <polygon points={hex(0)} fill={`url(#${g}-rim)`}/>
      <polygon points={hex(6)} fill="var(--rim-lo)" opacity=".55"/>
      <polygon points={hex(7.5)} fill={`url(#${g}-face)`}/>
      <polygon points={hex(12)} fill="none" stroke="var(--line)" strokeWidth=".8"/>
      <path d={`M ${25 + 4.4} 7.5 L ${75 - 4.4} 7.5 L ${100 - 7.5 - 4} 22`} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round"/>
      {[0, 1, 2, 3].map(n => { const cx = 38 + n * 8, cy = 70; return <polygon key={n} points={`${cx},${cy - 3.6} ${cx + 3.6},${cy} ${cx},${cy + 3.6} ${cx - 3.6},${cy}`}
        fill={n < a.level ? "var(--pip)" : "rgba(255,255,255,.5)"} stroke="var(--pip)" strokeWidth=".8" opacity={n < a.level ? 1 : .55}/>; })}
    </svg>
    <span className="medal-icon"><Icon size={21} strokeWidth={2}/></span>
    {/* 마우스를 올리면 빛이 한 번 지나간다 (육각형 틀 안에서만) */}
    {a.level > 0 && <span className="medal-clip"><span className="medal-shine-hover"/></span>}
    {a.level === 4 && <><span className="medal-pearl"/><i className="spark s1"/><i className="spark s2"/><i className="spark s3"/></>}
  </span>;
}

/** 배지 설명 창: 무엇을 하면 올라가는지, 다음 등급까지 얼마 남았는지, 전체 단계 */
function BadgeTip({ a, x, y }: { a: Achievement; x: number; y: number }) {
  const lv = a.level > 0 ? LEVELS[a.level - 1]! : null;
  const nextLv = a.level < 4 ? LEVELS[a.level]! : null;
  const left = Math.max(130, Math.min(window.innerWidth - 130, x));
  return <div className={`badge-tip lv-${lv?.id ?? "none"}`} role="tooltip" style={{ left, top: y }}>
    <div className="badge-tip-head"><strong>{a.name}</strong><span>{lv ? lv.en : "LOCKED"}</span></div>
    <p>{TIP[a.id] ?? `${a.what}이(가) 늘어나면 등급이 올라가요.`}</p>
    <p className="badge-tip-now">지금 <b>{a.value}{a.unit}</b>{nextLv && a.next !== null ? <> · {nextLv.ko}까지 <b>{a.next - a.value}{a.unit}</b> 남았어요</> : " · 최고 등급이에요!"}</p>
    <ol className="badge-tip-steps">{LEVELS.map((l, n) => <li key={l.id} className={n < a.level ? "done" : n === a.level ? "next" : ""}><span>{l.ko}</span>{a.goals[n]}</li>)}</ol>
  </div>;
}

/** 업적 배지 모음: 한 줄 진열대, 등급(동·은·금·백금)은 메달 색과 다이아 4개로 */
export function BadgeCase({ list }: { list: Achievement[] }) {
  const [tip, setTip] = useState<{ a: Achievement; x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(0); // 열 때마다 바뀌어서 배지 등장 애니메이션을 다시 돌린다
  const show = (a: Achievement, el: HTMLElement) => { const r = el.getBoundingClientRect(); setTip({ a, x: r.left + r.width / 2, y: r.top }); };
  const earned = list.filter(a => a.level > 0).length;
  const points = list.reduce((n, a) => n + a.level, 0);
  return <section className={open ? "badges is-open" : "badges"} aria-label="업적 배지">
    {/* 접힌 상태: 한 줄 요약. 누르면 케이스가 열린다 */}
    <button type="button" className="badges-toggle" aria-expanded={open} onClick={() => { setOpen(o => !o); setOpened(n => n + 1); setTip(null); }}>
      <span className="fit-control-heading">BADGE CASE</span>
      <span className="badges-mini" aria-hidden="true">{list.map(a => <i key={a.id} className={`mini-hex lv-${a.level > 0 ? LEVELS[a.level - 1]!.id : "none"}`}/>)}</span>
      <span className="badges-count"><strong>{earned}</strong> / {list.length} 획득 · 등급 합계 <strong>{points}</strong> / {list.length * 4}</span>
      <span className="badges-open">{open ? "닫기" : "열기"} <ChevronDown size={14}/></span>
    </button>
    <div className="badges-drawer"><div className="badges-drawer-inner">
    <ul className="badges-grid" key={opened}>{list.map((a, i) => {
      const lv = a.level > 0 ? LEVELS[a.level - 1]! : null;
      const prev = a.level > 0 ? a.goals[a.level - 1]! : 0;
      const pct = a.next === null ? 100 : Math.max(0, Math.min(100, ((a.value - prev) / (a.next - prev)) * 100));
      return <li key={a.id} className={`badge-item lv-${lv?.id ?? "none"}`} style={{ "--i": i } as React.CSSProperties} tabIndex={0}
        aria-label={`${a.name} ${lv ? lv.ko : "미획득"}, ${a.what} ${a.value}${a.unit}`}
        onMouseEnter={e => show(a, e.currentTarget)} onMouseLeave={() => setTip(null)} onFocus={e => show(a, e.currentTarget)} onBlur={() => setTip(null)}>
        <Medal a={a}/>
        <strong>{a.name}</strong>
        <small className="badge-line"><b>{lv ? lv.en : "LOCKED"}</b> · {a.next === null ? "MAX" : `${a.value}/${a.next}`}</small>
        <span className="badge-bar"><i style={{ width: `${pct}%` }}/></span>
      </li>;
    })}</ul>
    </div></div>
    {tip && createPortal(<BadgeTip {...tip}/>, document.body)}
  </section>;
}
