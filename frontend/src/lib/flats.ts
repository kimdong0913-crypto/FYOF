// 아이템 도식(플랫) 그림. 사진 대신 "이런 종류의 옷"을 알아볼 수 있게 정면 실루엣 + 디테일 선으로 그린다.
// 틀(티셔츠·셔츠·코트·바지·신발…)에 아이템마다 기장·폭·디테일·대표 색만 바꿔 끼워서 73종의 톤을 맞춘다.

type Pt = [number, number];
const W = 400, H = 500, CX = 200;

const poly = (pts: Pt[]) => `M${pts.map(p => p.join(" ")).join(" L")} Z`;
const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [W - x, y] as Pt).reverse();
const line = (a: Pt, b: Pt) => `M${a.join(" ")} L${b.join(" ")}`;

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c * amount : (255 - c) * amount))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, "0")).join("")}`;
}
const isDark = (hex: string) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 < 90; };

type Ink = { fill: string; edge: string; detail: string; inner: string };
function inks(hex: string): Ink {
  const dark = isDark(hex);
  return { fill: hex, edge: shade(hex, dark ? 0.35 : -0.45), detail: dark ? shade(hex, 0.3) : shade(hex, -0.3), inner: shade(hex, dark ? 0.15 : -0.12) };
}

// ---------- 상의 / 아우터 ----------
type TopOpts = {
  top?: number; bottom?: number; hw?: number;           // 어깨 높이, 밑단, 몸판 반폭
  sleeve?: "short" | "long" | "none" | "cap"; cuffs?: boolean; hem?: boolean;
  neck?: "crew" | "v" | "high" | "collar" | "hood" | "lapel" | "deep";
  open?: boolean;                                        // 앞이 열린 아우터
  zip?: "full" | "half" | "offset"; buttons?: number; pockets?: "patch" | "flap" | "kanga" | "chest" | "four";
  quilt?: number; belt?: boolean; ribs?: boolean; stripes?: boolean; trim?: string; flare?: number;
  sleeveStripe?: boolean;                                // 트랙 자켓 소매 옆줄
};

function topFlat(c: Ink, o: TopOpts) {
  const top = o.top ?? 120, bottom = o.bottom ?? 390, hw = o.hw ?? 78, flare = o.flare ?? 0;
  const neckW = o.neck === "high" || o.neck === "hood" ? 30 : 32;
  const body: Pt[] = [[CX - neckW, top - 10], [CX - hw, top + 4], [CX - hw - 2 - flare, bottom], [CX + hw + 2 + flare, bottom], [CX + hw, top + 4], [CX + neckW, top - 10]];
  const parts: string[] = [];
  const sl = o.sleeve ?? "long";
  const sleeveL: Pt[] = sl === "long" ? [[CX - hw, top + 4], [CX - hw - 40, top + 30], [CX - hw - 64, bottom - 40], [CX - hw - 30, bottom - 30], [CX - hw + 2, top + 92]]
    : sl === "short" ? [[CX - hw, top + 4], [CX - hw - 46, top + 46], [CX - hw - 20, top + 82], [CX - hw + 2, top + 62]]
    : sl === "cap" ? [[CX - hw, top + 4], [CX - hw - 18, top + 30], [CX - hw + 2, top + 44]] : [];
  const fill = `fill="${c.fill}" stroke="${c.edge}" stroke-width="3" stroke-linejoin="round"`;
  if (o.neck === "hood") parts.push(`<path d="M${CX - 46} ${top - 2} Q${CX - 58} ${top - 78} ${CX} ${top - 84} Q${CX + 58} ${top - 78} ${CX + 46} ${top - 2} Z" ${fill}/>`);
  if (sleeveL.length) { parts.push(`<path d="${poly(sleeveL)}" ${fill}/>`, `<path d="${poly(mirror(sleeveL))}" ${fill}/>`); }
  if (sl === "none") { body.splice(1, 1, [CX - neckW - 16, top - 6], [CX - hw + 6, top + 30], [CX - hw, top + 70]); body.splice(6, 1, [CX + hw, top + 70], [CX + hw - 6, top + 30], [CX + neckW + 16, top - 6]); }
  parts.push(`<path d="${poly(body)}" ${fill}/>`);
  const d: string[] = [];
  const det = `stroke="${c.detail}" stroke-width="2.5" fill="none" stroke-linecap="round"`;
  // 넥라인
  if (o.neck === "crew" || !o.neck) d.push(`M${CX - neckW} ${top - 10} Q${CX} ${top + 22} ${CX + neckW} ${top - 10}`);
  if (o.neck === "v" || o.neck === "deep") d.push(`M${CX - neckW} ${top - 10} L${CX} ${top + (o.neck === "deep" ? 110 : 60)} L${CX + neckW} ${top - 10}`);
  if (o.neck === "high") parts.push(`<path d="M${CX - 32} ${top - 10} L${CX - 30} ${top - 46} Q${CX} ${top - 52} ${CX + 30} ${top - 46} L${CX + 32} ${top - 10} Q${CX} ${top + 2} ${CX - 32} ${top - 10} Z" fill="${o.trim ?? c.inner}" stroke="${c.edge}" stroke-width="3"/>`);
  if (o.neck === "hood") d.push(`M${CX - 30} ${top - 6} Q${CX} ${top + 14} ${CX + 30} ${top - 6}`);
  if (o.neck === "collar") parts.push(`<path d="M${CX - 34} ${top - 12} L${CX - 4} ${top + 26} L${CX - 18} ${top + 34} L${CX - 44} ${top + 4} Z M${CX + 34} ${top - 12} L${CX + 4} ${top + 26} L${CX + 18} ${top + 34} L${CX + 44} ${top + 4} Z" fill="${o.trim ?? c.inner}" stroke="${c.edge}" stroke-width="2.5" stroke-linejoin="round"/>`);
  if (o.neck === "lapel") parts.push(`<path d="M${CX - 32} ${top - 10} L${CX - 56} ${top + 50} L${CX - 40} ${top + 58} L${CX - 50} ${top + 70} L${CX} ${top + 150} Z M${CX + 32} ${top - 10} L${CX + 56} ${top + 50} L${CX + 40} ${top + 58} L${CX + 50} ${top + 70} L${CX} ${top + 150} Z" fill="${o.trim ?? c.inner}" stroke="${c.edge}" stroke-width="2.5" stroke-linejoin="round"/>`);
  // 여밈
  if (o.zip === "full" || o.open) d.push(line([o.zip === "offset" ? CX + 18 : CX, o.neck === "lapel" ? top + 150 : top + 8], [o.zip === "offset" ? CX + 18 : CX, bottom]));
  if (o.zip === "offset") d.push(`M${CX - 30} ${top - 6} L${CX + 18} ${top + 40}`);
  if (o.zip === "half") d.push(line([CX, top + 4], [CX, top + 70]));
  if (o.buttons) for (let i = 0; i < o.buttons; i++) parts.push(`<circle cx="${CX + (o.open ? 0 : 0)}" cy="${(o.neck === "lapel" ? top + 170 : top + 30) + i * (o.neck === "lapel" ? 50 : (bottom - top - 50) / Math.max(o.buttons, 1))}" r="5" fill="${c.detail}"/>`);
  if (o.ribs || o.hem) d.push(line([CX - hw - flare, bottom - 18], [CX + hw + flare, bottom - 18]));
  if (o.cuffs && sl === "long") { d.push(`M${CX - hw - 60} ${bottom - 58} L${CX - hw - 27} ${bottom - 48}`, `M${W - (CX - hw - 60)} ${bottom - 58} L${W - (CX - hw - 27)} ${bottom - 48}`); }
  if (o.ribs) for (let x = CX - hw + 14; x < CX + hw; x += 16) d.push(line([x, bottom - 16], [x, bottom - 2]));
  if (o.quilt) for (let i = 1; i <= o.quilt; i++) { const y = top + (bottom - top) * i / (o.quilt + 1); d.push(line([CX - hw - flare * i / (o.quilt + 1), y], [CX + hw + flare * i / (o.quilt + 1), y])); }
  if (o.belt) parts.push(`<rect x="${CX - hw - flare / 2 - 2}" y="${top + (bottom - top) * 0.45}" width="${(hw + flare / 2 + 2) * 2}" height="16" fill="${c.inner}" stroke="${c.edge}" stroke-width="2.5"/>`);
  if (o.pockets === "kanga") d.push(`M${CX - 48} ${bottom - 30} L${CX - 38} ${bottom - 92} L${CX + 38} ${bottom - 92} L${CX + 48} ${bottom - 30}`);
  if (o.pockets === "patch" || o.pockets === "four") for (const s of [-1, 1]) d.push(`M${CX + s * 22} ${bottom - 95} h${s * 40} v44 h${-s * 40} Z`);
  if (o.pockets === "flap") for (const s of [-1, 1]) d.push(`M${CX + s * 20} ${bottom - 92} h${s * 44}`);
  if (o.pockets === "chest" || o.pockets === "four") for (const s of [-1, 1]) d.push(`M${CX + s * 22} ${top + 44} h${s * 32} v30 h${-s * 32} Z`);
  if (o.stripes) for (let y = top + 34; y < bottom - 10; y += 44) parts.push(`<rect x="${CX - hw}" y="${y}" width="${hw * 2}" height="16" fill="${c.detail}" opacity=".55"/>`);
  if (o.sleeveStripe && sl === "long") parts.push(`<path d="M${CX - hw - 6} ${top + 10} L${CX - hw - 50} ${bottom - 42} M${W - (CX - hw - 6)} ${top + 10} L${W - (CX - hw - 50)} ${bottom - 42}" stroke="#F1F0EC" stroke-width="7" fill="none" stroke-linecap="round"/>`);
  if (o.neck === "hood" && o.zip !== "full") d.push(`M${CX - 10} ${top + 6} v30 M${CX + 10} ${top + 6} v30`);
  return parts.join("") + (d.length ? `<path d="${d.join(" ")}" ${det}/>` : "");
}

// ---------- 하의 ----------
type PantsOpts = { hemOut: number; hemIn: number; knee?: number; length?: number; cargo?: boolean; cuff?: boolean; stripe?: boolean; crease?: boolean; cord?: boolean; pleat?: boolean; denim?: boolean };
function pantsFlat(c: Ink, o: PantsOpts) {
  const waist = 80, hem = o.length ?? 440, hw = 64, crotch = 200;
  const knee = o.knee ?? (o.hemOut + hw) / 2;
  const pts: Pt[] = [[CX - hw, waist], [CX + hw, waist], [CX + hw + 4, crotch - 20], [CX + knee, (crotch + hem) / 2 + 20], [CX + o.hemOut, hem], [CX + o.hemIn, hem], [CX + 2, crotch], [CX - 2, crotch], [CX - o.hemIn, hem], [CX - o.hemOut, hem], [CX - knee, (crotch + hem) / 2 + 20], [CX - hw - 4, crotch - 20]];
  const det = `stroke="${c.detail}" stroke-width="2.5" fill="none" stroke-linecap="round"`;
  const d = [line([CX - hw, waist + 20], [CX + hw, waist + 20]), `M${CX} ${waist + 20} L${CX} ${crotch - 30}`, `M${CX - hw + 6} ${waist + 24} Q${CX - hw + 28} ${waist + 34} ${CX - hw + 36} ${waist + 24}`, `M${CX + hw - 6} ${waist + 24} Q${CX + hw - 28} ${waist + 34} ${CX + hw - 36} ${waist + 24}`];
  for (const x of [-46, -16, 16, 46]) d.push(line([CX + x, waist], [CX + x, waist + 20]));
  if (o.crease) d.push(line([CX - (hw + o.hemOut) / 2 + 6, waist + 30], [CX - (o.hemOut + o.hemIn) / 2, hem - 4]), line([CX + (hw + o.hemOut) / 2 - 6, waist + 30], [CX + (o.hemOut + o.hemIn) / 2, hem - 4]));
  if (o.cargo) for (const s of [-1, 1]) d.push(`M${CX + s * (hw + 2)} ${crotch + 20} h${-s * 36} v56 h${s * 38}`);
  if (o.cuff) d.push(line([CX - o.hemOut, hem - 22], [CX - o.hemIn, hem - 22]), line([CX + o.hemIn, hem - 22], [CX + o.hemOut, hem - 22]));
  if (o.cord) for (const s of [-1, 1]) for (const t of [0.3, 0.55, 0.8]) d.push(line([CX + s * (6 + (hw - 6) * t), crotch - 10], [CX + s * (o.hemIn + (o.hemOut - o.hemIn) * t), hem - 4]));
  if (o.pleat) d.push(line([CX - 30, waist + 20], [CX - 34, waist + 70]), line([CX + 30, waist + 20], [CX + 34, waist + 70]));
  let extra = "";
  if (o.stripe) extra = `<path d="M${CX - hw + 10} ${waist + 24} L${CX - o.hemOut + 14} ${hem - 2} M${CX + hw - 10} ${waist + 24} L${CX + o.hemOut - 14} ${hem - 2}" stroke="#F1F0EC" stroke-width="7" fill="none"/>`;
  // 데님: 노란 스티치(앞 지퍼 J선, 앞주머니, 동전 주머니, 밑단)
  if (o.denim) extra += `<path d="M${CX - 4} ${waist + 24} L${CX - 4} ${crotch - 44} Q${CX - 4} ${crotch - 26} ${CX - 22} ${crotch - 34} L${CX - 22} ${waist + 24} M${CX - hw + 4} ${waist + 30} Q${CX - hw + 30} ${waist + 44} ${CX - hw + 40} ${waist + 24} M${CX + hw - 4} ${waist + 30} Q${CX + hw - 30} ${waist + 44} ${CX + hw - 40} ${waist + 24} M${CX + hw - 34} ${waist + 30} h-16 v14 h16 M${CX - o.hemOut + 2} ${hem - 10} L${CX - o.hemIn - 1} ${hem - 10} M${CX + o.hemIn + 1} ${hem - 10} L${CX + o.hemOut - 2} ${hem - 10}" stroke="#D9A441" stroke-width="2" stroke-dasharray="5 4" fill="none"/>`;
  return `<path d="${poly(pts)}" fill="${c.fill}" stroke="${c.edge}" stroke-width="3" stroke-linejoin="round"/>${extra}<path d="${d.join(" ")}" ${det}/>`;
}

function skirtFlat(c: Ink, o: { length: number; flare: number; pleats?: boolean }) {
  const waist = 90, hw = 62, hem = waist + o.length;
  const det = `stroke="${c.detail}" stroke-width="2.5" fill="none" stroke-linecap="round"`;
  const d = [line([CX - hw, waist + 18], [CX + hw, waist + 18])];
  if (o.pleats) for (let i = -3; i <= 3; i++) d.push(line([CX + i * 16, waist + 18], [CX + i * (16 + o.flare / 4), hem - 2]));
  return `<path d="${poly([[CX - hw, waist], [CX + hw, waist], [CX + hw + o.flare, hem], [CX - hw - o.flare, hem]])}" fill="${c.fill}" stroke="${c.edge}" stroke-width="3" stroke-linejoin="round"/><path d="${d.join(" ")}" ${det}/>`;
}

// ---------- 신발 (옆모습) ----------
type ShoeKind = "low" | "high" | "runner" | "loafer" | "derby" | "chelsea" | "worker" | "ugg" | "sandal" | "slide" | "maryjane";
function shoeFlat(c: Ink, kind: ShoeKind) {
  const sole = kind === "worker" || kind === "runner" ? 26 : kind === "loafer" || kind === "derby" || kind === "chelsea" || kind === "maryjane" ? 14 : 20;
  const solid = kind === "low" || kind === "high" ? "#F1F0EC" : kind === "runner" ? "#E4E4E2" : shade(c.fill, isDark(c.fill) ? -0.4 : -0.55);
  const baseY = 330, toe = 330, heel = 70;
  const shaft = kind === "high" ? 150 : kind === "chelsea" ? 150 : kind === "worker" ? 160 : kind === "ugg" ? 170 : 0;
  const det = `stroke="${c.detail}" stroke-width="2.5" fill="none" stroke-linecap="round"`;
  let upper: string;
  const d: string[] = [];
  if (kind === "sandal" || kind === "slide") {
    upper = kind === "slide" ? `M140 ${baseY - 6} Q200 ${baseY - 70} 300 ${baseY - 16} L300 ${baseY - 6} Z` : `M120 ${baseY - 6} Q150 ${baseY - 60} 190 ${baseY - 50} L190 ${baseY - 6} Z M220 ${baseY - 6} Q260 ${baseY - 66} 310 ${baseY - 12} L310 ${baseY - 6} Z`;
  } else {
    const top = baseY - (kind === "loafer" || kind === "maryjane" ? 96 : 116) - shaft;
    const instep = baseY - (kind === "loafer" || kind === "maryjane" ? 92 : 108);
    upper = `M${heel} ${baseY - 6} L${heel - 6} ${top + 16} Q${heel - 4} ${top} ${heel + 20} ${top} Q${heel + 50} ${top + 2} ${heel + (shaft ? 88 : 80)} ${shaft ? top : top + 22} ${shaft ? `L${heel + 96} ${instep}` : ""} Q${heel + 150} ${instep - 6} ${toe - 50} ${baseY - 70} Q${toe + 6} ${baseY - 56} ${toe + 14} ${baseY - 24} Q${toe + 16} ${baseY - 8} ${toe + 6} ${baseY - 6} Z`;
    if (!shaft && kind !== "loafer" && kind !== "maryjane") d.push(`M${heel + 6} ${top + 8} Q${heel + 40} ${top + 30} ${heel + 78} ${top + 22}`);
    if (kind === "low" || kind === "high" || kind === "runner") d.push(`M${toe - 54} ${baseY - 8} Q${toe - 46} ${baseY - 56} ${toe + 8} ${baseY - 40}`);
    if (kind === "low" || kind === "high" || kind === "runner") d.push(`M${heel + 104} ${instep + 6} l16 -10 M${heel + 124} ${instep + 10} l16 -10 M${heel + 144} ${instep + 16} l16 -10`);
    if (kind === "runner") d.push(`M${heel + 30} ${baseY - 30} Q${heel + 120} ${baseY - 70} ${toe - 20} ${baseY - 30}`);
    if (kind === "loafer") d.push(`M${heel + 120} ${instep + 4} Q${toe - 40} ${baseY - 96} ${toe - 6} ${baseY - 50}`, `M${heel + 136} ${instep + 18} h56`);
    if (kind === "derby") d.push(`M${heel + 96} ${instep - 2} L${heel + 170} ${baseY - 66}`, `M${heel + 50} ${baseY - 40} Q${heel + 110} ${baseY - 62} ${heel + 170} ${baseY - 66}`, `M${heel + 108} ${instep + 4} l14 -8 M${heel + 128} ${instep + 10} l14 -8`);
    if (kind === "chelsea") d.push(`M${heel + 40} ${baseY - 84 - shaft + 10} L${heel + 50} ${baseY - 90}`, `M${heel + 70} ${baseY - 84 - shaft + 10} L${heel + 70} ${baseY - 90}`);
    if (kind === "worker") for (let y = baseY - 100 - shaft + 30; y < baseY - 80; y += 24) d.push(`M${heel + 76} ${y} l22 8`);
    if (kind === "ugg") d.push(`M${heel - 4} ${baseY - 84 - shaft + 14} Q${heel + 40} ${baseY - 84 - shaft + 26} ${heel + 80} ${baseY - 84 - shaft + 14}`);
    if (kind === "maryjane") d.push(`M${heel + 60} ${top + 24} Q${heel + 100} ${top - 6} ${heel + 140} ${instep + 14}`);
  }
  const soleEl = kind === "slide" || kind === "sandal" ? `<rect x="${kind === "slide" ? 120 : 100}" y="${baseY - 6}" width="${kind === "slide" ? 200 : 230}" height="16" rx="6" fill="${solid}" stroke="${c.edge}" stroke-width="3"/>`
    : `<path d="M${heel - 6} ${baseY - 8} L${toe + 14} ${baseY - 8} Q${toe + 22} ${baseY + sole / 2} ${toe + 6} ${baseY + sole} L${heel - 2} ${baseY + sole} Z" fill="${solid}" stroke="${c.edge}" stroke-width="3" stroke-linejoin="round"/>`;
  const strap = kind === "sandal" ? `<path d="M110 ${baseY - 30} q-10 -30 20 -34" ${det}/>` : "";
  return `<g transform="translate(-34 -40) scale(1.16)"><path d="${upper}" fill="${c.fill}" stroke="${c.edge}" stroke-width="3" stroke-linejoin="round"/>${soleEl}${strap}${d.length ? `<path d="${d.join(" ")}" ${det}/>` : ""}</g>`;
}

// ---------- 액세서리 ----------
type AccKind = "cap" | "beanie" | "bucket" | "muffler" | "belt" | "tote" | "cross" | "backpack" | "glasses";
function accFlat(c: Ink, kind: AccKind) {
  const fill = `fill="${c.fill}" stroke="${c.edge}" stroke-width="3" stroke-linejoin="round"`;
  const det = `stroke="${c.detail}" stroke-width="2.5" fill="none" stroke-linecap="round"`;
  switch (kind) {
    case "cap": return `<path d="M110 270 Q115 170 200 165 Q285 170 290 270 Z" ${fill}/><path d="M285 262 Q340 262 350 290 L290 288 Z" ${fill}/><path d="M200 168 L200 268 M150 182 Q170 230 165 268 M250 182 Q230 230 235 268" ${det}/><circle cx="200" cy="166" r="7" fill="${c.edge}"/>`;
    case "beanie": return `<path d="M120 300 Q120 160 200 155 Q280 160 280 300 Z" ${fill}/><rect x="112" y="270" width="176" height="46" rx="6" ${fill}/>${Array.from({ length: 10 }, (_, i) => `<path d="M${124 + i * 17} 276 v34" ${det}/>`).join("")}`;
    case "bucket": return `<path d="M140 270 L150 180 Q200 165 250 180 L260 270 Z" ${fill}/><path d="M90 300 L140 262 L260 262 L310 300 Q200 318 90 300 Z" ${fill}/><path d="M146 240 Q200 250 254 240" ${det}/>`;
    case "muffler": return `<path d="M120 170 Q200 130 280 170 L280 210 Q200 175 120 210 Z" ${fill}/><path d="M150 200 L135 390 L185 392 L190 205 Z" ${fill}/><path d="M138 392 v24 M152 393 v24 M166 393 v24 M180 393 v24" ${det}/>`;
    case "belt": return `<path d="M60 230 L340 230 L340 266 L60 266 Z" ${fill}/><rect x="140" y="222" width="54" height="52" rx="6" fill="none" stroke="${c.detail}" stroke-width="7"/><path d="M196 248 h-40" ${det}/>${[240, 270, 300].map(x => `<circle cx="${x}" cy="248" r="5" fill="${c.edge}"/>`).join("")}`;
    case "tote": return `<path d="M120 200 L280 200 L296 400 L104 400 Z" ${fill}/><path d="M150 200 Q150 120 200 120 Q250 120 250 200" stroke="${c.edge}" stroke-width="10" fill="none"/>`;
    case "cross": return `<path d="M90 120 L262 300" stroke="${c.edge}" stroke-width="8" fill="none"/><rect x="200" y="270" width="150" height="110" rx="14" ${fill}/><path d="M200 300 Q275 330 350 300" ${det}/>`;
    case "backpack": return `<rect x="120" y="140" width="160" height="250" rx="40" ${fill}/><rect x="145" y="270" width="110" height="90" rx="14" ${fill}/><path d="M160 140 Q200 100 240 140 M150 200 Q200 215 250 200" ${det}/>`;
    case "glasses": return `<circle cx="140" cy="250" r="48" fill="none" stroke="${c.fill}" stroke-width="10"/><circle cx="260" cy="250" r="48" fill="none" stroke="${c.fill}" stroke-width="10"/><path d="M188 245 Q200 232 212 245 M92 240 L56 226 M308 240 L344 226" stroke="${c.fill}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  }
}

