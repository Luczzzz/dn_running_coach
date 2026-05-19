import type { RunActivity } from "../../src/domain/types.js";

export const corosSample: RunActivity[] = [
  {
    id: "run-1",
    startedAt: new Date().toISOString(),
    durationMinutes: 48,
    distanceKm: 8,
    averagePaceSecondsPerKm: 360,
    averageHeartRate: 145,
    perceivedEffort: "easy",
    notes: "evening easy run"
  }
];
