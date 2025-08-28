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
import { handleLoginRequest, handleVerifyRequest, handleLogoutRequest, requireAuth } from "./handlers/auth.ts";
import { handleValidatePathRequest, handleCreateProjectRequest } from "./handlers/createProject.ts";
import { handlePrivilegeCheckRequest, handleListUsersRequest, handleUserSwitchRequest } from "./handlers/userSwitch.ts";
import { handleUserManagementRequest } from "./handlers/userManagement.ts";
import { handleFileReadRequest, handleFileWriteRequest } from "./handlers/files.ts";
import { 
  rateLimitMiddleware,
  loginRateLimitMiddleware,
  securityHeadersMiddleware,
  requestSizeLimitMiddleware,
  inputValidationMiddleware,
} from "./middleware/security.ts";
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

  // CORS middleware - secure configuration
  app.use(
    "*",
    cors({
      origin: (origin) => {
        // Allow local development and specific domains
        const allowedOrigins = [
          "http://localhost:3000",
          "http://localhost:3001", 
          "http://localhost:3002",
          "https://coding.dannyac.com",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
          "http://127.0.0.1:3002"
        ];
        
        // Allow requests with no origin (e.g., mobile apps, curl, Postman)
        if (!origin) return true;
        
        return allowedOrigins.includes(origin);
      },
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

  // Security middleware - apply to all routes
  app.use("*", securityHeadersMiddleware());
  app.use("*", rateLimitMiddleware());
  app.use("*", inputValidationMiddleware());
  app.use("*", requestSizeLimitMiddleware());

  // Configuration middleware - makes app settings available to all handlers
  app.use(
    "*",
    createConfigMiddleware({
      debugMode: config.debugMode,
      runtime,
      cliPath: config.cliPath,
    }),
  );

  // Authentication routes with additional login rate limiting
  app.post("/api/auth/login", loginRateLimitMiddleware(), (c) => handleLoginRequest(c));
  app.get("/api/auth/verify", (c) => handleVerifyRequest(c));
  app.post("/api/auth/logout", (c) => handleLogoutRequest(c));

  // Protected API routes
  app.get("/api/projects", requireAuth(), (c) => handleProjectsRequest(c));
  app.post("/api/projects/validate-path", requireAuth(), (c) => handleValidatePathRequest(c));
  app.post("/api/projects/create", requireAuth(), (c) => handleCreateProjectRequest(c));

  // User switching routes (require authentication)
  app.get("/api/user/privileges", requireAuth(), (c) => handlePrivilegeCheckRequest(c));
  app.get("/api/user/switchable-users", requireAuth(), (c) => handleListUsersRequest(c));
  app.post("/api/user/switch", requireAuth(), (c) => handleUserSwitchRequest(c));

  // User management routes (require root privileges)
  app.post("/api/user/manage", requireAuth(), (c) => handleUserManagementRequest(c));

  // File operations routes (require authentication)
  app.post("/api/files/read", requireAuth(), (c) => handleFileReadRequest(c));
  app.post("/api/files/write", requireAuth(), (c) => handleFileWriteRequest(c));

  // History and conversation routes (require authentication)
  app.get("/api/projects/:encodedProjectName/histories", requireAuth(), (c) =>
    handleHistoriesRequest(c),
  );

  app.get("/api/projects/:encodedProjectName/histories/:sessionId", requireAuth(), (c) =>
    handleConversationRequest(c),
  );

  // Chat and abort routes (require authentication)
  app.post("/api/abort/:requestId", requireAuth(), (c) =>
    handleAbortRequest(c, requestAbortControllers),
  );

  app.post("/api/chat", requireAuth(), (c) => handleChatRequest(c, requestAbortControllers));

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
