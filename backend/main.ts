import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/deno";
import { parseCliArgs } from "./args.ts";
import {
  type ConfigContext,
  createConfigMiddleware,
} from "./middleware/config.ts";
import { handleProjectsRequest } from "./handlers/projects.ts";
import { handleHistoriesRequest } from "./handlers/histories.ts";
import { handleConversationRequest } from "./handlers/conversations.ts";
import { handleChatRequest } from "./handlers/chat.ts";
import { handleAbortRequest } from "./handlers/abort.ts";

const args = await parseCliArgs();

const PORT = args.port;
const HOST = args.host;

// Debug mode enabled via CLI flag or environment variable
const DEBUG_MODE = args.debug;

const app = new Hono<ConfigContext>();

// Store AbortControllers for each request (shared with chat handler)
const requestAbortControllers = new Map<string, AbortController>();

// CORS middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

// Configuration middleware - makes app settings available to all handlers
app.use("*", createConfigMiddleware({ debugMode: DEBUG_MODE }));

// API routes
app.get("/api/projects", (c) => handleProjectsRequest(c));

app.get(
  "/api/projects/:encodedProjectName/histories",
  (c) => handleHistoriesRequest(c),
);

app.get(
  "/api/projects/:encodedProjectName/histories/:sessionId",
  (c) => handleConversationRequest(c),
);

app.post(
  "/api/abort/:requestId",
  (c) => handleAbortRequest(c, requestAbortControllers),
);

app.post(
  "/api/chat",
  (c) => handleChatRequest(c, requestAbortControllers),
);

// Static file serving with SPA fallback
// Resolve dist directory path relative to this module
const distPath = new URL("./dist", import.meta.url).pathname;
// Serve static assets (CSS, JS, images, etc.)
app.use("/assets/*", serveStatic({ root: distPath }));
// Serve root level files (favicon, etc.)
app.use("/*", serveStatic({ root: distPath }));

// SPA fallback - serve index.html for all unmatched routes (except API routes)
app.get("*", async (c) => {
  const path = c.req.path;

  // Skip API routes
  if (path.startsWith("/api/")) {
    return c.text("Not found", 404);
  }

  try {
    const indexPath = new URL("./dist/index.html", import.meta.url).pathname;
    const indexFile = await Deno.readFile(indexPath);
    return c.html(new TextDecoder().decode(indexFile));
  } catch (error) {
    console.error("Error serving index.html:", error);
    return c.text("Internal server error", 500);
  }
});

// Server startup
console.log(`🚀 Server starting on ${HOST}:${PORT}`);

// Validate Claude CLI availability
try {
  const claudeCheck = await new Deno.Command("claude", {
    args: ["--version"],
    stdout: "piped",
    stderr: "piped",
  }).output();

  if (claudeCheck.success) {
    const version = new TextDecoder().decode(claudeCheck.stdout).trim();
    console.log(`✅ Claude CLI found: ${version}`);
  } else {
    console.warn("⚠️  Claude CLI check failed - some features may not work");
  }
} catch (_error) {
  console.warn("⚠️  Claude CLI not found - please install claude-code");
  console.warn(
    "   Visit: https://claude.ai/code for installation instructions",
  );
}

if (DEBUG_MODE) {
  console.log("🐛 Debug mode enabled");
}

Deno.serve({ port: PORT, hostname: HOST }, app.fetch);
