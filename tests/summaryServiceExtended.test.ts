import { describe, expect, it } from "vitest";
import { createCycleSummary, createMonthlySummary } from "../src/domain/summaryService.js";

describe("extended summary service", () => {
  it("creates a monthly summary", () => {
    const summary = createMonthlySummary({
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      totalRunKm: 120,
      currentVdot: 45,
      manualEventCount: 4
    });
    expect(summary).toContain("月总结");
    expect(summary).toContain("120 km");
  });

  it("creates a cycle summary", () => {
    const summary = createCycleSummary({
      periodStart: "2026-04-01",
      periodEnd: "2026-05-31",
      cycleGoal: "10K threshold block",
      completedQualitySessions: 8,
      currentVdot: 45
    });
    expect(summary).toContain("周期总结");
    expect(summary).toContain("10K threshold block");
  });
});
