import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  orchestrateUserRequest,
  executeToolAction,
  EKARA_SYSTEM_PROMPT,
  EKARA_GEMINI_TOOLS
} from "../src/services/orchestrator.js";
import { GoogleGenAI } from "@google/genai";
import { setGeminiClient } from "../src/services/gemini.js";

describe("EKARA AI Orchestration Layer (Google Gemini)", () => {
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

  describe("Safety Rules & System Instructions", () => {
    it("should include strict simulation disclaimer instructions", () => {
      expect(EKARA_SYSTEM_PROMPT).toContain("SIMULATION & MOCK INTEGRATIONS");
      expect(EKARA_SYSTEM_PROMPT).toContain("NEVER claim that a physical door camera was actively checked");
      expect(EKARA_SYSTEM_PROMPT).toContain("NEVER claim that a real caregiver or family member received an actual SMS");
      expect(EKARA_SYSTEM_PROMPT).toContain("NEVER fabricate or make up appointments");
    });

    it("should include emergency boundary instructions", () => {
      expect(EKARA_SYSTEM_PROMPT).toContain("EMERGENCY SAFETY BOUNDARIES");
      expect(EKARA_SYSTEM_PROMPT).toContain("911");
      expect(EKARA_SYSTEM_PROMPT).toContain("Never claim to have contacted emergency services");
    });

    it("should define valid Gemini tool specifications matching MCP tools", () => {
      const toolDeclarations = EKARA_GEMINI_TOOLS[0].functionDeclarations;
      const toolNames = toolDeclarations.map((t) => t.name);
      expect(toolNames).toContain("get_daily_schedule");
      expect(toolNames).toContain("check_front_door");
      expect(toolNames).toContain("notify_caregiver");
    });
  });

  describe("Tool Execution Dispatcher (executeToolAction)", () => {
    it("should execute get_daily_schedule and return mock schedule data", () => {
      const result = executeToolAction("get_daily_schedule", {});
      expect(result.success).toBe(true);
      expect(result.data._isMock).toBe(true);
      expect(Array.isArray(result.data.schedule)).toBe(true);
    });

    it("should execute check_front_door and return simulated telemetry", () => {
      const result = executeToolAction("check_front_door", { location: "Front Porch" });
      expect(result.success).toBe(true);
      expect(result.data._isSimulated).toBe(true);
      expect(result.data.location).toBe("Front Porch");
      expect(result.data.doorLockStatus).toBe("locked");
    });

    it("should execute notify_caregiver and return mock adapter dispatch details", () => {
      const result = executeToolAction("notify_caregiver", {
        caregiverName: "Sarah",
        contactId: "+15551234567",
        message: "Need help bringing groceries inside.",
        priority: "medium"
      });
      expect(result._isMockAdapter).toBe(true);
      expect(result.status).toBe("queued_mock_success");
      expect(result.dispatchDetails.caregiverName).toBe("Sarah");
      expect(result.disclaimer).toContain("MOCK ADAPTER NOTICE");
    });

    it("should reject notify_caregiver when required fields are missing", () => {
      expect(() =>
        executeToolAction("notify_caregiver", {
          caregiverName: "Sarah"
          // contactId and message missing
        })
      ).toThrowError(/Validation Error in notify_caregiver/);
    });

    it("should reject unknown tool names safely", () => {
      expect(() => executeToolAction("unsupported_action", {})).toThrowError(
        /Unknown or unsupported tool action/
      );
    });
  });

  describe("End-to-End Orchestration (orchestrateUserRequest)", () => {
    it("1. Schedule request: selects get_daily_schedule and returns structured response", async () => {
      const mockGenerateContent = vi
        .fn()
        // Turn 1: Gemini chooses get_daily_schedule
        .mockResolvedValueOnce({
          text: "",
          functionCalls: [
            {
              name: "get_daily_schedule",
              args: { date: "2026-10-13" },
              id: "tool-sched-1"
            }
          ]
        })
        // Turn 2: Gemini summarizes schedule result
        .mockResolvedValueOnce({
          text: "You have two items on your schedule today: Morning blood pressure check at 8:30 AM and Physical therapy at 2:00 PM.",
          functionCalls: []
        });

      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;

      const result = await orchestrateUserRequest("What do I need to do today?", { client: mockClient });

      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe("get_daily_schedule");
      expect(result.message).toContain("Morning blood pressure check");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("2. Front door request: selects check_front_door and returns simulated telemetry summary", async () => {
      const mockGenerateContent = vi
        .fn()
        // Turn 1: Gemini chooses check_front_door
        .mockResolvedValueOnce({
          text: "",
          functionCalls: [
            {
              name: "check_front_door",
              args: { location: "Front Porch" },
              id: "tool-door-1"
            }
          ]
        })
        // Turn 2: Gemini summarizes front door telemetry
        .mockResolvedValueOnce({
          text: "According to simulated smart home telemetry, your front door is currently locked and no motion is currently detected.",
          functionCalls: []
        });

      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;

      const result = await orchestrateUserRequest("Is anyone at my front door?", { client: mockClient });

      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe("check_front_door");
      expect(result.message).toContain("simulated smart home telemetry");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("3. Caregiver request: selects notify_caregiver and returns mock adapter confirmation", async () => {
      const mockGenerateContent = vi
        .fn()
        // Turn 1: Gemini chooses notify_caregiver
        .mockResolvedValueOnce({
          text: "",
          functionCalls: [
            {
              name: "notify_caregiver",
              args: {
                caregiverName: "Daughter (Sarah)",
                contactId: "caregiver-family-app",
                message: "Dad asked for help.",
                priority: "medium"
              },
              id: "tool-care-1"
            }
          ]
        })
        // Turn 2: Gemini confirms mock notification queued
        .mockResolvedValueOnce({
          text: "I have recorded your message for your daughter using the prototype mock notification adapter. Please note no live SMS was dispatched.",
          functionCalls: []
        });

      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;

      const result = await orchestrateUserRequest("Tell my daughter that I need help.", { client: mockClient });

      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe("notify_caregiver");
      expect(result.message).toContain("prototype mock notification adapter");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("4. Conversational request: answers conversationally without executing any tool", async () => {
      const mockGenerateContent = vi.fn().mockResolvedValueOnce({
        text: "Good morning! How are you doing today? Let me know if you need to check your schedule or front porch.",
        functionCalls: []
      });

      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;

      const result = await orchestrateUserRequest("Good morning EKARA", { client: mockClient });

      expect(result.success).toBe(true);
      expect(result.toolUsed).toBeNull();
      expect(result.message).toContain("Good morning!");
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("5. Tool validation failure: handles tool argument errors gracefully in conversation turn", async () => {
      const mockGenerateContent = vi
        .fn()
        // Turn 1: Gemini chooses notify_caregiver with missing required fields
        .mockResolvedValueOnce({
          text: "",
          functionCalls: [
            {
              name: "notify_caregiver",
              args: { caregiverName: "" },
              id: "tool-err-1"
            }
          ]
        })
        // Turn 2: Gemini handles the error result and asks user for clarification
        .mockResolvedValueOnce({
          text: "Could you please tell me which caregiver you would like to notify and what message you'd like to send?",
          functionCalls: []
        });

      const mockClient = {
        models: { generateContent: mockGenerateContent }
      } as unknown as GoogleGenAI;

      const result = await orchestrateUserRequest("Send a message", { client: mockClient });

      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe("notify_caregiver");
      expect(result.message).toContain("which caregiver");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("6. Malformed request: rejects empty user message", async () => {
      await expect(orchestrateUserRequest("")).rejects.toThrowError(
        "Invalid request: User message cannot be empty."
      );
      await expect(orchestrateUserRequest("   ")).rejects.toThrowError(
        "Invalid request: User message cannot be empty."
      );
    });
  });
});
