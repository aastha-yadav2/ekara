export interface AssistantApiRequest {
  message: string;
}

export interface AssistantApiResponse {
  success: boolean;
  message?: string;
  toolUsed?: string | null;
  error?: string;
}

export interface ServerHealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  tools: string[];
}

export interface ConversationMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  toolUsed?: string | null;
  isError?: boolean;
  errorType?: 'bad_request' | 'auth_failed' | 'unconfigured' | 'timeout' | 'network_error' | 'unknown';
  errorPrompt?: string;
}

export type ToolCapability = 'get_daily_schedule' | 'check_front_door' | 'notify_caregiver';

export interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  prompt: string;
  iconName: 'calendar' | 'door' | 'heart';
  toolExpected: ToolCapability;
}

export type RoutineStatus = 'ready' | 'checking' | 'action_completed' | 'error';
export type FrontDoorStatus = 'ready' | 'checking' | 'action_completed' | 'error';
export type CaregiverStatus = 'connected' | 'checking' | 'action_completed' | 'error';

export interface StatusCardState {
  routineStatus: RoutineStatus;
  routineDetail: string;
  frontDoorStatus: FrontDoorStatus;
  frontDoorDetail: string;
  caregiverStatus: CaregiverStatus;
  caregiverDetail: string;
}
