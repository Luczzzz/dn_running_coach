import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("config", () => {
  it("defaults to the China COROS MCP endpoint", () => {
    const config = loadConfig({});
    expect(config.corosMcpEndpoint).toBe("https://mcpcn.coros.com/mcp");
  });
});
