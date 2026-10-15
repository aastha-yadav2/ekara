import type { AssistantApiResponse, ServerHealthResponse } from '../types/assistant';

/**
 * Human-friendly error translation conforming to senior accessibility and security requirements.
 * Never displays AWS keys, stack traces, or internal error objects.
 */
function mapHttpErrorToUserMessage(status: number, rawError?: string): string {
  switch (status) {
    case 400:
      return 'Please ask a question or speak a request so EKARA can help you.';
    case 502:
      return 'AI cloud service connection is currently paused. Please verify cloud authentication credentials in settings.';
    case 503:
      return 'The AI assistant service is temporarily not configured on the server. Please check service settings.';
    case 504:
      return 'EKARA took a little too long to answer. Please try asking again in a moment.';
    default:
      if (
        rawError &&
        !rawError.toLowerCase().includes('aws') &&
        !rawError.toLowerCase().includes('token') &&
        !rawError.toLowerCase().includes('credential') &&
        !rawError.toLowerCase().includes('bedrock')
      ) {
        return rawError;
      }
      return 'EKARA is currently having trouble processing this request. Please try again shortly.';
  }
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/**
 * Sends a natural language request to the existing POST /api/assistant endpoint.
 */
export async function sendAssistantMessage(message: string): Promise<AssistantApiResponse> {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Please ask a question or speak a request so EKARA can help you.'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s client timeout

    const response = await fetch(`${API_BASE}/api/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ message: trimmed }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Parse JSON safely
    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const userFriendlyMessage = mapHttpErrorToUserMessage(
        response.status,
        data?.error
      );
      return {
        success: false,
        error: userFriendlyMessage
      };
    }

    return {
      success: true,
      message: data?.message || 'I have completed that for you.',
      toolUsed: data?.toolUsed ?? null
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'The request timed out. Please try asking again.'
      };
    }

    return {
      success: false,
      error: 'Cannot connect to EKARA server. Please ensure the backend server is running.'
    };
  }
}

/**
 * Checks server health via GET /health endpoint.
 */
export async function checkServerHealth(): Promise<ServerHealthResponse | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data as ServerHealthResponse;
    }
    return null;
  } catch {
    return null;
  }
}
