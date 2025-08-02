/**
 * Runtime-agnostic Hono application
 *
 * This module creates the Hono application with all routes and middleware,
 * but doesn't include runtime-specific code like CLI parsing or server startup.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Runtime } from "./runtime/types.ts";
import {
  type ConfigContext,
  createConfigMiddleware,
} from "./middleware/config.ts";
import { handleProjectsRequest } from "./handlers/projects.ts";
import { handleHistoriesRequest } from "./handlers/histories.ts";
import { handleConversationRequest } from "./handlers/conversations.ts";
import { handleChatRequest } from "./handlers/chat.ts";
import { handleAbortRequest } from "./handlers/abort.ts";
import { logger } from "./utils/logger.ts";
import { readBinaryFile } from "./utils/fs.ts";

export interface AppConfig {
  debugMode: boolean;
  staticPath: string;
  cliPath: string; // Actual CLI script path detected by validateClaudeCli
}

export function createApp(
  runtime: Runtime,
  config: AppConfig,
): Hono<ConfigContext> {
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
  app.use(
    "*",
    createConfigMiddleware({
      debugMode: config.debugMode,
      runtime,
      cliPath: config.cliPath,
    }),
  );

  // API routes
  app.get("/api/projects", (c) => handleProjectsRequest(c));

  app.get("/api/projects/:encodedProjectName/histories", (c) =>
    handleHistoriesRequest(c),
  );

  app.get("/api/projects/:encodedProjectName/histories/:sessionId", (c) =>
    handleConversationRequest(c),
  );

  app.post("/api/abort/:requestId", (c) =>
    handleAbortRequest(c, requestAbortControllers),
  );

  app.post("/api/chat", (c) => handleChatRequest(c, requestAbortControllers));

  // Static file serving with SPA fallback
  // Serve static assets (CSS, JS, images, etc.)
  const serveStatic = runtime.createStaticFileMiddleware({
    root: config.staticPath,
  });
  app.use("/assets/*", serveStatic);

  // SPA fallback - serve index.html for all unmatched routes (except API routes)
  app.get("*", async (c) => {
    const path = c.req.path;

    // Skip API routes
    if (path.startsWith("/api/")) {
      return c.text("Not found", 404);
    }

    try {
      const indexPath = `${config.staticPath}/index.html`;
      const indexFile = await readBinaryFile(indexPath);
      return c.html(new TextDecoder().decode(indexFile));
    } catch (error) {
      logger.app.error("Error serving index.html: {error}", { error });
      return c.text("Internal server error", 500);
    }
  });

  return app;
}
