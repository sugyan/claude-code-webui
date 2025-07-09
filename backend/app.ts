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

export interface AppConfig {
  debugMode: boolean;
  distPath: string;
}

export async function createApp(
  runtime: Runtime,
  config: AppConfig,
): Promise<Hono<ConfigContext>> {
  // Runtime-specific imports
  // deno-lint-ignore no-explicit-any
  let serveStatic: any;
  if (
    typeof globalThis.process !== "undefined" &&
    globalThis.process.versions?.node
  ) {
    // Node.js environment
    const { serveStatic: nodeServeStatic } = await import(
      "@hono/node-server/serve-static"
    );
    serveStatic = nodeServeStatic;
  } else {
    // Deno environment
    const { serveStatic: denoServeStatic } = await import("hono/deno");
    serveStatic = denoServeStatic;
  }
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
    createConfigMiddleware({ debugMode: config.debugMode, runtime }),
  );

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
  // Serve static assets (CSS, JS, images, etc.)
  app.use("/assets/*", serveStatic({ root: config.distPath }));
  // Serve root level files (favicon, etc.)
  app.use("/*", serveStatic({ root: config.distPath }));

  // SPA fallback - serve index.html for all unmatched routes (except API routes)
  app.get("*", async (c) => {
    const path = c.req.path;

    // Skip API routes
    if (path.startsWith("/api/")) {
      return c.text("Not found", 404);
    }

    try {
      const indexPath = `${config.distPath}/index.html`;
      const indexFile = await runtime.readBinaryFile(indexPath);
      return c.html(new TextDecoder().decode(indexFile));
    } catch (error) {
      console.error("Error serving index.html:", error);
      return c.text("Internal server error", 500);
    }
  });

  return app;
}
