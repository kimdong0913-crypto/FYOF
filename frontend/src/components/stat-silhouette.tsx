import type { PaletteColor } from "@/lib/palette";

type OutfitSilhouetteProps = {
  top?: PaletteColor | undefined;
  bottom?: PaletteColor | undefined;
  shoes?: PaletteColor | undefined;
};

// 고른 색조합으로 사람 실루엣의 상의·하의·신발을 칠해 보여준다. 색이 없는 부분은 바탕색으로 둔다.
export function StatSilhouette({ top, bottom, shoes }: OutfitSilhouetteProps) {
  const parts = [top && `상의 ${top.ko}`, bottom && `데님 ${bottom.ko}`, shoes && `신발 ${shoes.ko}`].filter(Boolean).join(", ");
  return <div className="stat-figure" role="img" aria-label={parts ? `사람 실루엣: ${parts}` : "사람 실루엣"}>
    <div className="stat-figure-heading"><span>STYLE MAP</span><span>TOP · DENIM · SHOES</span></div>
    <div className="stat-figure-body">
      <svg viewBox="0 0 220 370" aria-hidden="true" focusable="false">
        <ellipse className="silhouette-base" cx="110" cy="30" rx="21" ry="25"/>
        <path className="silhouette-base" d="M101 51 L119 51 L120 67 L100 67 Z"/>
        <path className={top ? "silhouette-part" : "silhouette-base"} style={top && { fill: top.hex }} d="M91 61 Q80 64 72 72 L55 89 L35 153 Q33 160 39 163 L48 167 Q53 167 56 161 L77 118 L78 185 Q108 194 142 185 L143 118 L164 161 Q167 167 172 167 L181 163 Q187 160 185 153 L165 89 L148 72 Q140 64 129 61 L110 76 Z"/>
        <path className={bottom ? "silhouette-part" : "silhouette-base"} style={bottom && { fill: bottom.hex }} d="M78 183 Q110 191 142 183 L142 246 L136 326 L113 326 L110 248 L107 326 L84 326 L78 246 Z"/>
        <g className={shoes ? "silhouette-part" : "silhouette-base"} style={shoes && { fill: shoes.hex }}>
          <path d="M83 329 L107 329 L108 348 Q108 354 101 354 L67 354 Q60 354 63 348 L82 338 Z"/>
          <path d="M113 329 L137 329 L138 338 L157 348 Q160 354 153 354 L119 354 Q112 354 112 348 Z"/>
        </g>
      </svg>
      <ul className="stat-figure-legend">
        {[["상의", top], ["데님", bottom], ["신발", shoes]].map(([label, c]) => {
          const color = c as PaletteColor | undefined;
          return <li key={label as string}><i style={{ background: color?.hex ?? "transparent" }}/><span>{label as string}</span><strong>{color?.ko ?? "—"}</strong></li>;
        })}
      </ul>
    </div>
    <div className="stat-figure-foot"><span>MOST PICKED COMBINATION</span><span>↗</span></div>
  </div>;
}
