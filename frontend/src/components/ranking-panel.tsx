import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TierBadge, tiers } from "@/components/tier-badge";
import { api } from "@/lib/api";
import { useUser } from "@/lib/session";

type RankEntry = { rank: number; userId: number | null; nickname: string; posts: number; votes: number; badge: boolean; tier: number; me: boolean };

// 추천을 많이 받은 사람 순위. 이번 주(최근 7일 추천) / 전체. 이름을 누르면 그 사람 페이지로 간다.
export function RankingPanel({ version = 0 }: { version?: number }) {
  const user = useUser();
  const [period, setPeriod] = useState<"week" | "all">("week");
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  useEffect(() => {
    let alive = true;
    api<RankEntry[]>(`/api/style-posts/ranking?period=${period}`).then(r => { if (alive) setRanking(r); }).catch(() => { if (alive) setRanking([]); });
    return () => { alive = false; };
  }, [period, version, user]);

  return <div className="vote-ranking">
    <span className="fit-control-heading">STYLE RANKING</span>
    <h3>추천 많이 받은 사람</h3>
    <div className="ranking-tabs" role="tablist">
      {([["week", "이번 주"], ["all", "전체"]] as const).map(([id, ko]) => <Button key={id} role="tab" aria-selected={period === id} variant="ghost" className={period === id ? "active" : ""} onClick={() => setPeriod(id)}>{ko}</Button>)}
    </div>
    {ranking.length === 0 ? <p className="vote-form-note">{period === "week" ? "이번 주에는 아직 추천받은 사람이 없어요. 첫 주인공이 되어 보세요." : "아직 순위가 없어요. 코디를 올리고 추천을 받아 보세요."}</p>
      : <ol>{ranking.map(r => <li key={r.rank} className={r.me ? "me" : ""}>
          <span className="rank-no">{r.rank}</span>
          <span className="rank-name">{r.userId ? <Link to="/u/$id" params={{ id: String(r.userId) }}>{r.nickname}</Link> : r.nickname}{r.me && <em> (나)</em>}<TierBadge tier={r.tier}/></span>
          <span className="rank-score"><Heart size={11} fill="currentColor"/> {r.votes} · 글 {r.posts}</span>
        </li>)}</ol>}
    <ul className="tier-rules">{([1, 2, 3] as const).map(t => <li key={t}><TierBadge tier={t}/><span>{tiers[t].rule}</span></li>)}</ul>
    <p className="vote-badge-rule">내 글에 누른 추천은 세지 않아요.</p>
  </div>;
}
