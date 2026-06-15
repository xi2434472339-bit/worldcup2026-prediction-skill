import { BarChart3, Crosshair, Database, TimerReset } from "lucide-react";
import type { PublicStats } from "../../shared/domain";

function displayRate(value: number | null) {
  return value === null ? "--" : `${value}%`;
}

export function StatsPanel({ stats }: { stats: PublicStats }) {
  const groups = [
    {
      title: "赛前官方预测",
      note: "只统计开赛前锁定的记录",
      className: "official",
      cards: [
        { label: "已结算", value: stats.settledOfficial, suffix: "场", icon: Database },
        { label: "胜平负命中率", value: displayRate(stats.outcomeRate), suffix: "", icon: BarChart3 },
        { label: "精确比分命中率", value: displayRate(stats.exactScoreRate), suffix: "", icon: Crosshair },
      ],
    },
    {
      title: "赛后历史回测",
      note: "比赛后生成，仅用于方法检验",
      className: "backtest",
      cards: [
        { label: "已回测", value: stats.backtestCount, suffix: "场", icon: TimerReset },
        { label: "胜平负命中率", value: displayRate(stats.backtestOutcomeRate), suffix: "", icon: BarChart3 },
        { label: "精确比分命中率", value: displayRate(stats.backtestExactScoreRate), suffix: "", icon: Crosshair },
      ],
    },
  ];
  return (
    <div className="stats-comparison">
      {groups.map((group) => (
        <section className={`stats-group ${group.className}`} key={group.title}>
          <header><strong>{group.title}</strong><span>{group.note}</span></header>
          <div className="stats-grid">
            {group.cards.map(({ label, value, suffix, icon: Icon }) => (
              <article className="stat-card" key={label}>
                <Icon size={19} />
                <div><strong>{value}{suffix}</strong><span>{label}</span></div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
