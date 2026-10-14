# EKARA — Voice-First Assistance Platform for Senior Care

EKARA is a voice-first assistance platform primarily designed for older adults living independently while staying connected with remote family members and caregivers.

---

## 🏛️ System Architecture

EKARA is built in modular phases:
1. **Phase 1: Backend Foundation (MCP Server)** — Model Context Protocol tools and streamable HTTP transport for daily schedule, simulated front door telemetry, and mock caregiver alerts.
2. **Phase 2: Google Gemini AI Orchestration** — AI orchestration layer using the Google Gen AI SDK (`gemini-3.5-flash-lite`) to understand natural language requests, select and validate EKARA tools, execute tool logic safely, and generate clear, senior-friendly voice responses.
3. **Phase 3: Alexa+ MCP Add-on Integration** — Scaffolding and protocol compliance enabling Alexa+ to connect directly to EKARA's Streamable HTTP MCP endpoint (`/mcp`), discover tools, and execute voice actions.

```
ekara/
├── addon-package/             # Phase 3: Alexa+ MCP Add-on manifest & scaffolding
│   ├── addon.json             # Official Alexa+ add-on manifest
│   └── README.md              # Alexa+ CLI deployment & tunneling instructions
└── server/
    ├── package.json           # Dependencies (@google/genai, @modelcontextprotocol/sdk, express)
    ├── tsconfig.json          # TypeScript configuration (NodeNext)
    ├── .env.example           # Environment template with Google Gemini configuration
    ├── .env                   # Local environment config (gitignored)
    ├── src/
    │   ├── index.ts           # Express server, /health, /mcp (Streamable HTTP), and /api/assistant
    │   ├── services/
    │   │   ├── gemini.ts      # Google Gemini client and resilient error handling
    │   │   └── orchestrator.ts# AI orchestration layer (tool selection, validation, safety rules)
    │   ├── tools/
    │   │   ├── schedule.ts    # get_daily_schedule MCP tool
    │   │   ├── frontDoor.ts   # check_front_door MCP tool
    │   │   └── caregiver.ts   # notify_caregiver MCP tool
    │   ├── data/
    │   │   └── mockSchedule.ts# Mock senior daily schedule data
    │   └── utils/
    │       └── logger.ts      # Logging utility
    └── tests/
        ├── schedule.test.ts   # Schedule tool unit tests
        ├── frontDoor.test.ts  # Front door telemetry unit tests
        ├── caregiver.test.ts  # Caregiver notification unit tests
        ├── health.test.ts     # Express health endpoint unit tests
        ├── bedrock.test.ts    # Amazon Bedrock Converse API unit tests
        ├── orchestrator.test.ts # AI Orchestration & safety rules unit tests
        ├── assistantEndpoint.test.ts # POST /api/assistant API endpoint unit tests
        └── mcpProtocol.test.ts# Phase 3: MCP Streamable HTTP JSON-RPC protocol tests
```

---

## 🚀 Installation & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **AWS Credentials**: Configured via standard AWS credential provider chain (`~/.aws/credentials`, environment variables, or IAM role)

### 2. Install Dependencies

Navigate to the `server/` directory and install dependencies:

```bash
cd server
npm install
```

### 3. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configuration variables:
```env
PORT=3000
NODE_ENV=development
HOST=0.0.0.0

# Google Gemini AI Orchestration (Phase 2)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

> **Security Note:** Real API keys must never be committed to git. EKARA loads credentials via environment variables and excludes `.env` via `.gitignore`.

---

## 🏃 Running the Server

### Development Mode (with hot-reload)
```bash
cd server
npm run dev
```

### Production Build & Run
```bash
cd server
npm run build
npm start
```

Once started, the server listens at `http://localhost:3000`:
- **Health Check Endpoint**: `GET http://localhost:3000/health`
- **MCP HTTP Transport**: `POST http://localhost:3000/mcp` / `GET http://localhost:3000/mcp`
- **AI Assistant Endpoint**: `POST http://localhost:3000/api/assistant`

---

## 🎙️ Phase 3: Alexa+ MCP Add-on Integration

Alexa+ connects directly to EKARA's Streamable HTTP endpoint as an **MCP Client**.

### Architecture Overview

```
Alexa+ (Voice Interface)
         │
         ▼ (HTTPS)
   EKARA MCP Server (/mcp)
         │
         ├──► get_daily_schedule ──► Mock senior schedule
         ├──► check_front_door   ──► Simulated front porch telemetry
         └──► notify_caregiver   ──► Safe mock notification adapter
```

> The existing Amazon Bedrock `/api/assistant` pipeline remains intact and runs in parallel for web, mobile, or smart display clients.

