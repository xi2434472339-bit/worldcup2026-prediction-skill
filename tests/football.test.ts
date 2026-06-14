import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOfficialPredictionWindow } from "../netlify/functions/_shared/football.ts";

describe("official prediction lock window", () => {
  const kickoff = "2026-06-14T12:00:00.000Z";

  it("opens three hours before kickoff", () => {
    assert.equal(isOfficialPredictionWindow(kickoff, new Date("2026-06-14T09:00:00.000Z")), true);
  });

  it("stays open until thirty minutes before kickoff", () => {
    assert.equal(isOfficialPredictionWindow(kickoff, new Date("2026-06-14T11:30:00.000Z")), true);
  });

  it("does not create an official prediction after the cutoff", () => {
    assert.equal(isOfficialPredictionWindow(kickoff, new Date("2026-06-14T11:31:00.000Z")), false);
  });

  it("does not create an official prediction too early", () => {
    assert.equal(isOfficialPredictionWindow(kickoff, new Date("2026-06-14T08:59:59.000Z")), false);
  });
});
