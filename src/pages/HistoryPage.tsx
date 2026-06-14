import { Filter, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { PaginatedPredictions } from "../../shared/domain";
import { TEAMS } from "../../shared/teams";
import { api } from "../api";
import { HistoryCards } from "../components/HistoryCards";

const EMPTY: PaginatedPredictions = { items: [], page: 1, pageSize: 12, total: 0, totalPages: 0 };

export function HistoryPage() {
  const [data, setData] = useState(EMPTY);
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);

  function load(
    page = 1,
    filters = { team, status, source },
  ) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "12" });
    if (filters.team) params.set("team", filters.team);
    if (filters.status) params.set("status", filters.status);
    if (filters.source) params.set("source", filters.source);
    api.predictions(params).then(setData).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="page-section">
      <div className="page-hero">
        <span className="eyebrow">VERIFIABLE RECORD</span>
        <h1>每一场，都留下预测时间</h1>
        <p>公开赛前概率、预测比分与实际结果。官方预测和赛后回测严格分开。</p>
      </div>
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
