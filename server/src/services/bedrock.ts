import {
  BedrockRuntimeClient,
  ConverseCommand,
  Message,
  Tool,
  ToolConfiguration,
  SystemContentBlock,
  InferenceConfiguration
} from "@aws-sdk/client-bedrock-runtime";
import { logger } from "../utils/logger.js";

export interface BedrockConfig {
  region: string;
  modelId: string;
}

export interface BedrockConverseOptions {
  messages: Message[];
  system?: string | SystemContentBlock[];
  tools?: Tool[];
  modelId?: string;
  client?: BedrockRuntimeClient;
  inferenceConfig?: InferenceConfiguration;
}

export interface BedrockToolUseRequest {
  toolUseId: string;
  name: string;
  input: Record<string, any>;
}

export interface BedrockConverseResponse {
  message: Message;
  stopReason: string;
  text: string;
  toolUses: BedrockToolUseRequest[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

let activeBedrockClient: BedrockRuntimeClient | null = null;

/**
 * Validates and retrieves Bedrock configuration from environment variables.
 */
export function getBedrockConfig(): BedrockConfig {
  const region = process.env.AWS_REGION;
  const modelId = process.env.BEDROCK_MODEL_ID;

  if (!region || region.trim() === "") {
    throw new Error("Missing required environment variable: AWS_REGION");
  }
  if (!modelId || modelId.trim() === "") {
    throw new Error("Missing required environment variable: BEDROCK_MODEL_ID");
  }

  return {
    region: region.trim(),
    modelId: modelId.trim()
  };
}

/**
 * Creates or retrieves the singleton BedrockRuntimeClient using the standard AWS credential chain.
 */
export function getBedrockRuntimeClient(regionOverride?: string): BedrockRuntimeClient {
  if (activeBedrockClient) {
    return activeBedrockClient;
  }

  const region = regionOverride || process.env.AWS_REGION || "us-east-1";
  activeBedrockClient = new BedrockRuntimeClient({ region });
  return activeBedrockClient;
}

/**
 * Allows injecting or resetting a Bedrock client (primarily for testing).
 */
export function setBedrockRuntimeClient(client: BedrockRuntimeClient | null): void {
  activeBedrockClient = client;
}

/**
 * Executes a conversation turn with Amazon Bedrock Runtime Converse API.
 */
export async function generateResponse(options: BedrockConverseOptions): Promise<BedrockConverseResponse> {
  const config = getBedrockConfig();
  const modelId = options.modelId || config.modelId;
  const client = options.client || getBedrockRuntimeClient(config.region);

  const systemBlocks: SystemContentBlock[] | undefined = options.system
    ? typeof options.system === "string"
      ? [{ text: options.system }]
      : options.system
    : undefined;

  const toolConfig: ToolConfiguration | undefined =
    options.tools && options.tools.length > 0 ? { tools: options.tools } : undefined;

  try {
    const command = new ConverseCommand({
      modelId,
      messages: options.messages,
      system: systemBlocks,
      toolConfig,
      inferenceConfig: options.inferenceConfig
    });

    const response = await client.send(command);

    if (!response.output || !response.output.message) {
      throw new Error("Amazon Bedrock returned an empty response output.");
    }

    const message = response.output.message;
    const contentBlocks = message.content || [];

    const textParts: string[] = [];
    const toolUses: BedrockToolUseRequest[] = [];

    for (const block of contentBlocks) {
      if (block.text) {
        textParts.push(block.text);
      }
      if (block.toolUse && block.toolUse.name && block.toolUse.toolUseId) {
        toolUses.push({
          toolUseId: block.toolUse.toolUseId,
          name: block.toolUse.name,
          input: (block.toolUse.input as Record<string, any>) || {}
        });
      }
    }

    return {
      message,
      stopReason: response.stopReason || "end_turn",
      text: textParts.join("\n").trim(),
      toolUses,
      usage: response.usage
    };
  } catch (error: any) {
    logger.error("Error communicating with Amazon Bedrock Converse API:", error.message || error);

    // Sanitize error messages to ensure no credentials or sensitive tokens leak
    if (error.name === "UnrecognizedClientException" || error.name === "CredentialsProviderError" || error.name === "InvalidSignatureException") {
      throw new Error("AWS authentication failed. Please verify AWS credentials or IAM permissions.");
    }

    if (error.name === "ResourceNotFoundException") {
      throw new Error(`Amazon Bedrock model not found or unavailable in this region: ${modelId}`);
    }

    if (error.name === "ValidationException") {
      throw new Error(`Bedrock request validation error: ${error.message}`);
    }

    if (error.name === "TimeoutError" || error.name === "RequestTimeout") {
      throw new Error("Amazon Bedrock request timed out.");
    }

    throw new Error(error.message || "Failed to communicate with Amazon Bedrock.");
  }
}
