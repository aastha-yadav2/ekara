import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { app } from "../src/index.js";
import { setGeminiClient } from "../src/services/gemini.js";
import { GoogleGenAI } from "@google/genai";
import type { Server } from "http";

describe("POST /api/assistant Endpoint (Google Gemini)", () => {
  const originalEnv = { ...process.env };
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";

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
    setGeminiClient(null);
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

  describe("Demo Flows through /api/assistant", () => {
    it("Flow A: 'What do I need to do today?' -> get_daily_schedule", async () => {
      const mockGenerateContent = vi
        .fn()
        .mockResolvedValueOnce({
          text: "",
          functionCalls: [
            {
              name: "get_daily_schedule",
              args: {},
              id: "sched-101"
            }
          ]
        })
        .mockResolvedValueOnce({
          text: "Here is your schedule for today: You have breakfast with medication at 8:00 AM.",
          functionCalls: []
        });

      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;
      setGeminiClient(mockClient);

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

    it("Flow B: 'Is anyone at the front door?' -> check_front_door", async () => {
      const mockGenerateContent = vi
        .fn()
        .mockResolvedValueOnce({
          text: "",
          functionCalls: [
            {
              name: "check_front_door",
              args: { location: "Front Porch" },
              id: "door-101"
            }
          ]
        })
        .mockResolvedValueOnce({
          text: "According to simulated smart home telemetry, your front door is currently locked and no motion is detected.",
          functionCalls: []
        });

      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;
      setGeminiClient(mockClient);

      const res = await fetch(`${baseUrl}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Is anyone at the front door?" })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.toolUsed).toBe("check_front_door");
      expect(data.message).toContain("simulated smart home telemetry");
    });

    it("Flow C: 'Tell my daughter I need help.' -> notify_caregiver", async () => {
      const mockGenerateContent = vi
        .fn()
        .mockResolvedValueOnce({
          text: "",
          functionCalls: [
            {
              name: "notify_caregiver",
              args: {
                caregiverName: "Daughter (Sarah)",
                contactId: "caregiver-family-app",
                message: "Need help with groceries",
                priority: "medium"
              },
              id: "care-101"
            }
          ]
        })
        .mockResolvedValueOnce({
          text: "I have recorded your notification for your daughter via the mock notification adapter.",
          functionCalls: []
        });

      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;
      setGeminiClient(mockClient);

      const res = await fetch(`${baseUrl}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Tell my daughter I need help." })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.toolUsed).toBe("notify_caregiver");
      expect(data.message).toContain("mock notification adapter");
    });

    it("Flow D: 'Hello EKARA' -> normal conversational response with no tool", async () => {
      const mockGenerateContent = vi.fn().mockResolvedValueOnce({
        text: "Hello! I am EKARA, your voice assistant. How can I help you today?",
        functionCalls: []
      });

      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;
      setGeminiClient(mockClient);

      const res = await fetch(`${baseUrl}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello EKARA" })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.toolUsed).toBeNull();
      expect(data.message).toContain("Hello! I am EKARA");
    });

    it("Flow E: 'I\'m not feeling well' -> conversational response with safe emergency boundaries and no tools", async () => {
      const mockGenerateContent = vi.fn().mockResolvedValueOnce({
        text: "I am so sorry to hear that you are not feeling well. Because I am an AI assistant and not a medical monitor, if you are experiencing severe symptoms, chest pain, or a fall, please press your physical emergency button or dial 911 right away. Would you like me to notify your family member or caregiver so they can check in on you?",
        functionCalls: []
      });

      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;
      setGeminiClient(mockClient);

      const res = await fetch(`${baseUrl}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "I'm not feeling well" })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.toolUsed).toBeNull();
      expect(data.message).toContain("911");
      expect(data.message).not.toContain("dispatched");
    });
  });

  describe("Error Scenarios", () => {
    it("should return 503 when GEMINI_API_KEY environment variable is unconfigured", async () => {
      delete process.env.GEMINI_API_KEY;
      setGeminiClient(null);

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

    it("should return 502 without exposing stack traces when Gemini authentication fails", async () => {
      const authError = new Error("API key not valid");
      (authError as any).status = 401;

      const mockGenerateContent = vi.fn().mockRejectedValue(authError);
      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;
      setGeminiClient(mockClient);

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

    it("should return 504 when Gemini API times out", async () => {
      const timeoutError = new Error("Gemini API request timed out.");

      const mockGenerateContent = vi.fn().mockRejectedValue(timeoutError);
      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;
      setGeminiClient(mockClient);

      const res = await fetch(`${baseUrl}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "What is my schedule?" })
      });

      expect(res.status).toBe(504);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("timed out");
    });
  });
});
