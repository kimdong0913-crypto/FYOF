type StatSilhouetteProps = {
  region: "bottom" | "shoes" | "outer";
  label: string;
  value: number;
  swatch: string;
};

const regionMap = {
  bottom: { top: 183, bottom: 326, id: "bottom" },
  shoes: { top: 329, bottom: 354, id: "shoes" },
  outer: { top: 61, bottom: 187, id: "outer" },
} as const;

export function StatSilhouette({ region, label, value, swatch }: StatSilhouetteProps) {
  const pos = regionMap[region] ?? regionMap.bottom;
  const fillHeight = (pos.bottom - pos.top) * value / 100;

  return <div className={`stat-figure stat-figure-${pos.id}`} role="img" aria-label={`사람 실루엣의 ${label} 영역에 ${value}%를 채워 표시`}>
    <div className="stat-figure-heading"><span>STYLE MAP</span><span>01 / 01</span></div>
    <div className="stat-figure-body">
      <svg viewBox="0 0 220 370" aria-hidden="true" focusable="false">
        <defs>
          <g id="figure-outer"><path d="M91 61 Q80 64 72 72 L55 89 L35 153 Q33 160 39 163 L48 167 Q53 167 56 161 L77 118 L78 185 Q108 194 142 185 L143 118 L164 161 Q167 167 172 167 L181 163 Q187 160 185 153 L165 89 L148 72 Q140 64 129 61 L110 76 Z"/></g>
          <g id="figure-bottom"><path d="M78 183 Q110 191 142 183 L142 246 L136 326 L113 326 L110 248 L107 326 L84 326 L78 246 Z"/></g>
          <g id="figure-shoes"><path d="M83 329 L107 329 L108 348 Q108 354 101 354 L67 354 Q60 354 63 348 L82 338 Z"/><path d="M113 329 L137 329 L138 338 L157 348 Q160 354 153 354 L119 354 Q112 354 112 348 Z"/></g>
          <clipPath id="figure-percentage"><rect x="0" y={pos.bottom - fillHeight} width="220" height={fillHeight}/></clipPath>
        </defs>
        <ellipse className="silhouette-base" cx="110" cy="30" rx="21" ry="25"/>
        <path className="silhouette-base" d="M101 51 L119 51 L120 67 L100 67 Z"/>
        <use href="#figure-outer" className="silhouette-base"/>
        <use href="#figure-bottom" className="silhouette-base"/>
        <use href="#figure-shoes" className="silhouette-base"/>
        <use href={`#figure-${pos.id}`} className="silhouette-fill" clipPath="url(#figure-percentage)" style={{ fill: swatch }}/>
        <use href={`#figure-${pos.id}`} className="silhouette-outline"/>
      </svg>
      <div className="stat-figure-rule" aria-hidden="true"><span>100</span><span>50</span><span>0</span></div>
      <div className="stat-figure-callout"><strong>{value}<small>%</small></strong><span>{label}</span></div>
    </div>
    <div className="stat-figure-foot"><span>SELECTED COMBINATION</span><span>↗</span></div>
  </div>;
}
