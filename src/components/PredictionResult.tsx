import { Gauge, Sparkles, UserRoundSearch } from "lucide-react";
import type { PredictionPayload } from "../../shared/domain";

export function PredictionResult({
  prediction,
  official,
}: {
  prediction: PredictionPayload;
  official: boolean;
}) {
  return (
    <section className="prediction-result">
      <div className="result-heading">
        <div>
          <span className="eyebrow"><Sparkles size={15} />{official ? "赛前锁定的官方预测" : "本次 AI 分析"}</span>
          <h2>{prediction.teamA.name} <span>VS</span> {prediction.teamB.name}</h2>
        </div>
        <div className="confidence"><Gauge size={18} />置信度 {prediction.confidence}</div>
      </div>
      <div className="score-hero">
        <div><strong>{prediction.teamA.winProb}%</strong><span>{prediction.teamA.name}胜</span></div>
        <div className="predicted-score"><strong>{prediction.predictedScore}</strong><span>预测比分</span></div>
        <div><strong>{prediction.teamB.winProb}%</strong><span>{prediction.teamB.name}胜</span></div>
      </div>
      <div className="draw-meter"><span style={{ width: `${prediction.draw}%` }} /><small>平局概率 {prediction.draw}%</small></div>
      <div className="analysis-block">
        <p>{prediction.analysis}</p>
        <div className="factor-list">{prediction.keyFactors.map((factor) => <span key={factor}>{factor}</span>)}</div>
      </div>
      <div className="players">
        <h3><UserRoundSearch size={18} />关键球员</h3>
        {prediction.playersToWatch.map((player) => (
          <div key={`${player.team}-${player.player}`}>
            <span>{player.team}</span>
            <strong>{player.player}</strong>
            <small>{player.reason}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
