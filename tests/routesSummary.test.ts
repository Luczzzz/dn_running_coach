import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("summary routes", () => {
  it("returns weekly summary", async () => {
    const app = buildServer({ databasePath: ":memory:" });
    const response = await app.inject({
      method: "POST",
      url: "/coach/summary/weekly",
      payload: {
        periodStart: "2026-05-13",
        periodEnd: "2026-05-19",
        totalRunKm: 32,
        qualitySessions: 1,
        manualEvents: []
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain("周总结");
  });

  it("returns monthly summary", async () => {
    const app = buildServer({ databasePath: ":memory:" });
    const response = await app.inject({
      method: "POST",
      url: "/coach/summary/monthly",
      payload: {
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        totalRunKm: 120,
        currentVdot: 45,
        manualEventCount: 4
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain("月总结");
  });

  it("returns cycle summary", async () => {
    const app = buildServer({ databasePath: ":memory:" });
    const response = await app.inject({
      method: "POST",
      url: "/coach/summary/cycle",
      payload: {
        periodStart: "2026-04-01",
        periodEnd: "2026-05-31",
        cycleGoal: "10K threshold block",
        completedQualitySessions: 8,
        currentVdot: 45
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain("周期总结");
  });
});
