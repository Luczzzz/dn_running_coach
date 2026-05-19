import { describe, expect, it } from "vitest";
import { createDailyAdvice } from "../src/domain/adviceService.js";
import { createDatabase } from "../src/storage/db.js";
import { createRepositories } from "../src/storage/repositories.js";

describe("daily advice service", () => {
  it("uses profile and recent manual load to produce advice", () => {
    const db = createDatabase(":memory:");
    const repos = createRepositories(db);
    repos.profile.save({
      id: "default",
      goalRace: "10K",
      goalTimeSeconds: 2700,
      currentVdot: 45,
      injuryNotes: [],
      preferredTrainingDays: [],
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z"
    });
    repos.events.addManual({
      type: "basketball",
      occurredAt: new Date().toISOString(),
      durationMinutes: 90,
      intensity: "hard",
      lowerBodyLoad: "high",
      notes: "full court",
      affectsNextRun: true
    });

    const advice = createDailyAdvice(repos, "default", {
      date: "2026-05-19",
      availableMinutes: 60,
      sleepQuality: "normal",
      fatigue: "normal"
    });

    expect(advice.type).toBe("E");
    expect(advice.rationale.join(" ")).toContain("篮球");
  });
});
