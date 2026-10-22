// 활동 등급 뱃지. 기준은 백엔드 StyleVoteController.TIER_RULE 과 같다.
export const tiers = {
  1: { label: "ROOKIE", ko: "루키", icon: "🌱", rule: "첫 글을 올리면" },
  2: { label: "STYLER", ko: "스타일러", icon: "✦", rule: "글 3개 또는 추천 3개" },
  3: { label: "FASHIONISTA", ko: "패셔니스타", icon: "👑", rule: "추천 10개, 또는 글 5개 + 추천 3개" },
} as const;

export function TierBadge({ tier, size = "sm" }: { tier: number; size?: "sm" | "lg" }) {
  const t = tiers[tier as 1 | 2 | 3];
  if (!t) return null;
  return <span className={`tier-badge tier-${tier} tier-${size}`} title={`${t.ko} — ${t.rule}`}><span aria-hidden="true">{t.icon}</span> {t.label}</span>;
}
