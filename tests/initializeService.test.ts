import { describe, expect, it } from "vitest";
import { initializeProfile } from "../src/domain/initializeService.js";
import { createDatabase } from "../src/storage/db.js";
import { createRepositories } from "../src/storage/repositories.js";

describe("initialize service", () => {
  it("uses known VDOT when provided", () => {
    const repos = createRepositories(createDatabase(":memory:"));
    const result = initializeProfile(repos, {
      userId: "default",
      goalRace: "10K",
      goalTimeSeconds: 2700,
      knownVdot: 45,
      recentRuns: [],
      recentRecovery: [],
      recentManualEvents: []
    });

    expect(result.estimatedVdot).toBe(45);
    expect(result.vdotSource).toBe("manual");
    expect(repos.profile.get("default")?.currentVdot).toBe(45);
  });
});
