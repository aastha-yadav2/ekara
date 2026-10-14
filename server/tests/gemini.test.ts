import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  generateGeminiResponse,
  getGeminiConfig,
  getGeminiClient,
  setGeminiClient,
  sanitizeErrorMessage
} from "../src/services/gemini.js";
import { GoogleGenAI } from "@google/genai";

describe("Google Gemini Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";
    setGeminiClient(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setGeminiClient(null);
  });

  it("should validate and read configuration from environment variables", () => {
    const config = getGeminiConfig();
    expect(config.apiKey).toBe("test-gemini-key");
    expect(config.model).toBe("gemini-2.5-flash");
  });

  it("should throw clear error when GEMINI_API_KEY is missing", () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => getGeminiConfig()).toThrowError("Missing required environment variable: GEMINI_API_KEY");
  });

  it("should fallback to gemini-3.5-flash-lite when GEMINI_MODEL is not set", () => {
    delete process.env.GEMINI_MODEL;
    const config = getGeminiConfig();
    expect(config.model).toBe("gemini-3.5-flash-lite");
  });

  it("should create GoogleGenAI client with configured API key", () => {
    const client = getGeminiClient();
    expect(client).toBeInstanceOf(GoogleGenAI);
  });

  it("should sanitize API keys from error messages", () => {
    const sensitive = "Error at https://generativelanguage.googleapis.com?key=AIzaSyD1234567890123456789012345678901";
    const sanitized = sanitizeErrorMessage(sensitive);
    expect(sanitized).not.toContain("AIzaSyD1234567890123456789012345678901");
    expect(sanitized).toContain("[REDACTED]");
  });

  it("should successfully parse text response from Gemini generateContent", async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: "Hello! I am EKARA, ready to assist you.",
      functionCalls: []
    });

    const mockClient = {
      models: {
        generateContent: mockGenerateContent
      }
    } as unknown as GoogleGenAI;

    const response = await generateGeminiResponse({
      contents: "Hello",
      client: mockClient
    });

    expect(response.text).toBe("Hello! I am EKARA, ready to assist you.");
    expect(response.functionCalls).toHaveLength(0);
    expect(mockGenerateContent).toHaveBeenCalledOnce();
  });

  it("should successfully parse function calls from Gemini generateContent", async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: "",
      functionCalls: [
        {
          name: "get_daily_schedule",
          args: { date: "2026-10-13" },
          id: "call-sched-1"
        }
      ]
    });

    const mockClient = {
      models: {
        generateContent: mockGenerateContent
      }
    } as unknown as GoogleGenAI;

    const response = await generateGeminiResponse({
      contents: "What is my schedule?",
      client: mockClient
    });

    expect(response.functionCalls).toHaveLength(1);
    expect(response.functionCalls[0].name).toBe("get_daily_schedule");
    expect(response.functionCalls[0].args).toEqual({ date: "2026-10-13" });
    expect(response.functionCalls[0].id).toBe("call-sched-1");
  });

  it("should sanitize and map authentication errors safely", async () => {
    const authError = new Error("API key not valid. Please pass a valid API key.");
    (authError as any).status = 401;

    const mockClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(authError)
      }
    } as unknown as GoogleGenAI;

    await expect(
      generateGeminiResponse({ contents: "Test", client: mockClient })
    ).rejects.toThrowError("Gemini authentication failed. Please verify GEMINI_API_KEY.");
  });

  it("should sanitize and map rate limit / quota errors safely", async () => {
    const quotaError = new Error("Resource has been exhausted (e.g. check quota).");
    (quotaError as any).status = 429;

    const mockClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(quotaError)
      }
    } as unknown as GoogleGenAI;

    await expect(
      generateGeminiResponse({ contents: "Test", client: mockClient })
    ).rejects.toThrowError("Gemini API rate limit or quota exceeded.");
  });

  it("should sanitize and map timeout errors safely", async () => {
    const timeoutError = new Error("Request deadline exceeded");

    const mockClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(timeoutError)
      }
    } as unknown as GoogleGenAI;

    await expect(
      generateGeminiResponse({ contents: "Test", client: mockClient })
    ).rejects.toThrowError("Gemini API request timed out.");
  });
});
