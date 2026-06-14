import { BarChart3, Crosshair, Database, TimerReset } from "lucide-react";
import type { PublicStats } from "../../shared/domain";

function displayRate(value: number | null) {
  return value === null ? "--" : `${value}%`;
}

export function StatsPanel({ stats }: { stats: PublicStats }) {
  const cards = [
    { label: "已结算官方预测", value: stats.settledOfficial, suffix: "场", icon: Database },
    { label: "胜平负命中率", value: displayRate(stats.outcomeRate), suffix: "", icon: BarChart3 },
    { label: "精确比分命中率", value: displayRate(stats.exactScoreRate), suffix: "", icon: Crosshair },
    { label: "历史回测", value: stats.backtestCount, suffix: "场", icon: TimerReset },
  ];
  return (
    <div className="stats-grid">
      {cards.map(({ label, value, suffix, icon: Icon }) => (
        <article className="stat-card" key={label}>
          <Icon size={19} />
          <div><strong>{value}{suffix}</strong><span>{label}</span></div>
        </article>
      ))}
    </div>
  );
}
