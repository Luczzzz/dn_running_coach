import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("coach routes", () => {
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
