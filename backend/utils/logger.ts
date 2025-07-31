/**
 * Unified logging system using LogTape
 *
 * Provides centralized logging configuration with debugMode support.
 * Works across both Deno and Node.js environments with unified import syntax.
 */

import {
  configure,
  getConsoleSink,
  getLogger,
  LogLevel,
  getAnsiColorFormatter,
} from "@logtape/logtape";

let isConfigured = false;

/**
 * Initialize the logging system
 * @param debugMode - Whether to enable debug level logging
 */
export async function setupLogger(debugMode: boolean): Promise<void> {
  if (isConfigured) {
    return; // Avoid double configuration
  }

  const lowestLevel: LogLevel = debugMode ? "debug" : "info";

  await configure({
    sinks: {
      console: getConsoleSink({
        formatter: getAnsiColorFormatter({
          levelColors: {
            trace: null,
            debug: "blue",
            info: "green",
            warning: "yellow",
            error: "red",
            fatal: "magenta",
          },
          levelStyle: "bold",
          level: "FULL",
        }),
      }),
    },
    loggers: [
      {
        category: [],
        lowestLevel,
        sinks: ["console"],
      },
      // Suppress LogTape meta logger info messages
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["console"],
      },
    ],
  });

  isConfigured = true;
}

/**
 * Centralized loggers for different categories
 */
export const logger = {
  // CLI and startup logging
  cli: getLogger(["cli"]),

  // Claude CLI validation and detection
  validation: getLogger(["validation"]),

  // Chat handling and streaming
  chat: getLogger(["chat"]),

  // History and conversation management
  history: getLogger(["history"]),

  // API handlers
  api: getLogger(["api"]),

  // General application logging
  app: getLogger(["app"]),
};

/**
 * Check if logging system is configured
 */
export function isLoggerConfigured(): boolean {
  return isConfigured;
}
