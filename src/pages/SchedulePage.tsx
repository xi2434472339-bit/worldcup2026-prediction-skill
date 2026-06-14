import { CalendarDays, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { STAGES, type FixtureRecord } from "../../shared/domain";
import { beijingDateKey, FIFA_FALLBACK_FIXTURES } from "../../shared/fixtures";
import { api } from "../api";
import { FixtureList } from "../components/FixtureDisplay";

function dateHeading(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${dateKey}T12:00:00+08:00`));
}

export function SchedulePage() {
  const [fixtures, setFixtures] = useState<FixtureRecord[]>(FIFA_FALLBACK_FIXTURES);
  const [stage, setStage] = useState("小组赛");
  const [usingFallback, setUsingFallback] = useState(true);

  useEffect(() => {
    api.fixtures().then((result) => {
      setFixtures(result.items);
      setUsingFallback(result.usingFallback);
    }).catch(() => undefined);
  }, []);

  const groups = useMemo(() => {
    const stageFixtures = fixtures.filter((fixture) => fixture.stage === stage);
    return stageFixtures.reduce<Map<string, FixtureRecord[]>>((result, fixture) => {
      const key = beijingDateKey(fixture.kickoff);
      const values = result.get(key) ?? [];
      values.push(fixture);
      result.set(key, values);
      return result;
    }, new Map());
  }, [fixtures, stage]);

  return (
    <section className="page-section schedule-page">
      <div className="page-hero">
        <span className="eyebrow"><CalendarDays size={15} />FULL TOURNAMENT SCHEDULE</span>
        <h1>2026 世界杯完整赛程</h1>
        <p>从小组赛到决赛。淘汰赛球队产生后，晋级席位会自动替换为真实对阵。</p>
        {usingFallback && <span className="fallback-notice"><Clock3 size={14} />当前显示 FIFA 静态赛程模板，准确开球时间等待接口同步</span>}
      </div>
      <div className="stage-tabs schedule-tabs">
        {STAGES.map((item) => <button key={item} className={stage === item ? "active" : ""} onClick={() => setStage(item)}>{item}</button>)}
      </div>
      <div className="schedule-days">
        {[...groups.entries()].map(([dateKey, dayFixtures]) => (
          <section key={dateKey} className="schedule-day">
            <h2>{dateHeading(dateKey)}<span>{dayFixtures.length} 场</span></h2>
            <FixtureList fixtures={dayFixtures} onSelect={() => undefined} />
          </section>
        ))}
      </div>
    </section>
  );
}
