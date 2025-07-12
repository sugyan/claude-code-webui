#!/usr/bin/env node

/**
 * Copy frontend build files to dist/static
 *
 * This script copies the built frontend files from ../frontend/dist
 * to dist/static so they can be served by the bundled CLI application.
 */

import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const frontendDistPath = join(__dirname, "../../frontend/dist");
const backendStaticPath = join(__dirname, "../dist/static");

// Check if frontend build exists
if (!existsSync(frontendDistPath)) {
  console.error("❌ Frontend build not found at:", frontendDistPath);
  console.error("   Please run 'cd ../frontend && npm run build' first");
  process.exit(1);
}

// Ensure target directory exists
mkdirSync(dirname(backendStaticPath), { recursive: true });

// Copy frontend files
try {
  cpSync(frontendDistPath, backendStaticPath, {
    recursive: true,
    force: true,
  });
  console.log("✅ Frontend files copied to dist/static");
} catch (error) {
  console.error("❌ Failed to copy frontend files:", error.message);
  process.exit(1);
}
