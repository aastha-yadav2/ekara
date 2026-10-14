import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { getDailyScheduleInputSchema, handleGetDailySchedule } from "./tools/schedule.js";
import { checkFrontDoorInputSchema, handleCheckFrontDoor } from "./tools/frontDoor.js";
import { notifyCaregiverInputSchema, handleNotifyCaregiver } from "./tools/caregiver.js";
import { orchestrateUserRequest } from "./services/orchestrator.js";
import { logger } from "./utils/logger.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Handle malformed JSON body errors safely
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      success: false,
      error: "Malformed JSON payload in request."
    });
    return;
  }
  next(err);
});

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

// Initialize MCP Server
const mcpServer = new McpServer({
  name: "EKARA MCP Assistance Server",
  version: "1.0.0"
});

// Register Tool 1: get_daily_schedule
mcpServer.tool(
  "get_daily_schedule",
  "Retrieves the user's daily schedule, routine information, medication times, and appointments.",
  getDailyScheduleInputSchema,
  async (args) => handleGetDailySchedule(args)
);

// Register Tool 2: check_front_door
mcpServer.tool(
  "check_front_door",
  "Checks simulated smart home front door telemetry, lock state, motion sensors, and recent porch activity. Note: Data is currently simulated for prototype testing.",
  checkFrontDoorInputSchema,
  async (args) => handleCheckFrontDoor(args)
);

// Register Tool 3: notify_caregiver
mcpServer.tool(
  "notify_caregiver",
  "Sends a notification message to a designated family member or caregiver via a safe mock notification adapter. Note: Does not dispatch real SMS messages in this prototype.",
  notifyCaregiverInputSchema,
  async (args) => handleNotifyCaregiver(args)
);

// Health Check Endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "EKARA MCP Assistance Server",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    tools: ["get_daily_schedule", "check_front_door", "notify_caregiver"]
  });
});

// AI Assistant Endpoint (Phase 2 - Google Gemini Orchestration)
app.post("/api/assistant", async (req: Request, res: Response) => {
  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string" || message.trim() === "") {
      res.status(400).json({
        success: false,
        error: "Invalid request: 'message' is required and must be a non-empty string."
      });
      return;
    }

    const result = await orchestrateUserRequest(message);
    res.status(200).json(result);
  } catch (error: any) {
    logger.error("Error processing /api/assistant request:", error.message || error);

    const errorMessage = error.message || "An unexpected error occurred.";

    if (errorMessage.includes("Missing required environment variable") || errorMessage.includes("configuration")) {
      res.status(503).json({
        success: false,
        error: "AI service is not configured. Please ensure GEMINI_API_KEY is set."
      });
      return;
    }

    if (
      errorMessage.includes("authentication failed") ||
      errorMessage.includes("GEMINI_API_KEY") ||
      errorMessage.includes("credentials") ||
      errorMessage.includes("API key")
    ) {
      res.status(502).json({
        success: false,
        error: "AI service authentication failure. Please check Gemini API key."
      });
      return;
    }

    if (errorMessage.includes("timed out")) {
      res.status(504).json({
        success: false,
        error: "AI service timed out while processing your request. Please try again."
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Unable to process your request with AI assistant at this time."
    });
  }
});

// Normalize Accept header for Streamable HTTP to ensure compatibility with all MCP clients (e.g. Alexa+, curl)
app.use("/mcp", (req: Request, res: Response, next: NextFunction) => {
  const currentAccept = req.headers["accept"] || "";
  if (!currentAccept || currentAccept === "*/*") {
    req.headers["accept"] = "application/json, text/event-stream";
  } else {
    const parts = currentAccept.split(",").map((p) => p.trim());
    const hasJson = parts.some((p) => p.includes("application/json") || p === "*/*");
    const hasEventStream = parts.some((p) => p.includes("text/event-stream"));

    let updated = currentAccept;
    if (!hasJson) updated = `application/json, ${updated}`;
    if (!hasEventStream) updated = `${updated}, text/event-stream`;
    req.headers["accept"] = updated;
  }
  next();
});

// Streamable HTTP Transport for MCP POST Endpoint
app.post("/mcp", async (req: Request, res: Response) => {
  try {
    const transport = new StreamableHTTPServerTransport();
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      transport.close();
    });
  } catch (error) {
    logger.error("Error processing /mcp request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal MCP Server Error" });
    }
  }
});

// Streamable HTTP Transport for MCP GET Endpoint
app.get("/mcp", async (req: Request, res: Response) => {
  try {
    const transport = new StreamableHTTPServerTransport();
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);

    res.on("close", () => {
      transport.close();
    });
  } catch (error) {
    logger.error("Error processing /mcp GET request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal MCP Server Error" });
    }
  }
});

// Start listening if not running under test framework
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, HOST, () => {
    logger.info(`Server started at http://${HOST}:${PORT}`);
    logger.info(`Health check endpoint: http://localhost:${PORT}/health`);
    logger.info(`MCP HTTP endpoint: http://localhost:${PORT}/mcp`);
  });
}

export { app, mcpServer };
