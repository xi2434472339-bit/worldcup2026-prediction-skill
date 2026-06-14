import { ArrowRight, BrainCircuit, CalendarDays, LockKeyhole, ShieldCheck, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { STAGES, type FixtureRecord, type PredictionPayload, type PublicStats, type Stage } from "../../shared/domain";
import { FIFA_FALLBACK_FIXTURES, fixturesForHome } from "../../shared/fixtures";
import { api, type BootstrapResponse } from "../api";
import { CustomPrediction } from "../components/CustomPrediction";
import { FixtureHero, FixtureList } from "../components/FixtureDisplay";
import { HistoryCards } from "../components/HistoryCards";
import { PredictionResult } from "../components/PredictionResult";
import { PurchaseModal } from "../components/PurchaseModal";
import { StatsPanel } from "../components/StatsPanel";

const EMPTY_STATS: PublicStats = {
  settledOfficial: 0,
  outcomeHits: 0,
  exactScoreHits: 0,
  outcomeRate: null,
  exactScoreRate: null,
  backtestCount: 0,
  updatedAt: null,
};

const FALLBACK_HOME = fixturesForHome(FIFA_FALLBACK_FIXTURES);

export function HomePage() {
  const [fixtures, setFixtures] = useState<FixtureRecord[]>(FALLBACK_HOME);
  const [selectedId, setSelectedId] = useState(FALLBACK_HOME[0]?.fixtureId ?? "");
  const [stageFilter, setStageFilter] = useState("全部");
  const [prediction, setPrediction] = useState<PredictionPayload | null>(null);
  const [official, setOfficial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");
  const [error, setError] = useState("");
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapResponse>({
    stats: EMPTY_STATS,
    recent: [],
    remaining: 3,
    contactWechat: "",
    paymentQrUrl: "",
  });

  useEffect(() => {
    api.bootstrap().then(setBootstrap).catch(() => undefined);
    const params = new URLSearchParams({ window: "home" });
    api.fixtures(params).then((result) => {
      setFixtures(result.items);
      setSelectedId((current) =>
        result.items.some((fixture) => fixture.fixtureId === current)
          ? current
          : result.items[0]?.fixtureId ?? "",
      );
    }).catch(() => undefined);
  }, []);

  const filteredFixtures = useMemo(
    () => stageFilter === "全部" ? fixtures : fixtures.filter((fixture) => fixture.stage === stageFilter),
    [fixtures, stageFilter],
  );
  const selectedFixture =
    filteredFixtures.find((fixture) => fixture.fixtureId === selectedId) ??
    filteredFixtures[0] ??
    fixtures[0] ??
    null;

  function selectFixture(fixture: FixtureRecord) {
    setSelectedId(fixture.fixtureId);
    setPrediction(null);
    setError("");
    window.scrollTo({ top: 100, behavior: "smooth" });
  }

  async function waitForOfficial(
    fixtureId: string,
    payload: Parameters<typeof api.predict>[0],
    initialDelay: number,
  ) {
    let delay = Math.max(1000, initialDelay);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
      const status = await api.predictionStatus(fixtureId);
      if (status.status === "ready") {
        const result = await api.predict(payload);
        if (result.status === "ready") return result;
      }
      if (status.status === "failed") {
        throw new Error(status.message || "官方预测生成失败，请稍后重试");
      }
      delay = Math.max(1000, status.retryAfterMs || 3000);
    }
    throw new Error("官方预测仍在生成，请稍后再试");
  }

  async function runPrediction(payload: Parameters<typeof api.predict>[0]) {
    setLoading(true);
    setLoadingLabel("GPT-5.5 正在分析");
    setError("");
    try {
      let result = await api.predict(payload);
      if (result.status === "generating") {
        setLoadingLabel("官方预测高推理生成中");
        result = await waitForOfficial(
          result.fixtureId,
          payload,
          result.retryAfterMs,
        );
      }
      setPrediction(result.prediction);
      setOfficial(result.official);
      setBootstrap((current) => ({ ...current, remaining: result.remaining }));
      requestAnimationFrame(() => document.querySelector(".prediction-result")?.scrollIntoView({ behavior: "smooth" }));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "预测失败";
      setError(message);
      if (message.includes("次数")) setPurchaseOpen(true);
    } finally {
      setLoading(false);
      setLoadingLabel("");
    }
  }

  return (
    <>
      <section className="schedule-hero">
        <div className="schedule-intro">
          <span className="eyebrow"><Trophy size={15} />2026 世界杯 AI 赛前研判</span>
          <h1>真实赛程，<em>逐场预测</em></h1>
          <p>比赛对阵和晋级路线由赛程自动同步。选择真实比赛，查看戈瓦预测的赛前判断。</p>
          <div className="trust-row">
            <span><LockKeyhole size={16} />赛前官方版本锁定</span>
            <span><ShieldCheck size={16} />禁止博彩建议</span>
            <span><BrainCircuit size={16} />GPT-5.5 推理</span>
          </div>
        </div>
        <FixtureHero
          fixture={selectedFixture}
          loading={loading}
          loadingLabel={loadingLabel}
          credits={bootstrap.remaining}
          error={error}
          onPredict={() => selectedFixture && runPrediction({ mode: "fixture", fixtureId: selectedFixture.fixtureId })}
        />
      </section>

      <section className="upcoming-section">
        <div className="section-heading compact">
          <div><span className="eyebrow">NEXT 3 DAYS</span><h2>未来三天赛程</h2></div>
          <Link to="/schedule">查看完整赛程<ArrowRight size={16} /></Link>
        </div>
        <div className="stage-tabs">
          {["全部", ...STAGES].map((stage) => (
            <button
              key={stage}
              className={stageFilter === stage ? "active" : ""}
              onClick={() => {
                setStageFilter(stage);
                const first = stage === "全部" ? fixtures[0] : fixtures.find((fixture) => fixture.stage === stage);
                if (first) setSelectedId(first.fixtureId);
              }}
            >
              {stage}
            </button>
          ))}
        </div>
        <FixtureList fixtures={filteredFixtures} selectedId={selectedFixture?.fixtureId} onSelect={selectFixture} />
        <CustomPrediction
          loading={loading}
          onSubmit={(teamA, teamB, stage) => runPrediction({ mode: "custom", teamA, teamB, stage })}
        />
      </section>

      {prediction && <PredictionResult prediction={prediction} official={official} />}

      <section className="proof-section">
        <div className="section-heading">
          <div><span className="eyebrow">PUBLIC TRACK RECORD</span><h2>公开战绩，不只展示赢的</h2></div>
          <p>官方准确率只统计开赛前锁定的预测。自定义预测和赛后回测均不混入正式数据。</p>
        </div>
        <StatsPanel stats={bootstrap.stats} />
        <HistoryCards records={bootstrap.recent} />
        <Link className="outline-button" to="/history">查看全部预测记录<ArrowRight size={17} /></Link>
      </section>

      <section className="pricing-section" id="pricing">
        <div>
          <span className="eyebrow"><CalendarDays size={14} />FRIENDS PASS</span>
          <h2>跟着赛程，一场不落</h2>
          <p>新用户可免费体验 3 次。需要更多预测时，使用兑换码补充额度。</p>
        </div>
        <div className="price-card">
          <span>朋友专享</span>
          <div><small>¥</small><strong>9.9</strong></div>
          <p>30 次完整预测</p>
          <button className="primary-button" onClick={() => setPurchaseOpen(true)}>获取兑换码</button>
        </div>
      </section>

      <PurchaseModal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        contactWechat={bootstrap.contactWechat}
        paymentQrUrl={bootstrap.paymentQrUrl}
        onRedeemed={(remaining) => setBootstrap((current) => ({ ...current, remaining }))}
      />
    </>
  );
}