// ---------- 핏 → 실루엣 ----------
/** 상의·아우터 핏: 몸판 폭(hw)과 기장(bottom)을 바꾼다 */
function fitTop(o: TopOpts, fit: string | undefined): TopOpts {
  const top = o.top ?? 120, bottom = o.bottom ?? 390, hw = o.hw ?? 78;
  switch (fit) {
    case "crop": return { ...o, bottom: top + Math.min(bottom - top, 170), ...(o.quilt ? { quilt: Math.min(o.quilt, 3) } : {}) };
    case "slim": return { ...o, hw: hw - 10 };
    case "semi-over": return { ...o, hw: hw + 6, bottom: bottom + 10 };
    case "over": return { ...o, hw: hw + 14, bottom: Math.min(bottom + 22, 470) };
    case "boxy": return { ...o, hw: hw + 16, bottom: top + Math.min(bottom - top, 220) };
    case "long": return { ...o, bottom: 470, flare: (o.flare ?? 0) + 8, ...(o.quilt ? { quilt: o.quilt + 2 } : {}) };
    default: return o;
  }
}

/** 바지 핏: 밑단 바깥/안쪽 폭과 무릎 폭 */
const pantsFit: Record<string, { hemOut: number; hemIn: number; knee: number }> = {
  skinny: { hemOut: 50, hemIn: 18, knee: 54 },
  slim: { hemOut: 58, hemIn: 16, knee: 62 },
  straight: { hemOut: 74, hemIn: 14, knee: 72 },
  tapered: { hemOut: 56, hemIn: 16, knee: 76 },
  wide: { hemOut: 96, hemIn: 6, knee: 84 },
  relaxed: { hemOut: 86, hemIn: 10, knee: 86 },
  bootcut: { hemOut: 84, hemIn: 12, knee: 62 },
  flare: { hemOut: 106, hemIn: 6, knee: 58 },
  curved: { hemOut: 64, hemIn: 16, knee: 94 },
};

