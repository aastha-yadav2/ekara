import {
  GoogleGenAI,
  GenerateContentConfig,
  Content,
  FunctionDeclaration,
  createPartFromText,
  createPartFromFunctionCall,
  createPartFromFunctionResponse
} from "@google/genai";
import { logger } from "../utils/logger.js";

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface GeminiToolCall {
  id?: string;
  name: string;
  args: Record<string, any>;
}

export interface GeminiGenerateOptions {
  contents: Content[] | string;
  systemInstruction?: string;
  tools?: { functionDeclarations: FunctionDeclaration[] }[];
  model?: string;
  client?: GoogleGenAI;
}

export interface GeminiGenerateResponse {
  text: string;
  functionCalls: GeminiToolCall[];
  rawResponse?: any;
}

let activeGeminiClient: GoogleGenAI | null = null;

/**
 * Validates and retrieves Gemini configuration from environment variables.
 */
export function getGeminiConfig(): GeminiConfig {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Missing required environment variable: GEMINI_API_KEY");
  }

  return {
    apiKey: apiKey.trim(),
    model: model.trim()
  };
}

/**
 * Creates or retrieves the singleton GoogleGenAI client using GEMINI_API_KEY.
 */
export function getGeminiClient(apiKeyOverride?: string): GoogleGenAI {
  if (activeGeminiClient) {
    return activeGeminiClient;
  }

  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Missing required environment variable: GEMINI_API_KEY");
  }

  logger.info("Initializing GoogleGenAI client with GEMINI_API_KEY.");
  activeGeminiClient = new GoogleGenAI({ apiKey: apiKey.trim() });
  return activeGeminiClient;
}

/**
 * Allows injecting or resetting the Gemini client (primarily for testing and mocking).
 */
export function setGeminiClient(client: GoogleGenAI | null): void {
  activeGeminiClient = client;
}

/**
 * Sanitizes sensitive information (like API keys or tokens) from error strings.
 */
export function sanitizeErrorMessage(msg: string): string {
  if (!msg) return "An unexpected error occurred.";
  return msg
    .replace(/key=[A-Za-z0-9_-]+/gi, "key=[REDACTED]")
    .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED]");
}

/**
 * Maps raw Gemini errors to clean, safe errors that do not leak secrets or stack traces.
 */
function handleGeminiError(error: any, model: string): never {
  const msg = (error.message || "").toLowerCase();
  const status = error.status || error.statusCode || error.code;

  if (
    status === 401 ||
    status === 403 ||
    msg.includes("api_key") ||
    msg.includes("api key") ||
    msg.includes("unauthenticated") ||
    msg.includes("permission_denied") ||
    msg.includes("unauthorized")
  ) {
    throw new Error("Gemini authentication failed. Please verify GEMINI_API_KEY.");
  }

  if (status === 404 || msg.includes("not found")) {
    throw new Error(`Gemini model not found or unavailable: ${model}`);
  }

  if (
    status === 429 ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit")
  ) {
    throw new Error("Gemini API rate limit or quota exceeded.");
  }

  if (
    msg.includes("timeout") ||
    msg.includes("deadline") ||
    error.name === "AbortError" ||
    status === 408
  ) {
    throw new Error("Gemini API request timed out.");
  }

  if (
    msg.includes("fetch failed") ||
    msg.includes("enotfound") ||
    msg.includes("network")
  ) {
    throw new Error("Network error connecting to Gemini API.");
  }

  throw new Error(sanitizeErrorMessage(error.message) || "Failed to communicate with Gemini API.");
}

/**
 * Generates a response using Google Gemini API.
 */
export async function generateGeminiResponse(
  options: GeminiGenerateOptions
): Promise<GeminiGenerateResponse> {
  let client: GoogleGenAI;
  let model: string;

  if (options.client) {
    client = options.client;
    model = options.model || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  } else {
    const config = getGeminiConfig();
    model = options.model || config.model;
    client = getGeminiClient(config.apiKey);
  }

  const config: GenerateContentConfig = {};
  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }
  if (options.tools && options.tools.length > 0) {
    config.tools = options.tools;
  }

  const maxAttempts = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: options.contents as any,
        config
      });

      const text = response.text || "";
      const rawCalls = response.functionCalls || [];
      const functionCalls: GeminiToolCall[] = rawCalls.map((call: any) => ({
        name: call.name,
        args: (call.args as Record<string, any>) || {},
        id: call.id
      }));

      return {
        text: text.trim(),
        functionCalls,
        rawResponse: response
      };
    } catch (error: any) {
      lastError = error;
      const status = error.status || error.statusCode || error.code;
      const msg = (error.message || "").toLowerCase();
      const isTransient =
        status === 503 ||
        status === 429 ||
        msg.includes("high demand") ||
        msg.includes("unavailable");

      if (isTransient && attempt < maxAttempts) {
        logger.warn(`Gemini API transient error (${status || msg}), retrying attempt ${attempt + 1}/${maxAttempts}...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      break;
    }
  }

  logger.error("Error communicating with Gemini API:", sanitizeErrorMessage(lastError.message || String(lastError)));
  handleGeminiError(lastError, model);
}

export {
  createPartFromText,
  createPartFromFunctionCall,
  createPartFromFunctionResponse
};
