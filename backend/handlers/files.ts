/**
 * File operations handler for Claude Code Web UI
 * 
 * Provides endpoints for reading and writing files securely within project directories
 */

import type { Context } from "hono";
import type { ConfigContext } from "../middleware/config.ts";
import { logger } from "../utils/logger.ts";
import { readTextFile, writeTextFile, exists } from "../utils/fs.ts";
import { join, normalize, resolve } from "path";

interface FileReadRequest {
  filePath: string;
}

interface FileWriteRequest {
  filePath: string;
  content: string;
}

interface FileResponse {
  success: boolean;
  content?: string;
  message?: string;
  error?: string;
}

/**
 * Validate that the file path is safe and within allowed directories
 */
function validateFilePath(filePath: string): { isValid: boolean; normalizedPath: string; error?: string } {
  try {
    // Normalize the path to prevent directory traversal
    const normalizedPath = normalize(resolve(filePath));
    
    // Check for directory traversal attempts
    if (normalizedPath.includes("..") || filePath.includes("..")) {
      return {
        isValid: false,
        normalizedPath,
        error: "Directory traversal not allowed"
      };
    }

    // Only allow absolute paths for security
    if (!normalizedPath.startsWith("/")) {
      return {
        isValid: false,
        normalizedPath,
        error: "Only absolute paths are allowed"
      };
    }

    return {
      isValid: true,
      normalizedPath
    };
  } catch (error) {
    return {
      isValid: false,
      normalizedPath: filePath,
      error: `Invalid file path: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Handle file read requests
 */
export async function handleFileReadRequest(c: Context<ConfigContext>): Promise<Response> {
  try {
    logger.api.debug("File read request received");
    
    const body = await c.req.json() as FileReadRequest;
    const { filePath } = body;

    if (!filePath) {
      logger.api.warn("File read request missing filePath");
      return c.json({
        success: false,
        error: "File path is required"
      } as FileResponse, 400);
    }

    // Validate file path
    const validation = validateFilePath(filePath);
    if (!validation.isValid) {
      logger.api.warn("Invalid file path in read request: {filePath}, error: {error}", { 
        filePath, 
        error: validation.error 
      });
      return c.json({
        success: false,
        error: validation.error
      } as FileResponse, 400);
    }

    const normalizedPath = validation.normalizedPath;
    logger.api.debug("Reading file: {path}", { path: normalizedPath });

    // Check if file exists
    const fileExists = await exists(normalizedPath);
    if (!fileExists) {
      logger.api.debug("File not found: {path}", { path: normalizedPath });
      return c.json({
        success: false,
        error: "File not found"
      } as FileResponse, 404);
    }

    // Read file content
    const content = await readTextFile(normalizedPath);
    
    logger.api.info("File read successfully: {path}", { path: normalizedPath });
    return c.json({
      success: true,
      content,
      message: "File read successfully"
    } as FileResponse);

  } catch (error) {
    logger.api.error("Error reading file: {error}", { error });
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    } as FileResponse, 500);
  }
}

/**
 * Handle file write requests
 */
export async function handleFileWriteRequest(c: Context<ConfigContext>): Promise<Response> {
  try {
    logger.api.debug("File write request received");
    
    const body = await c.req.json() as FileWriteRequest;
    const { filePath, content } = body;

    if (!filePath) {
      logger.api.warn("File write request missing filePath");
      return c.json({
        success: false,
        error: "File path is required"
      } as FileResponse, 400);
    }

    if (content === undefined || content === null) {
      logger.api.warn("File write request missing content");
      return c.json({
        success: false,
        error: "File content is required"
      } as FileResponse, 400);
    }

    // Validate file path
    const validation = validateFilePath(filePath);
    if (!validation.isValid) {
      logger.api.warn("Invalid file path in write request: {filePath}, error: {error}", { 
        filePath, 
        error: validation.error 
      });
      return c.json({
        success: false,
        error: validation.error
      } as FileResponse, 400);
    }

    const normalizedPath = validation.normalizedPath;
    logger.api.debug("Writing file: {path}, content length: {length}", { 
      path: normalizedPath, 
      length: content.length 
    });

    // Write file content
    await writeTextFile(normalizedPath, content);
    
    logger.api.info("File written successfully: {path}", { path: normalizedPath });
    return c.json({
      success: true,
      message: "File written successfully"
    } as FileResponse);

  } catch (error) {
    logger.api.error("Error writing file: {error}", { error });
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    } as FileResponse, 500);
  }
}