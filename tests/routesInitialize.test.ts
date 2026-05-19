import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("initialize route", () => {
  it("initializes profile from known VDOT", async () => {
    const app = buildServer({ databasePath: ":memory:" });
    const response = await app.inject({
      method: "POST",
      url: "/coach/initialize",
      payload: {
        userId: "default",
        goalRace: "10K",
        goalTimeSeconds: 2700,
        knownVdot: 45,
        recentRuns: [],
        recentRecovery: [],
        recentManualEvents: []
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().estimatedVdot).toBe(45);
    expect(response.json().message).toContain("初始化完成");
  });
});
