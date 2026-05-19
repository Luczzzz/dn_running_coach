import { describe, expect, it } from "vitest";
import { createDatabase } from "../src/storage/db.js";
import { createRepositories } from "../src/storage/repositories.js";

describe("storage", () => {
  it("saves and loads the user profile", () => {
    const db = createDatabase(":memory:");
    const repos = createRepositories(db);

    repos.profile.save({
      id: "default",
      goalRace: "10K",
      goalTimeSeconds: 2700,
      currentVdot: 45,
      injuryNotes: ["left achilles sensitive"],
      preferredTrainingDays: ["Tue", "Thu", "Sun"],
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z"
    });

    expect(repos.profile.get("default")?.currentVdot).toBe(45);
  });

  it("saves and lists manual events", () => {
    const db = createDatabase(":memory:");
    const repos = createRepositories(db);

    repos.events.addManual({
      type: "basketball",
      occurredAt: "2026-05-19T12:00:00.000Z",
      durationMinutes: 90,
      intensity: "hard",
      lowerBodyLoad: "high",
      notes: "小腿紧",
      affectsNextRun: true
    });

    const events = repos.events.listManualSince("2026-05-18T00:00:00.000Z");
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("basketball");
  });
});
