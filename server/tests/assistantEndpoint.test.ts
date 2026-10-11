import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { app } from "../src/index.js";
import { setBedrockRuntimeClient } from "../src/services/bedrock.js";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import type { Server } from "http";

describe("POST /api/assistant Endpoint", () => {
  const originalEnv = { ...process.env };
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    process.env.AWS_REGION = "us-east-1";
    process.env.BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        const port = typeof address === "object" && address !== null ? address.port : 0;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    setBedrockRuntimeClient(null);
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("should return 400 when message is missing or empty", async () => {
    const res1 = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    expect(res1.status).toBe(400);
    const body1 = await res1.json();
    expect(body1.success).toBe(false);
    expect(body1.error).toContain("Invalid request");

    const res2 = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "   " })
    });
    expect(res2.status).toBe(400);
    const body2 = await res2.json();
    expect(body2.success).toBe(false);
    expect(body2.error).toContain("Invalid request");

    const res3 = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: 12345 })
    });
    expect(res3.status).toBe(400);
    const body3 = await res3.json();
    expect(body3.success).toBe(false);
  });

  it("should return 400 when body contains malformed JSON", async () => {
    const res = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json{"
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Malformed JSON payload");
  });

  it("should return 200 with structured response on successful orchestration", async () => {
    const mockSend = vi
      .fn()
      // First turn selects tool
      .mockResolvedValueOnce({
        output: {
          message: {
            role: "assistant",
            content: [
              {
                toolUse: {
                  toolUseId: "sched-101",
                  name: "get_daily_schedule",
                  input: {}
                }
              }
            ]
          }
        },
        stopReason: "tool_use"
      })
      // Second turn summarizes
      .mockResolvedValueOnce({
        output: {
          message: {
            role: "assistant",
            content: [
              {
                text: "Here is your schedule for today: You have breakfast with medication at 8:00 AM."
              }
            ]
          }
        },
        stopReason: "end_turn"
      });

    const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;
    setBedrockRuntimeClient(mockClient);

    const res = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "What do I need to do today?" })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.toolUsed).toBe("get_daily_schedule");
    expect(data.message).toContain("breakfast with medication");
  });

  it("should return 200 for conversational messages with toolUsed null", async () => {
    const mockSend = vi.fn().mockResolvedValueOnce({
      output: {
        message: {
          role: "assistant",
          content: [
            {
              text: "Hello! I am EKARA, your voice assistant."
            }
          ]
        }
      },
      stopReason: "end_turn"
    });

    const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;
    setBedrockRuntimeClient(mockClient);

    const res = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hi EKARA" })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.toolUsed).toBeNull();
    expect(data.message).toContain("Hello! I am EKARA");
  });

  it("should return 503 when AWS environment variables are unconfigured", async () => {
    delete process.env.AWS_REGION;
    setBedrockRuntimeClient(null);

    const res = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" })
    });

    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("AI service is not configured");
  });

  it("should return 502 without exposing stack traces when AWS credentials fail", async () => {
    const authError = new Error("Invalid AWS credentials provided");
    authError.name = "UnrecognizedClientException";

    const mockSend = vi.fn().mockRejectedValue(authError);
    const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;
    setBedrockRuntimeClient(mockClient);

    const res = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "What is my schedule?" })
    });

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("AI service authentication failure");
    expect(data).not.toHaveProperty("stack");
  });
});
