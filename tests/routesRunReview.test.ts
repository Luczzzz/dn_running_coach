import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("run review route", () => {
  it("reviews a completed run", async () => {
    const app = buildServer({ databasePath: ":memory:" });
    const response = await app.inject({
      method: "POST",
      url: "/coach/run-review",
      payload: {
        plannedType: "E",
        currentVdot: 45,
        run: {
          id: "run-1",
          startedAt: "2026-05-19T12:00:00.000Z",
          durationMinutes: 45,
          distanceKm: 9,
          averagePaceSecondsPerKm: 300,
          averageHeartRate: 168,
          perceivedEffort: "hard",
          notes: ""
        },
        recentContextNotes: ["昨晚睡眠差"]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain("跑后复盘");
    expect(response.json().review.deviations.join(" ")).toContain("偏快");
  });
});
