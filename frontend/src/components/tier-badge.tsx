// 활동 등급 뱃지. 기준은 백엔드 StyleVoteController.TIERS 와 같다 (글 수 + 받은 추천 수, 둘 다 채워야 한다).
export const tiers = {
  1: { label: "ROOKIE", ko: "루키", icon: "🌱", posts: 1, votes: 0, rule: "첫 글을 올리면" },
  2: { label: "STYLER", ko: "스타일러", icon: "✦", posts: 10, votes: 30, rule: "글 10개 + 추천 30개" },
  3: { label: "TRENDSETTER", ko: "트렌드세터", icon: "🔥", posts: 20, votes: 100, rule: "글 20개 + 추천 100개" },
  4: { label: "FASHIONISTA", ko: "패셔니스타", icon: "👑", posts: 35, votes: 250, rule: "글 35개 + 추천 250개" },
  5: { label: "STYLE ICON", ko: "스타일 아이콘", icon: "💎", posts: 50, votes: 500, rule: "글 50개 + 추천 500개" },
} as const;
export type TierLevel = keyof typeof tiers;
export const tierLevels = [1, 2, 3, 4, 5] as const;
export const tierOf = (tier: number) => tiers[tier as TierLevel] as (typeof tiers)[TierLevel] | undefined;

export function TierBadge({ tier, size = "sm" }: { tier: number; size?: "sm" | "lg" }) {
  const t = tierOf(tier);
  if (!t) return null;
  return <span className={`tier-badge tier-${tier} tier-${size}`} title={`${t.ko} — ${t.rule}`}><span aria-hidden="true">{t.icon}</span> {t.label}</span>;
}
