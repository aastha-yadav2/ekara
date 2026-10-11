import { describe, it, expect } from "vitest";
import { executeNotifyCaregiver, handleNotifyCaregiver } from "../src/tools/caregiver.js";

describe("notify_caregiver Tool", () => {
  it("should process mock notification and return structured mock response without sending real messages", () => {
    const payload = {
      caregiverName: "Sarah (Daughter)",
      contactId: "+15550192834",
      message: "Mom missed her afternoon medication check-in.",
      priority: "high" as const
    };

    const result = executeNotifyCaregiver(payload);

    expect(result._isMockAdapter).toBe(true);
    expect(result.status).toBe("queued_mock_success");
    expect(result.notificationId).toMatch(/^mock-notif-/);
    expect(result.dispatchDetails.caregiverName).toBe(payload.caregiverName);
    expect(result.dispatchDetails.contactId).toBe(payload.contactId);
    expect(result.dispatchDetails.message).toBe(payload.message);
    expect(result.dispatchDetails.priority).toBe("high");
    expect(result.disclaimer).toContain("MOCK ADAPTER NOTICE");
  });

  it("should enforce validation and throw error on empty parameters", () => {
    expect(() =>
      executeNotifyCaregiver({
        caregiverName: "",
        contactId: "+15550192834",
        message: "Test message"
      })
    ).toThrowError("caregiverName is required");

    expect(() =>
      executeNotifyCaregiver({
        caregiverName: "Sarah",
        contactId: " ",
        message: "Test message"
      })
    ).toThrowError("contactId is required");

    expect(() =>
      executeNotifyCaregiver({
        caregiverName: "Sarah",
        contactId: "+15550192834",
        message: ""
      })
    ).toThrowError("message is required");
  });

  it("should format MCP handler content payload correctly", async () => {
    const response = await handleNotifyCaregiver({
      caregiverName: "Dr. Miller",
      contactId: "drmiller@example.com",
      message: "Patient wellness report ready."
    });

    expect(response.content).toBeDefined();
    expect(response.content[0].type).toBe("text");

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed._isMockAdapter).toBe(true);
    expect(parsed.dispatchDetails.caregiverName).toBe("Dr. Miller");
  });
});
