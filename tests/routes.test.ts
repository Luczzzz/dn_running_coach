import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("coach routes", () => {
  it("initializes a profile and returns daily advice", async () => {
    const app = buildServer({ databasePath: ":memory:" });

    const initResponse = await app.inject({
      method: "POST",
      url: "/coach/profile",
      payload: {
        id: "default",
        goalRace: "10K",
        goalTimeSeconds: 2700,
        currentVdot: 45,
        injuryNotes: [],
        preferredTrainingDays: ["Tue", "Thu", "Sun"],
        createdAt: "2026-05-19T00:00:00.000Z",
        updatedAt: "2026-05-19T00:00:00.000Z"
      }
    });

    expect(initResponse.statusCode).toBe(200);

    const adviceResponse = await app.inject({
      method: "POST",
      url: "/coach/daily-advice",
      payload: {
        userId: "default",
        date: "2026-05-19",
        availableMinutes: 45,
        sleepQuality: "good",
        fatigue: "low"
      }
    });

    expect(adviceResponse.statusCode).toBe(200);
    expect(adviceResponse.json().ok).toBe(true);
    expect(adviceResponse.json().message).toContain("今日建议");
  });

  it("accepts manual event messages", async () => {
    const app = buildServer({ databasePath: ":memory:" });

    const response = await app.inject({
      method: "POST",
      url: "/coach/manual-event",
      payload: {
        userId: "default",
        event: {
          type: "basketball",
          occurredAt: "2026-05-19T12:00:00.000Z",
          durationMinutes: 90,
          intensity: "hard",
          lowerBodyLoad: "high",
          notes: "小腿紧",
          affectsNextRun: true
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
