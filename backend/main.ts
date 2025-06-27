import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/deno";
import { AbortError, query } from "@anthropic-ai/claude-code";
import type {
  ChatRequest,
  HistoryListResponse,
  ProjectInfo,
  ProjectsResponse,
  StreamResponse,
} from "../shared/types.ts";
import { parseCliArgs } from "./args.ts";
import {
  getEncodedProjectName,
  validateEncodedProjectName,
} from "./history/pathUtils.ts";
import { parseAllHistoryFiles } from "./history/parser.ts";
import { groupConversations } from "./history/grouping.ts";

const args = await parseCliArgs();

const PORT = args.port;
const HOST = args.host;

// Debug mode enabled via CLI flag or environment variable
const DEBUG_MODE = args.debug;

const app = new Hono();

// Store AbortControllers for each request
const requestAbortControllers = new Map<string, AbortController>();

async function* executeClaudeCommand(
  message: string,
  requestId: string,
  sessionId?: string,
  allowedTools?: string[],
  workingDirectory?: string,
): AsyncGenerator<StreamResponse> {
  let abortController: AbortController;

  try {
    // Process commands that start with '/'
    let processedMessage = message;
    if (message.startsWith("/")) {
      // Remove the '/' and send just the command
      processedMessage = message.substring(1);
    }

    // Create and store AbortController for this request
    abortController = new AbortController();
    requestAbortControllers.set(requestId, abortController);

    // For compiled binaries, use system claude command to avoid bundled cli.js issues
    let claudePath: string;
    try {
      const whichResult = await new Deno.Command("which", {
        args: ["claude"],
        stdout: "piped",
      }).output();
      claudePath = new TextDecoder().decode(whichResult.stdout).trim();
    } catch {
      claudePath = "claude"; // fallback
    }

    for await (
      const sdkMessage of query({
        prompt: processedMessage,
        options: {
          abortController,
          pathToClaudeCodeExecutable: claudePath,
          ...(sessionId ? { resume: sessionId } : {}),
          ...(allowedTools ? { allowedTools } : {}),
          ...(workingDirectory ? { cwd: workingDirectory } : {}),
        },
      })
    ) {
      // Debug logging of raw SDK messages
      if (DEBUG_MODE) {
        console.debug("[DEBUG] Claude SDK Message:");
        console.debug(JSON.stringify(sdkMessage, null, 2));
        console.debug("---");
      }

      yield {
        type: "claude_json",
        data: sdkMessage,
      };
    }

    yield { type: "done" };
  } catch (error) {
    // Check if error is due to abort
    if (error instanceof AbortError) {
      yield { type: "aborted" };
    } else {
      yield {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } finally {
    // Clean up AbortController from map
    if (requestAbortControllers.has(requestId)) {
      requestAbortControllers.delete(requestId);
    }
  }
}

// CORS middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

// API routes
app.get("/api/projects", async (c) => {
  try {
    const homeDir = Deno.env.get("HOME");
    if (!homeDir) {
      return c.json({ error: "HOME environment variable not found" }, 500);
    }

    const claudeConfigPath = `${homeDir}/.claude.json`;

    try {
      const configContent = await Deno.readTextFile(claudeConfigPath);
      const config = JSON.parse(configContent);

      if (config.projects && typeof config.projects === "object") {
        const projectPaths = Object.keys(config.projects);

        // Get encoded names for each project
        const projects: ProjectInfo[] = [];
        for (const path of projectPaths) {
          const encodedName = await getEncodedProjectName(path);
          projects.push({
            path,
            encodedName: encodedName || "", // Use empty string if no encoded name found
          });
        }

        const response: ProjectsResponse = { projects };
        return c.json(response);
      } else {
        const response: ProjectsResponse = { projects: [] };
        return c.json(response);
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        const response: ProjectsResponse = { projects: [] };
        return c.json(response);
      }
      throw error;
    }
  } catch (error) {
    console.error("Error reading projects:", error);
    return c.json({ error: "Failed to read projects" }, 500);
  }
});

// Conversation history endpoint
app.get("/api/projects/:encodedProjectName/histories", async (c) => {
  try {
    const encodedProjectName = c.req.param("encodedProjectName");

    if (!encodedProjectName) {
      return c.json({ error: "Encoded project name is required" }, 400);
    }

    if (!validateEncodedProjectName(encodedProjectName)) {
      return c.json({ error: "Invalid encoded project name" }, 400);
    }

    if (DEBUG_MODE) {
      console.debug(
        `[DEBUG] Fetching histories for encoded project: ${encodedProjectName}`,
      );
    }

    // Get home directory
    const homeDir = Deno.env.get("HOME");
    if (!homeDir) {
      return c.json({ error: "Server configuration error" }, 500);
    }

    // Build history directory path directly from encoded name
    const historyDir = `${homeDir}/.claude/projects/${encodedProjectName}`;

    if (DEBUG_MODE) {
      console.debug(`[DEBUG] History directory: ${historyDir}`);
    }

    // Check if the directory exists
    try {
      const dirInfo = await Deno.stat(historyDir);
      if (!dirInfo.isDirectory) {
        return c.json({ error: "Project not found" }, 404);
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return c.json({ error: "Project not found" }, 404);
      }
      throw error;
    }

    const conversationFiles = await parseAllHistoryFiles(historyDir);

    if (DEBUG_MODE) {
      console.debug(
        `[DEBUG] Found ${conversationFiles.length} conversation files`,
      );
    }

    // Group conversations and remove duplicates
    const conversations = groupConversations(conversationFiles);

    if (DEBUG_MODE) {
      console.debug(
        `[DEBUG] After grouping: ${conversations.length} unique conversations`,
      );
    }

    const response: HistoryListResponse = {
      conversations,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching conversation histories:", error);

    return c.json({
      error: "Failed to fetch conversation histories",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

app.post("/api/abort/:requestId", (c) => {
  const requestId = c.req.param("requestId");

  if (!requestId) {
    return c.json({ error: "Request ID is required" }, 400);
  }

  if (DEBUG_MODE) {
    console.debug(`[DEBUG] Abort attempt for request: ${requestId}`);
    console.debug(
      `[DEBUG] Active requests: ${Array.from(requestAbortControllers.keys())}`,
    );
  }

  const abortController = requestAbortControllers.get(requestId);
  if (abortController) {
    abortController.abort();
    requestAbortControllers.delete(requestId);

    if (DEBUG_MODE) {
      console.debug(`[DEBUG] Aborted request: ${requestId}`);
    }

    return c.json({ success: true, message: "Request aborted" });
  } else {
    return c.json({ error: "Request not found or already completed" }, 404);
  }
});

app.post("/api/chat", async (c) => {
  const chatRequest: ChatRequest = await c.req.json();

  if (DEBUG_MODE) {
    console.debug(
      "[DEBUG] Received chat request:",
      JSON.stringify(chatRequest, null, 2),
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (
          const chunk of executeClaudeCommand(
            chatRequest.message,
            chatRequest.requestId,
            chatRequest.sessionId,
            chatRequest.allowedTools,
            chatRequest.workingDirectory,
          )
        ) {
          const data = JSON.stringify(chunk) + "\n";
          controller.enqueue(new TextEncoder().encode(data));
        }
        controller.close();
      } catch (error) {
        const errorResponse: StreamResponse = {
          type: "error",
          error: error instanceof Error ? error.message : String(error),
        };
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(errorResponse) + "\n"),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// Static file serving with SPA fallback
// Serve static assets (CSS, JS, images, etc.)
app.use("/assets/*", serveStatic({ root: import.meta.dirname + "/dist" }));

// Serve root-level static files (favicon, etc.) with SPA fallback
app.use("/*", serveStatic({ root: import.meta.dirname + "/dist" }));

// SPA fallback for all unmatched routes (but not API routes)
app.get("*", async (c) => {
  // Skip API routes
  if (c.req.path.startsWith("/api/")) {
    return c.notFound();
  }

  // Serve index.html for client-side routing
  try {
    const indexPath = import.meta.dirname + "/dist/index.html";
    const indexContent = await Deno.readTextFile(indexPath);
    return c.html(indexContent);
  } catch (error) {
    console.error("Failed to serve index.html:", error);
    return c.text("Application not found", 404);
  }
});

if (import.meta.main) {
  console.log(`🚀 Server starting on http://${HOST}:${PORT}`);
  Deno.serve({ port: PORT, hostname: HOST }, app.fetch);
}
