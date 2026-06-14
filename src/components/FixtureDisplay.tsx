import { CalendarClock, ChevronRight, CircleDot, LockKeyhole } from "lucide-react";
import type { FixtureRecord } from "../../shared/domain";
import { canPredictFixture, isFinishedFixture, isLiveFixture } from "../../shared/fixtures";
import { teamFlag } from "../../shared/teams";

export function formatBeijingKickoff(fixture: FixtureRecord, includeDate = true) {
  const date = new Date(fixture.kickoff);
  if (!fixture.kickoffConfirmed) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date) + " · 时间待同步";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: includeDate ? "2-digit" : undefined,
    day: includeDate ? "2-digit" : undefined,
    weekday: includeDate ? "short" : undefined,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function fixtureStatus(fixture: FixtureRecord) {
  if (isFinishedFixture(fixture)) return "已结束";
  if (isLiveFixture(fixture)) return "比赛进行中";
  if (!fixture.teamAConfirmed || !fixture.teamBConfirmed) return "对阵待定";
  return "未开赛";
}

function TeamVisual({
  name,
  flagCode,
  logoUrl,
  confirmed,
}: {
  name: string;
  flagCode?: string;
  logoUrl?: string;
  confirmed: boolean;
}) {
  return (
    <div className="fixture-team">
      <div className={`fixture-emblem ${confirmed ? "" : "placeholder"}`}>
        {flagCode ? (
          <span>{teamFlag(flagCode)}</span>
        ) : logoUrl ? (
          <img src={logoUrl} alt="" />
        ) : (
          <strong>?</strong>
        )}
      </div>
      <strong>{name}</strong>
      <small>{confirmed ? "已确定" : "晋级席位"}</small>
    </div>
  );
}

export function FixtureHero({
  fixture,
  loading,
  loadingLabel,
  credits,
  error,
  onPredict,
}: {
  fixture: FixtureRecord | null;
  loading: boolean;
  loadingLabel?: string;
  credits: number;
  error: string;
  onPredict: () => void;
}) {
  if (!fixture) {
    return (
      <section className="fixture-hero empty-fixture">
        <CalendarClock size={30} />
        <h2>未来三天暂无比赛</h2>
        <p>赛程更新后会自动显示下一场已知对阵。</p>
      </section>
    );
  }
  const predictable = canPredictFixture(fixture);
  return (
    <section className="fixture-hero">
      <div className="fixture-hero-top">
        <span>第 {fixture.matchNumber} 场 · {fixture.roundLabel}</span>
        <span className={`fixture-status ${isLiveFixture(fixture) ? "live" : ""}`}>
          <CircleDot size={12} />{fixtureStatus(fixture)}
        </span>
        <span className="credits">剩余 <b>{credits}</b> 次</span>
      </div>
      <div className="fixture-versus-grid">
        <TeamVisual
          name={fixture.teamA}
          flagCode={fixture.teamAFlag}
          logoUrl={fixture.teamALogo}
          confirmed={fixture.teamAConfirmed}
        />
        <div className="fixture-center">
          <span>VS</span>
          <time>{formatBeijingKickoff(fixture)}</time>
          <small>北京时间</small>
        </div>
        <TeamVisual
          name={fixture.teamB}
          flagCode={fixture.teamBFlag}
          logoUrl={fixture.teamBLogo}
          confirmed={fixture.teamBConfirmed}
        />
      </div>
      <button className="fixture-predict-button" disabled={!predictable || loading} onClick={onPredict}>
        {loading ? <><span className="spinner" />{loadingLabel || "GPT-5.5 正在分析"}</> : predictable ? <>开始预测<ChevronRight size={19} /></> : <><LockKeyhole size={17} />{fixtureStatus(fixture)}</>}
      </button>
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

export function FixtureList({
  fixtures,
  selectedId,
  onSelect,
}: {
  fixtures: FixtureRecord[];
  selectedId?: string;
  onSelect: (fixture: FixtureRecord) => void;
}) {
  if (!fixtures.length) {
    return <div className="fixture-list-empty">这个阶段在未来三天没有比赛</div>;
  }
  return (
    <div className="fixture-strip">
      {fixtures.map((fixture) => (
        <button
          key={fixture.fixtureId}
          className={`fixture-mini-card ${selectedId === fixture.fixtureId ? "selected" : ""}`}
          onClick={() => onSelect(fixture)}
        >
          <span className="fixture-mini-time">{formatBeijingKickoff(fixture)}</span>
          <div>
            <strong>{fixture.teamAFlag ? teamFlag(fixture.teamAFlag) : "·"} {fixture.teamA}</strong>
            <b>VS</b>
            <strong>{fixture.teamBFlag ? teamFlag(fixture.teamBFlag) : "·"} {fixture.teamB}</strong>
          </div>
          <small>{fixture.roundLabel} · {fixtureStatus(fixture)}</small>
        </button>
      ))}
    </div>
  );
}
