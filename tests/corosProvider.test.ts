import { describe, expect, it } from "vitest";
import { FixtureCorosProvider } from "../src/providers/corosProvider.js";
import { corosSample } from "./fixtures/corosSample.js";

describe("coros provider", () => {
  it("returns recent runs from fixtures", async () => {
    const provider = new FixtureCorosProvider(corosSample);
    const runs = await provider.getRecentRuns("default", 7);

    expect(runs).toHaveLength(1);
    expect(runs[0]?.distanceKm).toBe(8);
  });
});
