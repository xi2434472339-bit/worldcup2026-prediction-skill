import { Ban, KeyRound, LogIn, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { STAGES, type AccessCode, type PredictionRecord, type Stage } from "../../shared/domain";
import { TEAMS } from "../../shared/teams";
import { api } from "../api";

interface AdminSnapshot {
  codes: AccessCode[];
  predictions: PredictionRecord[];
  generationUsage: {
    calls: number;
    promptTokens: number;
    completionTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    cost: number;
  };
}

const EMPTY_USAGE: AdminSnapshot["generationUsage"] = {
  calls: 0,
  promptTokens: 0,
  completionTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
  cost: 0,
};

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [snapshot, setSnapshot] = useState<AdminSnapshot>({
    codes: [],
    predictions: [],
    generationUsage: EMPTY_USAGE,
  });
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [backtest, setBacktest] = useState({
    teamA: "墨西哥",
    teamB: "南非",
    stage: "小组赛" as Stage,
    kickoff: "",
    score: "",
  });

  async function login(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.adminLogin(password);
      setAuthenticated(true);
      setPassword("");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败");
    }
  }

  async function refresh() {
    const data = await api.admin<AdminSnapshot>("snapshot");
    setSnapshot(data);
  }

  async function generateCodes() {
    const result = await api.admin<{ codes: string[] }>("generate-codes", { count: 5, credits: 30 });
    setGeneratedCodes(result.codes);
    await refresh();
  }

  async function disableCode(codeHash: string) {
    await api.admin("disable-code", { codeHash });
    await refresh();
  }

  async function correctResult(record: PredictionRecord) {
    const value = window.prompt("输入 90 分钟实际比分，例如 2-1");
    if (!value) return;
    const match = /^(\d{1,2})-(\d{1,2})$/.exec(value.trim());
    if (!match) return setMessage("比分格式不正确");
    await api.admin("correct-result", {
      recordId: record.id,
      home: Number(match[1]),
      away: Number(match[2]),
    });
    await refresh();
  }

  async function generateBacktest(event: React.FormEvent) {
    event.preventDefault();
    const score = /^(\d{1,2})-(\d{1,2})$/.exec(backtest.score.trim());
    if (!score) return setMessage("请输入有效的实际比分，例如 2-1");
    try {
      setMessage("正在生成历史回测...");
      await api.admin("generate-backtest", {
        teamA: backtest.teamA,
        teamB: backtest.teamB,
        stage: backtest.stage,
        kickoff: backtest.kickoff,
        home: Number(score[1]),
        away: Number(score[2]),
      });
      setMessage("历史回测已生成，并标记为不计入官方准确率");
      setBacktest((value) => ({ ...value, score: "" }));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    }
  }

  if (!authenticated) {
    return (
      <section className="admin-login">
        <form onSubmit={login}>
          <span className="admin-icon"><ShieldCheck /></span>
          <h1>戈瓦后台</h1>
          <p>管理兑换码、比赛结果和回测记录。</p>
          <label>管理员密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="primary-button"><LogIn size={17} />登录</button>
          {message && <p className="form-error">{message}</p>}
        </form>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="admin-heading">
        <div><span className="eyebrow">PRIVATE CONSOLE</span><h1>运营管理台</h1></div>
        <button onClick={refresh}><RefreshCw size={16} />刷新</button>
      </div>
      <div className="admin-actions">
        <article>
          <KeyRound />
          <div><h2>生成兑换码</h2><p>默认每个兑换码包含 30 次预测。</p></div>
          <button onClick={generateCodes}>生成 5 个</button>
        </article>
        {generatedCodes.length > 0 && <pre>{generatedCodes.join("\n")}</pre>}
      </div>
      <section className="admin-table-section">
        <h2>GPT-5.5 调用统计</h2>
        <p className="admin-help">
          {snapshot.generationUsage.calls} 次调用 ·{" "}
          {snapshot.generationUsage.totalTokens.toLocaleString()} tokens ·
          推理 tokens {snapshot.generationUsage.reasoningTokens.toLocaleString()} ·
          OpenRouter 成本 ${snapshot.generationUsage.cost.toFixed(4)}
        </p>
      </section>
      <section className="admin-table-section">
        <h2>生成历史回测</h2>
        <p className="admin-help">仅用于展示赛后模拟，系统不会把这些记录计入官方命中率。</p>
        <form className="backtest-form" onSubmit={generateBacktest}>
          <select value={backtest.teamA} onChange={(event) => setBacktest({ ...backtest, teamA: event.target.value })}>
            {TEAMS.map((team) => <option key={team.name}>{team.name}</option>)}
          </select>
          <select value={backtest.teamB} onChange={(event) => setBacktest({ ...backtest, teamB: event.target.value })}>
            {TEAMS.map((team) => <option key={team.name}>{team.name}</option>)}
          </select>
          <select value={backtest.stage} onChange={(event) => setBacktest({ ...backtest, stage: event.target.value as Stage })}>
            {STAGES.map((stage) => <option key={stage}>{stage}</option>)}
          </select>
          <input type="datetime-local" value={backtest.kickoff} onChange={(event) => setBacktest({ ...backtest, kickoff: event.target.value })} required />
          <input placeholder="实际比分 2-1" value={backtest.score} onChange={(event) => setBacktest({ ...backtest, score: event.target.value })} required />
          <button><Save size={15} />生成回测</button>
        </form>
        {message && <p className="admin-message">{message}</p>}
      </section>
      <section className="admin-table-section">
        <h2>兑换码</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>预览</th><th>次数</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
            <tbody>{snapshot.codes.map((code) => <tr key={code.codeHash}><td>{code.codePreview}</td><td>{code.credits}</td><td>{code.status}</td><td>{new Date(code.createdAt).toLocaleString()}</td><td><button disabled={code.status !== "active"} onClick={() => disableCode(code.codeHash)}><Ban size={14} />停用</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="admin-table-section">
        <h2>预测与赛果</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>对阵</th><th>类型</th><th>预测</th><th>实际</th><th>操作</th></tr></thead>
            <tbody>{snapshot.predictions.map((record) => <tr key={record.id}><td>{record.prediction.teamA.name} vs {record.prediction.teamB.name}</td><td>{record.source}</td><td>{record.prediction.predictedScore}</td><td>{record.result ? `${record.result.home}-${record.result.away}` : "待结算"}</td><td><button onClick={() => correctResult(record)}><Save size={14} />修正赛果</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
