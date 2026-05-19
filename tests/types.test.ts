import { describe, expect, it } from "vitest";
import { ManualEventSchema, UserProfileSchema } from "../src/domain/types.js";

describe("domain schemas", () => {
  it("validates a running profile", () => {
    const profile = UserProfileSchema.parse({
      id: "default",
      goalRace: "10K",
      goalTimeSeconds: 2700,
      currentVdot: 45,
      injuryNotes: ["left achilles sensitive"],
      preferredTrainingDays: ["Tue", "Thu", "Sun"],
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z"
    });

    expect(profile.currentVdot).toBe(45);
  });

  it("validates a manual basketball event", () => {
    const event = ManualEventSchema.parse({
      type: "basketball",
      occurredAt: "2026-05-19T12:00:00.000Z",
      durationMinutes: 90,
      intensity: "hard",
      lowerBodyLoad: "high",
      notes: "小腿紧",
      affectsNextRun: true
    });

    expect(event.type).toBe("basketball");
    expect(event.affectsNextRun).toBe(true);
  });
});
