import { Filter, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { PaginatedPredictions, PublicStats } from "../../shared/domain";
import { TEAMS } from "../../shared/teams";
import { api } from "../api";
import { HistoryCards } from "../components/HistoryCards";
import { StatsPanel } from "../components/StatsPanel";

const EMPTY: PaginatedPredictions = { items: [], page: 1, pageSize: 12, total: 0, totalPages: 0 };
const EMPTY_STATS: PublicStats = {
  settledOfficial: 0,
  outcomeHits: 0,
  exactScoreHits: 0,
  outcomeRate: null,
  exactScoreRate: null,
  backtestCount: 0,
  backtestOutcomeHits: 0,
  backtestExactScoreHits: 0,
  backtestOutcomeRate: null,
  backtestExactScoreRate: null,
  updatedAt: null,
};

export function HistoryPage() {
  const [data, setData] = useState(EMPTY);
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(EMPTY_STATS);

  function load(
    page = 1,
    filters = { team, status, source },
  ) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "12" });
    if (filters.team) params.set("team", filters.team);
    if (filters.status) params.set("status", filters.status);
    if (filters.source) params.set("source", filters.source);
    api.predictions(params)
      .then(setData)
      .catch(() => setData(EMPTY))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.stats().then(setStats).catch(() => undefined);
  }, []);

  return (
    <section className="page-section">
      <div className="page-hero">
        <span className="eyebrow">VERIFIABLE RECORD</span>
        <h1>每一场，都留下预测时间</h1>
        <p>公开预测比分、实际比分和命中结果。赛前官方预测与赛后回测严格分开统计。</p>
      </div>
      <StatsPanel stats={stats} />
      <p className="comparison-note">当前已结束比赛为赛后回测，用同一模型模拟赛前判断；它们不属于赛前锁定记录，不能与未来官方预测混为一谈。</p>
      <div className="filter-bar">
        <Filter size={18} />
        <select value={team} onChange={(event) => setTeam(event.target.value)}>
          <option value="">全部球队</option>
          {TEAMS.map((item) => <option key={item.name}>{item.name}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">全部结果</option>
          <option value="hit">赛果命中</option>
          <option value="miss">赛果未中</option>
          <option value="pending">待结算</option>
        </select>
        <select value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="">全部类型</option>
          <option value="official">官方预测</option>
          <option value="backtest">历史回测</option>
        </select>
        <button onClick={() => load()} disabled={loading}>{loading ? "查询中" : "应用筛选"}</button>
        <button className="reset-button" onClick={() => { setTeam(""); setStatus(""); setSource(""); load(1, { team: "", status: "", source: "" }); }}><RotateCcw size={15} /></button>
      </div>
      <div className="record-summary">共 {data.total} 条记录</div>
      <HistoryCards records={data.items} />
      {data.totalPages > 1 && (
        <div className="pagination">
          <button disabled={data.page <= 1} onClick={() => load(data.page - 1)}>上一页</button>
          <span>{data.page} / {data.totalPages}</span>
          <button disabled={data.page >= data.totalPages} onClick={() => load(data.page + 1)}>下一页</button>
        </div>
      )}
    </section>
  );
}
