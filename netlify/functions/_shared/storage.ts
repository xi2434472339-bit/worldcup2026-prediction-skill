import { getStore } from "@netlify/blobs";
import type {
  AccessCode,
  AuditEntry,
  FixturePredictionCache,
  FixtureRecord,
  OfficialPredictionJob,
  PredictionRecord,
  UsageState,
} from "../../../shared/domain";

const STORE_NAME = "gova-prediction";

function store() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

async function getJSON<T>(key: string): Promise<T | null> {
  return (await store().get(key, { type: "json" })) as T | null;
}

async function setJSON(key: string, value: unknown) {
  await store().setJSON(key, value);
}

async function indexedSave<T extends { id: string }>(
  prefix: string,
  indexKey: string,
  value: T,
) {
  await setJSON(`${prefix}/${value.id}`, value);
  const index = (await getJSON<string[]>(indexKey)) ?? [];
  if (!index.includes(value.id)) {
    index.unshift(value.id);
    await setJSON(indexKey, index);
  }
}

async function indexedList<T>(prefix: string, indexKey: string) {
  const index = (await getJSON<string[]>(indexKey)) ?? [];
  const values = await Promise.all(index.map((id) => getJSON<T>(`${prefix}/${id}`)));
  return values.filter((value): value is T => Boolean(value));
}

export const db = {
  getUsage: (id: string) => getJSON<UsageState>(`usage/${id}`),
  saveUsage: (value: UsageState) => setJSON(`usage/${value.id}`, value),

  getCode: (hash: string) => getJSON<AccessCode>(`codes/${hash}`),
  saveCode: (value: AccessCode) =>
    indexedSave("codes", "indexes/codes", { ...value, id: value.codeHash } as AccessCode & { id: string }),
  listCodes: async () => {
    const values = await indexedList<AccessCode & { id?: string }>("codes", "indexes/codes");
    return values.map(({ id: _id, ...value }) => value);
  },

  getPrediction: (id: string) => getJSON<PredictionRecord>(`predictions/${id}`),
  savePrediction: (value: PredictionRecord) =>
    indexedSave("predictions", "indexes/predictions", value),
  listPredictions: () =>
    indexedList<PredictionRecord>("predictions", "indexes/predictions"),

  getFixture: (id: string) => getJSON<FixtureRecord>(`fixtures/${id}`),
  saveFixture: (value: FixtureRecord) =>
    indexedSave("fixtures", "indexes/fixtures", { ...value, id: value.fixtureId } as FixtureRecord & { id: string }),
  listFixtures: async () => {
    const values = await indexedList<FixtureRecord & { id?: string }>("fixtures", "indexes/fixtures");
    return values.map(({ id: _id, ...value }) => value);
  },

  getFixturePredictionCache: (fixtureId: string) =>
    getJSON<FixturePredictionCache>(`prediction-cache/${fixtureId}`),
  saveFixturePredictionCache: (value: FixturePredictionCache) =>
    setJSON(`prediction-cache/${value.fixtureId}`, value),

  getOfficialPredictionJob: (fixtureId: string) =>
    getJSON<OfficialPredictionJob>(`official-jobs/${fixtureId}`),
  saveOfficialPredictionJob: (value: OfficialPredictionJob) =>
    setJSON(`official-jobs/${value.fixtureId}`, value),

  saveAudit: (value: AuditEntry) => indexedSave("audit", "indexes/audit", value),
  listAudit: () => indexedList<AuditEntry>("audit", "indexes/audit"),
};
