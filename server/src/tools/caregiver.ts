import { z } from "zod";

export interface NotifyCaregiverArgs {
  caregiverName: string;
  contactId: string;
  message: string;
  priority?: "low" | "medium" | "high";
}

export interface MockNotificationResult {
  _isMockAdapter: boolean;
  status: "queued_mock_success";
  notificationId: string;
  timestamp: string;
  disclaimer: string;
  dispatchDetails: {
    caregiverName: string;
    contactId: string;
    message: string;
    priority: "low" | "medium" | "high";
    estimatedDelivery: string;
    channel: "SMS / App Push (Simulated)";
  };
}

export const notifyCaregiverInputSchema = {
  caregiverName: z
    .string()
    .min(1, "Caregiver name cannot be empty")
    .describe("Name of the caregiver or family member (e.g. 'Sarah', 'Dr. Miller')."),
  contactId: z
    .string()
    .min(1, "Contact identifier cannot be empty")
    .describe("Contact identifier such as phone number, email, or family app ID."),
  message: z
    .string()
    .min(1, "Notification message cannot be empty")
    .describe("The alert or notification text to send to the caregiver."),
  priority: z
    .enum(["low", "medium", "high"])
    .optional()
    .default("medium")
    .describe("Priority level of the notification. Defaults to 'medium'.")
};

export function executeNotifyCaregiver(args: NotifyCaregiverArgs): MockNotificationResult {
  if (!args.caregiverName || args.caregiverName.trim() === "") {
    throw new Error("Validation Error: caregiverName is required");
  }
  if (!args.contactId || args.contactId.trim() === "") {
    throw new Error("Validation Error: contactId is required");
  }
  if (!args.message || args.message.trim() === "") {
    throw new Error("Validation Error: message is required");
  }

  const now = new Date();
  const notificationId = `mock-notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return {
    _isMockAdapter: true,
    status: "queued_mock_success",
    notificationId,
    timestamp: now.toISOString(),
    disclaimer: "MOCK ADAPTER NOTICE: Notification successfully intercepted and logged by mock notification adapter. No SMS or push notification was sent.",
    dispatchDetails: {
      caregiverName: args.caregiverName,
      contactId: args.contactId,
      message: args.message,
      priority: args.priority || "medium",
      estimatedDelivery: "Immediate (Simulated)",
      channel: "SMS / App Push (Simulated)"
    }
  };
}

export async function handleNotifyCaregiver(args: NotifyCaregiverArgs) {
  const result = executeNotifyCaregiver(args);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}
