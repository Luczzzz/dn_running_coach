import { describe, expect, it } from "vitest";
import { createWeeklySummary } from "../src/domain/summaryService.js";

describe("summary service", () => {
  it("creates a weekly summary that mentions non-running load", () => {
    const summary = createWeeklySummary({
      periodStart: "2026-05-13",
      periodEnd: "2026-05-19",
      totalRunKm: 32,
      qualitySessions: 1,
      manualEvents: [
        {
          type: "basketball",
          occurredAt: "2026-05-18T20:00:00.000Z",
          durationMinutes: 90,
          intensity: "hard",
          lowerBodyLoad: "high",
          notes: "",
          affectsNextRun: true
        }
      ]
    });

    expect(summary).toContain("32 km");
    expect(summary).toContain("篮球");
  });
});
