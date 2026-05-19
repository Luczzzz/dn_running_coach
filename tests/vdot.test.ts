import { describe, expect, it } from "vitest";
import { estimateTrainingPaces, estimateVdotFromRace } from "../src/domain/vdot.js";

describe("vdot", () => {
  it("estimates a plausible VDOT from a 10K race", () => {
    const result = estimateVdotFromRace({ distanceKm: 10, timeSeconds: 2700 });
    expect(result.vdot).toBeGreaterThanOrEqual(44);
    expect(result.vdot).toBeLessThanOrEqual(48);
    expect(result.source).toBe("race_result");
  });

  it("returns Daniels-style training pace labels", () => {
    const paces = estimateTrainingPaces(45);
    expect(paces.easy).toContain("/km");
    expect(paces.threshold).toContain("/km");
    expect(paces.interval).toContain("/km");
  });
});
