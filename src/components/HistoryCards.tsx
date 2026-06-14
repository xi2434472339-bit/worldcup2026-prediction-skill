import { Check, Clock3, X } from "lucide-react";
import type { PredictionRecord } from "../../shared/domain";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function HistoryCards({ records }: { records: PredictionRecord[] }) {
  if (!records.length) {
    return (
      <div className="empty-state">
        <Clock3 />
        <strong>官方战绩正在积累</strong>
        <p>只有开赛前锁定、赛后完成结算的预测才会进入命中率。</p>
      </div>
    );
  }
  return (
    <div className="history-list">
      {records.map((record) => (
        <article className="history-card" key={record.id}>
          <div className="history-meta">
            <span className={`source-tag ${record.source}`}>
              {record.source === "official" ? "官方预测" : "历史回测"}
            </span>
            <time>{formatDate(record.kickoff)}</time>
          </div>
          <div className="history-match">
            <strong>{record.prediction.teamA.name}</strong>
            <div className="score-stack">
              <span>{record.prediction.predictedScore}</span>
              <small>预测比分</small>
            </div>
            <strong>{record.prediction.teamB.name}</strong>
          </div>
          <div className="probability-row">
            <span>胜 {record.prediction.teamA.winProb}%</span>
            <span>平 {record.prediction.draw}%</span>
            <span>负 {record.prediction.teamB.winProb}%</span>
          </div>
          {record.result ? (
            <div className="result-row">
              <span>实际比分 {record.result.home}-{record.result.away}</span>
              <span className={record.outcomeHit ? "hit" : "miss"}>
                {record.outcomeHit ? <Check size={15} /> : <X size={15} />}
                {record.outcomeHit ? "赛果命中" : "赛果未中"}
              </span>
              {record.exactScoreHit && <span className="exact-hit">精确比分命中</span>}
            </div>
          ) : (
            <div className="result-row pending"><Clock3 size={15} />等待比赛结算</div>
          )}
          {record.source === "backtest" && (
            <p className="backtest-note">赛后模拟，不计入官方命中率</p>
          )}
        </article>
      ))}
    </div>
  );
}
