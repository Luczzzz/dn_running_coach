import { describe, expect, it } from "vitest";
import { reviewRun } from "../src/domain/reviewService.js";

describe("review service", () => {
  it("classifies an easy run that was likely too fast", () => {
    const review = reviewRun({
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
    });

    expect(review.summary).toContain("E");
    expect(review.deviations.join(" ")).toContain("偏快");
    expect(review.nextAdjustment).toContain("轻松");
  });
});
