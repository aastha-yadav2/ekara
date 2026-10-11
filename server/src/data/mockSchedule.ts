export interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  category: "medication" | "appointment" | "activity" | "social" | "meal";
  status: "pending" | "completed" | "upcoming";
  notes?: string;
}

export interface DailyScheduleResponse {
  _isMock: boolean;
  source: string;
  date: string;
  timeZone: string;
  schedule: ScheduleItem[];
  summary: string;
}

export const MOCK_SCHEDULE_DATA: ScheduleItem[] = [
  {
    id: "sched-001",
    title: "Morning Medication & Water",
    time: "08:00 AM",
    category: "medication",
    status: "completed",
    notes: "Take 1 Blood Pressure tablet with breakfast."
  },
  {
    id: "sched-002",
    title: "Breakfast & Morning Tea",
    time: "08:30 AM",
    category: "meal",
    status: "completed"
  },
  {
    id: "sched-003",
    title: "Gentle Garden Walk & Stretching",
    time: "10:30 AM",
    category: "activity",
    status: "completed",
    notes: "15 minutes in back garden."
  },
  {
    id: "sched-004",
    title: "Lunch with Sarah (Daughter)",
    time: "12:30 PM",
    category: "social",
    status: "upcoming",
    notes: "Sarah bringing vegetable soup."
  },
  {
    id: "sched-005",
    title: "Afternoon Eye Drop Medication",
    time: "02:00 PM",
    category: "medication",
    status: "pending",
    notes: "Left eye 2 drops."
  },
  {
    id: "sched-006",
    title: "Telehealth Check-in with Dr. Miller",
    time: "04:15 PM",
    category: "appointment",
    status: "pending",
    notes: "Routine quarterly wellness check on tablet."
  },
  {
    id: "sched-007",
    title: "Evening Medication & Hydration",
    time: "08:00 PM",
    category: "medication",
    status: "pending",
    notes: "Take evening supplement."
  }
];

export function getMockSchedule(date?: string): DailyScheduleResponse {
  const targetDate = date || new Date().toISOString().split("T")[0];
  const pendingCount = MOCK_SCHEDULE_DATA.filter((i) => i.status === "pending").length;
  
  return {
    _isMock: true,
    source: "EKARA_MOCK_SCHEDULE_PROVIDER",
    date: targetDate,
    timeZone: "America/New_York",
    schedule: MOCK_SCHEDULE_DATA,
    summary: `You have ${MOCK_SCHEDULE_DATA.length} items scheduled for today (${targetDate}). ${pendingCount} remaining tasks.`
  };
}
