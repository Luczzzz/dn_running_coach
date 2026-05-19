import { describe, expect, it } from "vitest";
import { chooseDailyTraining } from "../src/domain/danielsRules.js";

describe("daniels rules", () => {
  it("recommends easy running when recovery is poor", () => {
    const advice = chooseDailyTraining({
      currentVdot: 45,
      cycleFocus: "threshold",
      context: {
        date: "2026-05-19",
        availableMinutes: 50,
        sleepQuality: "poor",
        fatigue: "high"
      },
      recentManualLoad: []
    });

    expect(advice.type).toBe("E");
    expect(advice.downgradeReason).toContain("恢复不足");
  });

  it("downgrades quality after hard basketball", () => {
    const advice = chooseDailyTraining({
      currentVdot: 45,
      cycleFocus: "interval",
      context: {
        date: "2026-05-19",
        availableMinutes: 60,
        sleepQuality: "normal",
        fatigue: "normal"
      },
      recentManualLoad: [
        {
          type: "basketball",
          occurredAt: "2026-05-18T20:00:00.000Z",
          durationMinutes: 90,
          intensity: "hard",
          lowerBodyLoad: "high",
          notes: "full court",
          affectsNextRun: true
        }
      ]
    });

    expect(advice.type).toBe("E");
    expect(advice.rationale.join(" ")).toContain("篮球");
  });

  it("keeps threshold focus when conditions are normal", () => {
    const advice = chooseDailyTraining({
      currentVdot: 45,
      cycleFocus: "threshold",
      context: {
        date: "2026-05-19",
        availableMinutes: 60,
        sleepQuality: "good",
        fatigue: "low"
      },
      recentManualLoad: []
    });

    expect(advice.type).toBe("T");
    expect(advice.purpose).toContain("阈值");
  });
});
