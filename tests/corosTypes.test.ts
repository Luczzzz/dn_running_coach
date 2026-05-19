import { describe, expect, it } from "vitest";
import { CorosInitializationInputSchema } from "../src/domain/corosTypes.js";

describe("coros input schemas", () => {
  it("validates initialization data forwarded by OpenClaw", () => {
    const parsed = CorosInitializationInputSchema.parse({
      userId: "default",
      goalRace: "10K",
      goalTimeSeconds: 2700,
      knownVdot: 45,
      recentRuns: [
        {
          id: "run-1",
          startedAt: "2026-05-18T12:00:00.000Z",
          durationMinutes: 48,
          distanceKm: 8,
          averagePaceSecondsPerKm: 360,
          averageHeartRate: 145
        }
      ],
      recentRecovery: [
        {
          date: "2026-05-18",
          recoveryStatus: "normal",
          sleepHours: 7,
          restingHeartRate: 52,
          hrvStatus: "normal",
          fatigueLevel: "normal"
        }
      ]
    });

    expect(parsed.userId).toBe("default");
    expect(parsed.recentRuns[0]?.distanceKm).toBe(8);
  });
});
