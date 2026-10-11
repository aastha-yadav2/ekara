import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../src/index.js";
import type { Server } from "http";

describe("MCP Streamable HTTP Protocol (/mcp)", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        const port = typeof address === "object" && address !== null ? address.port : 0;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  /**
   * Helper to execute a JSON-RPC request over MCP Streamable HTTP and parse the SSE payload.
   */
  async function sendMcpRequest(payload: Record<string, any>, customHeaders?: Record<string, string>) {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        ...customHeaders
      },
      body: JSON.stringify(payload)
    });

    const status = res.status;
    const rawText = await res.text();

    // Streamable HTTP returns text/event-stream responses with "event: message\ndata: { ... }"
    const match = rawText.match(/data:\s*(\{.*\})/);
    let data: any = null;
    if (match && match[1]) {
      try {
        data = JSON.parse(match[1]);
      } catch {
        data = null;
      }
    } else {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }
    }

    return { status, data, rawText };
  }

  it("1a. initialize (Alexa+ 2025-11-25): should negotiate MCP specification 2025-11-25", async () => {
    const { status, data } = await sendMcpRequest(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: {
            name: "AlexaPlusClient",
            version: "2.0.0"
          }
        }
      },
      {
        "mcp-protocol-version": "2025-11-25"
      }
    );

    expect(status).toBe(200);
    expect(data).toBeDefined();
    expect(data.jsonrpc).toBe("2.0");
    expect(data.id).toBe(1);
    expect(data.result).toBeDefined();
    expect(data.result.protocolVersion).toBe("2025-11-25");
    expect(data.result.serverInfo.name).toBe("EKARA MCP Assistance Server");
    expect(data.result.capabilities.tools).toBeDefined();
  });

  it("1b. initialize (Legacy 2024-11-05): should negotiate backward-compatible 2024-11-05", async () => {
    const { status, data } = await sendMcpRequest({
      jsonrpc: "2.0",
      id: 11,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "LegacyMcpClient",
          version: "1.0.0"
        }
      }
    });

    expect(status).toBe(200);
    expect(data).toBeDefined();
    expect(data.result.protocolVersion).toBe("2024-11-05");
  });

  it("2. tools/list: should discover all three EKARA tools with valid input schemas", async () => {
    const { status, data } = await sendMcpRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list"
    });

    expect(status).toBe(200);
    expect(data.result).toBeDefined();
    expect(Array.isArray(data.result.tools)).toBe(true);

    const tools = data.result.tools;
    expect(tools).toHaveLength(3);

    const toolNames = tools.map((t: any) => t.name);
    expect(toolNames).toContain("get_daily_schedule");
    expect(toolNames).toContain("check_front_door");
    expect(toolNames).toContain("notify_caregiver");

    // Verify input schemas are valid JSON schemas
    for (const tool of tools) {
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it("3. tools/call get_daily_schedule: should invoke schedule tool and return structured mock items", async () => {
    const { status, data } = await sendMcpRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "get_daily_schedule",
        arguments: {}
      }
    });

    expect(status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.content[0].type).toBe("text");

    const parsedContent = JSON.parse(data.result.content[0].text);
    expect(parsedContent._isMock).toBe(true);
    expect(Array.isArray(parsedContent.schedule)).toBe(true);
    expect(parsedContent.schedule.length).toBeGreaterThan(0);
    expect(parsedContent).toHaveProperty("summary");
  });

  it("4. tools/call check_front_door: should invoke front door tool and return simulated telemetry", async () => {
    const { status, data } = await sendMcpRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "check_front_door",
        arguments: {
          location: "Front Porch"
        }
      }
    });

    expect(status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.content[0].type).toBe("text");

    const parsedContent = JSON.parse(data.result.content[0].text);
    expect(parsedContent._isSimulated).toBe(true);
    expect(parsedContent.location).toBe("Front Porch");
    expect(parsedContent.doorLockStatus).toBe("locked");
    expect(parsedContent.disclaimer).toContain("SIMULATED TELEMETRY");
  });

  it("5. tools/call notify_caregiver: should invoke caregiver mock adapter and log alert", async () => {
    const { status, data } = await sendMcpRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "notify_caregiver",
        arguments: {
          caregiverName: "Sarah (Daughter)",
          contactId: "caregiver-family-app",
          message: "Dad finished lunch and took afternoon medication.",
          priority: "medium"
        }
      }
    });

    expect(status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.content[0].type).toBe("text");

    const parsedContent = JSON.parse(data.result.content[0].text);
    expect(parsedContent._isMockAdapter).toBe(true);
    expect(parsedContent.status).toBe("queued_mock_success");
    expect(parsedContent.dispatchDetails.caregiverName).toBe("Sarah (Daughter)");
    expect(parsedContent.disclaimer).toContain("MOCK ADAPTER NOTICE");
  });

  it("6. invalid tool name: should reject unknown tool gracefully without crashing", async () => {
    const { status, data } = await sendMcpRequest({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "unknown_hardware_tool",
        arguments: {}
      }
    });

    expect(status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.isError).toBe(true);
    expect(data.result.content[0].text).toContain("not found");
  });

  it("7. invalid tool arguments: should reject invalid arguments with schema validation errors", async () => {
    const { status, data } = await sendMcpRequest({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "notify_caregiver",
        arguments: {
          // Missing required caregiverName, contactId, and message
        }
      }
    });

    expect(status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.isError).toBe(true);
    expect(data.result.content[0].text).toContain("Input validation error");
  });

  it("8. Accept header normalization: should accept requests without explicit SSE in Accept header", async () => {
    const { status, data } = await sendMcpRequest(
      {
        jsonrpc: "2.0",
        id: 8,
        method: "tools/list"
      },
      {
        // Only application/json supplied by client
        "Accept": "application/json"
      }
    );

    expect(status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.tools).toHaveLength(3);
  });
});
