import { z } from "zod";

export interface FrontDoorStatus {
  _isSimulated: boolean;
  disclaimer: string;
  location: string;
  timestamp: string;
  doorLockStatus: "locked" | "unlocked";
  motionDetected: boolean;
  lastMotionTimestamp: string;
  batteryLevel: string;
  wifiSignal: string;
  recentEvents: Array<{
    id: string;
    timestamp: string;
    type: "motion" | "ring" | "package_delivery";
    summary: string;
  }>;
}

export const checkFrontDoorInputSchema = {
  location: z
    .string()
    .optional()
    .describe("Optional location name to check (e.g. 'Front Porch', 'Back Door'). Defaults to 'Front Porch'.")
};

export function executeCheckFrontDoor(args: { location?: string }) {
  const targetLocation = args.location || "Front Porch";
  const now = new Date();
  
  const status: FrontDoorStatus = {
    _isSimulated: true,
    disclaimer: "SIMULATED TELEMETRY: This is simulated smart home data for prototype testing. No active Ring or physical hardware connection.",
    location: targetLocation,
    timestamp: now.toISOString(),
    doorLockStatus: "locked",
    motionDetected: false,
    lastMotionTimestamp: new Date(now.getTime() - 14 * 60 * 1000).toISOString(), // 14 mins ago
    batteryLevel: "92%",
    wifiSignal: "Strong (-54 dBm)",
    recentEvents: [
      {
        id: "evt-101",
        timestamp: new Date(now.getTime() - 14 * 60 * 1000).toISOString(),
        type: "motion",
        summary: "Motion detected near front walkway (mail carrier)."
      },
      {
        id: "evt-100",
        timestamp: new Date(now.getTime() - 120 * 60 * 1000).toISOString(),
        type: "package_delivery",
        summary: "Amazon package placed at front porch."
      },
      {
        id: "evt-099",
        timestamp: new Date(now.getTime() - 300 * 60 * 1000).toISOString(),
        type: "ring",
        summary: "Doorbell button pressed - Sarah arrived."
      }
    ]
  };

  return {
    success: true,
    data: status
  };
}

export async function handleCheckFrontDoor(args: { location?: string }) {
  const result = executeCheckFrontDoor(args);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result.data, null, 2)
      }
    ]
  };
}
