import { describe, it, expect } from "vitest";
import { executeCheckFrontDoor, handleCheckFrontDoor } from "../src/tools/frontDoor.js";

describe("check_front_door Tool", () => {
  it("should return simulated front door telemetry with explicit simulation markers", () => {
    const result = executeCheckFrontDoor({ location: "Front Entrance" });

    expect(result.success).toBe(true);
    expect(result.data._isSimulated).toBe(true);
    expect(result.data.disclaimer).toContain("SIMULATED TELEMETRY");
    expect(result.data.location).toBe("Front Entrance");
    expect(result.data.doorLockStatus).toBe("locked");
    expect(Array.isArray(result.data.recentEvents)).toBe(true);
  });

  it("should default location to Front Porch when unassigned", () => {
    const result = executeCheckFrontDoor({});
    expect(result.data.location).toBe("Front Porch");
  });

  it("should format handler output as JSON string inside MCP content structure", async () => {
    const response = await handleCheckFrontDoor({});
    expect(response.content).toBeDefined();
    expect(response.content[0].type).toBe("text");

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed._isSimulated).toBe(true);
    expect(parsed.doorLockStatus).toBe("locked");
  });
});
