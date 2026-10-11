import { z } from "zod";
import { getMockSchedule } from "../data/mockSchedule.js";

export const getDailyScheduleInputSchema = {
  date: z
    .string()
    .optional()
    .describe("Optional target date in YYYY-MM-DD format. Defaults to today's date.")
};

export function executeGetDailySchedule(args: { date?: string }) {
  const data = getMockSchedule(args.date);
  return {
    success: true,
    data
  };
}

export async function handleGetDailySchedule(args: { date?: string }) {
  const result = executeGetDailySchedule(args);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result.data, null, 2)
      }
    ]
  };
}
