import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  orchestrateUserRequest,
  executeToolAction,
  EKARA_SYSTEM_PROMPT,
  EKARA_BEDROCK_TOOLS
} from "../src/services/orchestrator.js";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { setBedrockRuntimeClient } from "../src/services/bedrock.js";

describe("EKARA AI Orchestration Layer", () => {
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

    it("should define valid Bedrock tool specifications matching MCP tools", () => {
      const toolNames = EKARA_BEDROCK_TOOLS.map((t: any) => t.toolSpec.name);
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
      const mockSend = vi
        .fn()
        // Turn 1: Bedrock chooses get_daily_schedule
        .mockResolvedValueOnce({
          output: {
            message: {
              role: "assistant",
              content: [
                {
                  toolUse: {
                    toolUseId: "tool-sched-1",
                    name: "get_daily_schedule",
                    input: { date: "2026-10-09" }
                  }
                }
              ]
            }
          },
          stopReason: "tool_use"
        })
        // Turn 2: Bedrock summarizes schedule result
        .mockResolvedValueOnce({
          output: {
            message: {
              role: "assistant",
              content: [
                {
                  text: "You have two items on your schedule today: Morning blood pressure check at 8:30 AM and Physical therapy at 2:00 PM."
                }
              ]
            }
          },
          stopReason: "end_turn"
        });

      const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

      const result = await orchestrateUserRequest("What do I need to do today?", { client: mockClient });

      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe("get_daily_schedule");
      expect(result.message).toContain("Morning blood pressure check");
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("2. Front door request: selects check_front_door and returns simulated telemetry summary", async () => {
      const mockSend = vi
        .fn()
        // Turn 1: Bedrock chooses check_front_door
        .mockResolvedValueOnce({
          output: {
            message: {
              role: "assistant",
              content: [
                {
                  toolUse: {
                    toolUseId: "tool-door-1",
                    name: "check_front_door",
                    input: { location: "Front Porch" }
                  }
                }
              ]
            }
          },
          stopReason: "tool_use"
        })
        // Turn 2: Bedrock summarizes front door telemetry
        .mockResolvedValueOnce({
          output: {
            message: {
              role: "assistant",
              content: [
                {
                  text: "According to simulated smart home telemetry, your front door is currently locked and no motion is currently detected."
                }
              ]
            }
          },
          stopReason: "end_turn"
        });

      const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

      const result = await orchestrateUserRequest("Is anyone at my front door?", { client: mockClient });

      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe("check_front_door");
      expect(result.message).toContain("simulated smart home telemetry");
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("3. Caregiver request: selects notify_caregiver and returns mock adapter confirmation", async () => {
      const mockSend = vi
        .fn()
        // Turn 1: Bedrock chooses notify_caregiver
        .mockResolvedValueOnce({
          output: {
            message: {
              role: "assistant",
              content: [
                {
                  toolUse: {
                    toolUseId: "tool-care-1",
                    name: "notify_caregiver",
                    input: {
                      caregiverName: "Daughter (Sarah)",
                      contactId: "caregiver-family-app",
                      message: "Dad asked for help.",
                      priority: "medium"
                    }
                  }
                }
              ]
            }
          },
          stopReason: "tool_use"
        })
        // Turn 2: Bedrock confirms mock notification queued
        .mockResolvedValueOnce({
          output: {
            message: {
              role: "assistant",
              content: [
                {
                  text: "I have recorded your message for your daughter using the prototype mock notification adapter. Please note no live SMS was dispatched."
                }
              ]
            }
          },
          stopReason: "end_turn"
        });

      const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

      const result = await orchestrateUserRequest("Tell my daughter that I need help.", { client: mockClient });

      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe("notify_caregiver");
      expect(result.message).toContain("prototype mock notification adapter");
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("4. Conversational request: answers conversationally without executing any tool", async () => {
      const mockSend = vi.fn().mockResolvedValueOnce({
        output: {
          message: {
            role: "assistant",
            content: [
              {
                text: "Good morning! How are you doing today? Let me know if you need to check your schedule or front porch."
              }
            ]
          }
        },
        stopReason: "end_turn"
      });

      const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

      const result = await orchestrateUserRequest("Good morning EKARA", { client: mockClient });

      expect(result.success).toBe(true);
      expect(result.toolUsed).toBeNull();
      expect(result.message).toContain("Good morning!");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("5. Tool validation failure: handles tool argument errors gracefully in conversation turn", async () => {
      const mockSend = vi
        .fn()
        // Turn 1: Bedrock chooses notify_caregiver with missing required fields
        .mockResolvedValueOnce({
          output: {
            message: {
              role: "assistant",
              content: [
                {
                  toolUse: {
                    toolUseId: "tool-err-1",
                    name: "notify_caregiver",
                    input: { caregiverName: "" } // Invalid empty name, missing contactId and message
                  }
                }
              ]
            }
          },
          stopReason: "tool_use"
        })
        // Turn 2: Bedrock handles the error result and asks user for clarification
        .mockResolvedValueOnce({
          output: {
            message: {
              role: "assistant",
              content: [
                {
                  text: "Could you please tell me which caregiver you would like to notify and what message you'd like to send?"
                }
              ]
            }
          },
          stopReason: "end_turn"
        });

      const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

      const result = await orchestrateUserRequest("Send a message", { client: mockClient });

      expect(result.success).toBe(true);
      expect(result.toolUsed).toBe("notify_caregiver");
      expect(result.message).toContain("which caregiver");
      expect(mockSend).toHaveBeenCalledTimes(2);
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
