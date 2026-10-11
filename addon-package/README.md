# EKARA Alexa+ MCP Add-on Package

This directory contains the official **Alexa+ MCP Add-on** scaffolding for **EKARA**.

## 📋 Manifest Configuration

The add-on manifest is defined in [`addon.json`](./addon.json) following the Amazon Alexa+ MCP Toolkit specification:

- **Name**: `EKARA`
- **Short Description**: `Intelligent support for safer, more independent living.`
- **Integration Type**: `MCP` (Model Context Protocol over Streamable HTTP)
- **Endpoint**: `https://<public-domain>/mcp`

### Example Voice Prompts
1. *"What do I need to do today?"* → Routes to `get_daily_schedule`
2. *"Is anyone at my front door?"* → Routes to `check_front_door`
3. *"Tell my daughter I need help."* → Routes to `notify_caregiver`

---

## 🚀 Deployment & Tunneling Workflow

Alexa+ requires a publicly accessible HTTPS endpoint pointing to the Streamable HTTP `/mcp` route.

### 1. Start Local EKARA Server
```bash
cd server
npm run dev
```
The server will listen at `http://localhost:3000/mcp`.

### 2. Expose via Cloudflare Tunnel
In a new terminal window:
```bash
cloudflared tunnel --url http://localhost:3000
```
This generates a secure public HTTPS URL, for example:
`https://ekara-preview.trycloudflare.com`

### 3. Update `addon.json`
Update the `integrations[0].config.endpoints.default.uri` in `addon.json`:
```json
{
  "integrations": [
    {
      "type": "MCP",
      "config": {
        "endpoints": {
          "default": {
            "type": "HTTPS",
            "uri": "https://ekara-preview.trycloudflare.com/mcp"
          }
        }
      }
    }
  ]
}
```

### 4. Deploy with Alexa AI CLI
Using the official `alexa-ai` developer CLI:
```bash
# Authenticate with Amazon Developer account
alexa-ai configure

# Deploy the add-on manifest to Alexa+ developer environment
alexa-ai deploy
```

### 5. Simulator Verification
Once deployed:
1. Open the **Alexa+ Developer Web Simulator** in the Amazon Developer Console.
2. Select your development add-on (`EKARA`).
3. Speak or type:
   - *"What do I need to do today?"*
   - *"Is anyone at my front door?"*
   - *"Tell my daughter I need help."*
4. Verify that the MCP server receives the `tools/call` requests and returns the structured responses.
