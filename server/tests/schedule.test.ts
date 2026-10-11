import { describe, it, expect } from "vitest";
import { executeGetDailySchedule, handleGetDailySchedule } from "../src/tools/schedule.js";

describe("get_daily_schedule Tool", () => {
  it("should return realistic mock schedule data clearly marked as mock", () => {
    const result = executeGetDailySchedule({});

    expect(result.success).toBe(true);
    expect(result.data._isMock).toBe(true);
    expect(result.data.source).toBe("EKARA_MOCK_SCHEDULE_PROVIDER");
    expect(Array.isArray(result.data.schedule)).toBe(true);
    expect(result.data.schedule.length).toBeGreaterThan(0);

    const firstItem = result.data.schedule[0];
    expect(firstItem).toHaveProperty("title");
    expect(firstItem).toHaveProperty("time");
    expect(firstItem).toHaveProperty("status");
    expect(firstItem).toHaveProperty("category");
  });

  it("should format tool handler output correctly as MCP text content", async () => {
    const response = await handleGetDailySchedule({ date: "2026-10-09" });

    expect(response.content).toBeDefined();
    expect(response.content[0].type).toBe("text");

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed._isMock).toBe(true);
    expect(parsed.date).toBe("2026-10-09");
  });
});
