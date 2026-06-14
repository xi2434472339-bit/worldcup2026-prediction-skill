import { ChevronDown, FlaskConical } from "lucide-react";
import { useState } from "react";
import { STAGES, type Stage } from "../../shared/domain";
import { TEAMS } from "../../shared/teams";

export function CustomPrediction({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (teamA: string, teamB: string, stage: Stage) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [teamA, setTeamA] = useState("阿根廷");
  const [teamB, setTeamB] = useState("西班牙");
  const [stage, setStage] = useState<Stage>("小组赛");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (teamA === teamB) return setError("请选择两支不同的球队");
    setError("");
    await onSubmit(teamA, teamB, stage);
  }

  return (
    <details className="custom-prediction" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span><FlaskConical size={17} />自定义对阵</span>
        <small>不计入公开战绩</small>
        <ChevronDown size={17} />
      </summary>
      <form onSubmit={submit}>
        <select value={teamA} onChange={(event) => setTeamA(event.target.value)}>
          {TEAMS.map((team) => <option key={team.name}>{team.name}</option>)}
        </select>
        <span>VS</span>
        <select value={teamB} onChange={(event) => setTeamB(event.target.value)}>
          {TEAMS.map((team) => <option key={team.name}>{team.name}</option>)}
        </select>
        <select value={stage} onChange={(event) => setStage(event.target.value as Stage)}>
          {STAGES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button disabled={loading}>{loading ? "分析中" : "自定义预测"}</button>
      </form>
      {error && <p className="form-error">{error}</p>}
    </details>
  );
}
