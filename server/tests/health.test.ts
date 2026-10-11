import { describe, it, expect, beforeAll } from "vitest";
import { app } from "../src/index.js";

describe("Express Server & Health Endpoint", () => {
  beforeAll(() => {
    process.env.NODE_ENV = "test";
  });

  it("should expose /health route with 200 status and correct schema", async () => {
    // We can simulate an HTTP request using node's http or fetch mock / app listener test
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : 0;

    const res = await fetch(`http://localhost:${port}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.service).toBe("EKARA MCP Assistance Server");
    expect(Array.isArray(data.tools)).toBe(true);
    expect(data.tools).toContain("get_daily_schedule");
    expect(data.tools).toContain("check_front_door");
    expect(data.tools).toContain("notify_caregiver");

    server.close();
  });
});