// ---------- 아이템 → 그림 ----------
type Spec = (c: Ink, trim: Ink, fit?: string) => string;
const T = (o: TopOpts): Spec => (c, _t, fit) => topFlat(c, fitTop(o, fit));
const Pants = (extra: Partial<PantsOpts> = {}, fallback = "straight"): Spec => (c, _t, fit) =>
  pantsFlat(c, { ...(pantsFit[fit ?? fallback] ?? pantsFit[fallback]!), ...extra });
const specs: Record<string, Spec> = {
  // 아우터
  mustang: (c, t, fit) => topFlat(c, fitTop({ neck: "lapel", top: 110, bottom: 400, hw: 84, open: true, buttons: 0, trim: t.fill, pockets: "flap", cuffs: true }, fit)),
  "light-padding": T({ neck: "crew", zip: "full", quilt: 6, hw: 80, bottom: 380 }),
  "long-padding": T({ neck: "high", zip: "full", quilt: 8, top: 100, bottom: 470, hw: 86, flare: 6 }),
  "short-padding": T({ neck: "high", zip: "full", quilt: 3, top: 120, bottom: 340, hw: 96, cuffs: true }),
  "padding-vest": T({ neck: "high", zip: "full", quilt: 4, sleeve: "none", hw: 80, bottom: 380 }),
  "hood-zipup": T({ neck: "hood", zip: "full", pockets: "kanga", ribs: true, cuffs: true }),
  blazer: T({ neck: "lapel", buttons: 2, pockets: "flap", hw: 80, bottom: 400 }),
  "trench-coat": T({ neck: "lapel", belt: true, buttons: 0, top: 100, bottom: 470, hw: 84, flare: 14, open: true }),
  "wool-coat": T({ neck: "lapel", buttons: 3, top: 100, bottom: 465, hw: 84, flare: 8, pockets: "flap" }),
  "leather-jacket": T({ neck: "collar", zip: "offset", hw: 82, bottom: 360, belt: false, pockets: "flap", cuffs: true }),
  "denim-jacket": T({ neck: "collar", buttons: 5, pockets: "chest", hw: 82, bottom: 360, hem: true, cuffs: true }),
  ma1: T({ neck: "high", zip: "full", ribs: true, cuffs: true, hw: 90, bottom: 350, pockets: "flap" }),
  "track-jacket": T({ neck: "high", zip: "full", ribs: true, cuffs: true, hw: 80, bottom: 370, sleeveStripe: true, pockets: "flap" }),
  windbreaker: T({ neck: "hood", zip: "full", cuffs: true, hw: 84, bottom: 380, hem: true }),
  fleece: T({ neck: "high", zip: "full", hw: 84, bottom: 380, pockets: "flap", cuffs: true, hem: true }),
  cardigan: T({ neck: "v", buttons: 5, ribs: true, cuffs: true, hw: 78 }),
  "field-jacket": T({ neck: "collar", zip: "full", pockets: "four", hw: 84, bottom: 410, cuffs: true }),
  "work-jacket": T({ neck: "collar", buttons: 5, pockets: "patch", hw: 84, bottom: 380, cuffs: true }),
  // 상의
  "short-tee": T({ sleeve: "short", neck: "crew", hw: 80 }),
  "long-sleeve": T({ sleeve: "long", neck: "crew", hw: 74 }),
  sweatshirt: T({ neck: "crew", ribs: true, cuffs: true, hw: 80 }),
  hoodie: T({ neck: "hood", pockets: "kanga", ribs: true, cuffs: true, hw: 82 }),
  "half-zip": T({ neck: "high", zip: "half", ribs: true, cuffs: true, hw: 80 }),
  "crew-knit": T({ neck: "crew", ribs: true, cuffs: true, hw: 80, stripes: false }),
  "knit-vest": T({ neck: "v", sleeve: "none", ribs: true, hw: 74, bottom: 360 }),
  "oxford-shirt": T({ neck: "collar", buttons: 6, cuffs: true, hw: 76, bottom: 400 }),
  "stripe-shirt": T({ neck: "collar", buttons: 6, cuffs: true, hw: 76, bottom: 400, stripes: true }),
  "linen-shirt": T({ neck: "collar", buttons: 5, sleeve: "long", hw: 82, bottom: 395 }),
  "flannel-shirt": T({ neck: "collar", buttons: 6, cuffs: true, hw: 78, bottom: 400, pockets: "chest", stripes: true }),
  "denim-shirt": T({ neck: "collar", buttons: 6, cuffs: true, hw: 78, bottom: 400, pockets: "chest" }),
  "polo-shirt": T({ neck: "collar", sleeve: "short", buttons: 2, hw: 78 }),
  "rugby-shirt": T({ neck: "collar", buttons: 2, stripes: true, cuffs: true, hw: 80 }),
  blouse: T({ neck: "v", sleeve: "long", buttons: 4, hw: 76, flare: 8, cuffs: true }),
  // 이너
  sleeveless: T({ sleeve: "none", neck: "deep", hw: 66 }),
  turtleneck: T({ neck: "high", hw: 72, cuffs: true }),
  thermal: T({ neck: "crew", hw: 68 }),
  henley: T({ neck: "crew", buttons: 3, hw: 72, bottom: 380 }),
  camisole: T({ sleeve: "none", neck: "v", hw: 62, flare: 6 }),
  // 하의
  denim: Pants({ denim: true }),
  slacks: Pants({ crease: true, pleat: true }),
  "cotton-pants": Pants({ cuff: true }),
  cargo: Pants({ cargo: true }, "wide"),
  jogger: c => pantsFlat(c, { hemOut: 50, hemIn: 18, knee: 70, cuff: true }),
  "track-pants": Pants({ stripe: true }),
  shorts: c => pantsFlat(c, { hemOut: 92, hemIn: 20, knee: 88, length: 270 }),
  corduroy: Pants({ cord: true }),
  "mini-skirt": c => skirtFlat(c, { length: 170, flare: 22 }),
  "long-skirt": c => skirtFlat(c, { length: 340, flare: 50 }),
  "pleated-skirt": c => skirtFlat(c, { length: 250, flare: 44, pleats: true }),
  // 신발
  "low-sneakers": c => shoeFlat(c, "low"), "high-sneakers": c => shoeFlat(c, "high"), "running-shoes": c => shoeFlat(c, "runner"),
  loafers: c => shoeFlat(c, "loafer"), derby: c => shoeFlat(c, "derby"), "chelsea-boots": c => shoeFlat(c, "chelsea"),
  "work-boots": c => shoeFlat(c, "worker"), "ugg-boots": c => shoeFlat(c, "ugg"), sandals: c => shoeFlat(c, "sandal"),
  slides: c => shoeFlat(c, "slide"), "mary-jane": c => shoeFlat(c, "maryjane"),
  // 액세서리
  "ball-cap": c => accFlat(c, "cap"), beanie: c => accFlat(c, "beanie"), "bucket-hat": c => accFlat(c, "bucket"),
  muffler: c => accFlat(c, "muffler"), belt: c => accFlat(c, "belt"), "tote-bag": c => accFlat(c, "tote"),
  "cross-bag": c => accFlat(c, "cross"), backpack: c => accFlat(c, "backpack"), glasses: c => accFlat(c, "glasses"),
};

/** 아이템 도식을 data URI 로. 없는 아이템이면 undefined. fit: 핏(실루엣), trimHex: 무스탕 칼라처럼 다른 색이 들어가는 부분 */
export function flatImage(id: string, hex: string, fit?: string, trimHex = "#E9E2D0"): string | undefined {
  const spec = specs[id];
  if (!spec) return undefined;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1280" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ECEBE7"/><g transform="translate(0 6)">${spec(inks(hex), inks(trimHex), fit)}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