### Remote Deployment & Tunneling Requirement
Alexa+ requires an internet-accessible HTTPS endpoint to invoke your MCP server:
- **Local Development URL**: `http://localhost:3000/mcp`
- **Remote Public URL**: `https://<public-domain>/mcp`

To expose your local development server for testing with Alexa+:
```bash
# Using Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
```
Then configure the generated HTTPS URL in `addon-package/addon.json`:
```json
{
  "integrations": [
    {
      "type": "MCP",
      "config": {
        "endpoints": {
          "default": {
            "type": "HTTPS",
            "uri": "https://<your-public-domain>/mcp"
          }
        }
      }
    }
  ]
}
```

### Alexa AI CLI Deployment Workflow
1. Navigate to the project directory:
   ```bash
   cd d:\ekara
   ```
2. Configure developer credentials with the official `alexa-ai` CLI:
   ```bash
   alexa-ai configure
   ```
3. Deploy the add-on package:
   ```bash
   alexa-ai deploy
   ```
4. Test with the **Alexa+ Web Simulator** in the Amazon Developer Console.

### Example Voice Interactions
- **Schedule**:
  - *User:* "What do I need to do today?"
  - *Alexa+:* Calls `get_daily_schedule`
  - *Alexa+ Response:* "You have two items on your schedule today: Morning blood pressure check at 8:30 AM and Physical therapy at 2:00 PM."
- **Front Door**:
  - *User:* "Is anyone at my front door?"
  - *Alexa+:* Calls `check_front_door`
  - *Alexa+ Response:* "According to simulated smart home telemetry, your front door is locked and no motion is currently detected."
- **Caregiver Alert**:
  - *User:* "Tell my daughter I need help."
  - *Alexa+:* Calls `notify_caregiver`
  - *Alexa+ Response:* "I have recorded your request for your daughter in the prototype notification log. Please note no live SMS was sent in this prototype."

### Authentication Status
- **Current Prototype State**: Unauthenticated / mock data mode. Alexa+ account linking is **not** required for current simulated telemetry and mock schedules. No fake OAuth endpoints or placeholder tokens are implemented.
- **Production Authentication Readiness**: When connecting to real patient health records or live hardware (Ring, Twilio), an OAuth 2.1 authorization server with PKCE (`S256`) will be introduced to handle account linking and bearer token verification.

---

## 🔍 Verification & Reality Check

### ✅ IMPLEMENTED (Production / Prototype Ready)
- Fully functional MCP Server implementing the official `@modelcontextprotocol/sdk` Streamable HTTP specification at `POST /mcp`.
- Session `initialize`, `tools/list`, and `tools/call` over JSON-RPC 2.0 with SSE streams.
- Three fully validated, typed MCP tools (`get_daily_schedule`, `check_front_door`, `notify_caregiver`).
- Automatic `Accept` header normalization for Streamable HTTP compatibility across varied HTTP clients.
- Amazon Bedrock AI orchestration (`/api/assistant`) with Converse API and safety guardrails.
- Official Alexa+ MCP Add-on manifest scaffolding (`addon-package/addon.json`).
- Automated test coverage across 8 test suites (45 tests).

### ⚠️ NOT YET REAL (Explicit Prototype Limitations)
- **Front-Door Hardware**: Telemetry is simulated data for prototype testing. No active Ring or physical camera connection.
- **Smart-Lock Telemetry**: Lock statuses are simulated; no physical Z-Wave/Zigbee/Matter lock hardware is actuated.
- **Caregiver Messaging**: Notifications are intercepted and recorded by a mock adapter. No real SMS, WhatsApp, or phone calls are dispatched.
- **Emergency Services**: EKARA does not connect to 911 or dispatch medical responders.

---

## 🧪 Testing

### Run Automated Unit & Protocol Tests
```bash
cd server
npm test
```

Executes 8 test suites (45 automated tests) covering:
- **`mcpProtocol.test.ts`**: Streamable HTTP JSON-RPC 2.0 protocol testing (`initialize`, `tools/list`, `tools/call`, validation, error handling).
- **`schedule.test.ts`**: Mock schedule data structure and MCP text output.
- **`frontDoor.test.ts`**: Simulated sensor telemetry, event history, and disclaimers.
- **`caregiver.test.ts`**: Mock notification adapter dispatching, argument validation, and MCP formatting.
- **`health.test.ts`**: Express health check endpoint status and registered tools.
- **`bedrock.test.ts`**: Amazon Bedrock Converse API invocation, config validation, and sanitized error mapping.
- **`orchestrator.test.ts`**: End-to-end tool orchestration (schedule, front door, caregiver), conversational queries, Zod validation enforcement, and safety prompt compliance.
- **`assistantEndpoint.test.ts`**: `POST /api/assistant` HTTP request validation, error responses (400, 502, 503), and payload formats.