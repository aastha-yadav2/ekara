export const logger = {
  info: (msg: string, ...meta: any[]) => console.log(`[INFO] [EKARA-MCP] ${msg}`, ...meta),
  error: (msg: string, ...meta: any[]) => console.error(`[ERROR] [EKARA-MCP] ${msg}`, ...meta),
  warn: (msg: string, ...meta: any[]) => console.warn(`[WARN] [EKARA-MCP] ${msg}`, ...meta),
  debug: (msg: string, ...meta: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEBUG] [EKARA-MCP] ${msg}`, ...meta);
    }
  }
};
