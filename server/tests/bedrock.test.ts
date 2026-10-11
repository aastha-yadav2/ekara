import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  generateResponse,
  getBedrockConfig,
  getBedrockRuntimeClient,
  setBedrockRuntimeClient
} from "../src/services/bedrock.js";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

describe("Amazon Bedrock Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.AWS_REGION = "us-east-1";
    process.env.BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";
    setBedrockRuntimeClient(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setBedrockRuntimeClient(null);
  });

  it("should validate and read configuration from environment variables", () => {
    const config = getBedrockConfig();
    expect(config.region).toBe("us-east-1");
    expect(config.modelId).toBe("anthropic.claude-3-haiku-20240307-v1:0");
  });

  it("should throw clear error when AWS_REGION is missing", () => {
    delete process.env.AWS_REGION;
    expect(() => getBedrockConfig()).toThrowError("Missing required environment variable: AWS_REGION");
  });

  it("should throw clear error when BEDROCK_MODEL_ID is missing", () => {
    delete process.env.BEDROCK_MODEL_ID;
    expect(() => getBedrockConfig()).toThrowError("Missing required environment variable: BEDROCK_MODEL_ID");
  });

  it("should create BedrockRuntimeClient with configured region", () => {
    const client = getBedrockRuntimeClient();
    expect(client).toBeInstanceOf(BedrockRuntimeClient);
  });

  it("should successfully parse text response from Bedrock Converse API", async () => {
    const mockSend = vi.fn().mockResolvedValue({
      output: {
        message: {
          role: "assistant",
          content: [{ text: "Hello! I am EKARA, ready to assist you." }]
        }
      },
      stopReason: "end_turn",
      usage: { inputTokens: 15, outputTokens: 12, totalTokens: 27 }
    });

    const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

    const response = await generateResponse({
      messages: [{ role: "user", content: [{ text: "Hello" }] }],
      client: mockClient
    });

    expect(response.text).toBe("Hello! I am EKARA, ready to assist you.");
    expect(response.stopReason).toBe("end_turn");
    expect(response.toolUses).toHaveLength(0);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("should successfully parse tool use request from Bedrock Converse API", async () => {
    const mockSend = vi.fn().mockResolvedValue({
      output: {
        message: {
          role: "assistant",
          content: [
            {
              toolUse: {
                toolUseId: "call_12345",
                name: "get_daily_schedule",
                input: { date: "2026-10-09" }
              }
            }
          ]
        }
      },
      stopReason: "tool_use"
    });

    const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

    const response = await generateResponse({
      messages: [{ role: "user", content: [{ text: "What's on my schedule today?" }] }],
      client: mockClient
    });

    expect(response.stopReason).toBe("tool_use");
    expect(response.toolUses).toHaveLength(1);
    expect(response.toolUses[0].name).toBe("get_daily_schedule");
    expect(response.toolUses[0].toolUseId).toBe("call_12345");
    expect(response.toolUses[0].input).toEqual({ date: "2026-10-09" });
  });

  it("should sanitize and map AWS authentication errors safely", async () => {
    const authError = new Error("The security token included in the request is invalid.");
    authError.name = "UnrecognizedClientException";

    const mockSend = vi.fn().mockRejectedValue(authError);
    const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

    await expect(
      generateResponse({
        messages: [{ role: "user", content: [{ text: "Hello" }] }],
        client: mockClient
      })
    ).rejects.toThrowError("AWS authentication failed. Please verify AWS credentials or IAM permissions.");
  });

  it("should sanitize and map model not found errors safely", async () => {
    const resourceError = new Error("Model not found");
    resourceError.name = "ResourceNotFoundException";

    const mockSend = vi.fn().mockRejectedValue(resourceError);
    const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

    await expect(
      generateResponse({
        messages: [{ role: "user", content: [{ text: "Hello" }] }],
        client: mockClient
      })
    ).rejects.toThrowError(/Amazon Bedrock model not found or unavailable/);
  });
});
