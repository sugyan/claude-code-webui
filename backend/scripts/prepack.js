#!/usr/bin/env node

/**
 * Prepack script - Copy required files for npm package
 *
 * This script copies README.md and LICENSE from the project root
 * to the backend directory for npm package distribution.
 * Replaces the Unix-specific `cp` command for Windows compatibility.
 */

import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const projectRoot = join(__dirname, "../..");
const backendDir = join(__dirname, "..");
const readmePath = join(projectRoot, "README.md");
const licensePath = join(projectRoot, "LICENSE");
const targetReadmePath = join(backendDir, "README.md");
const targetLicensePath = join(backendDir, "LICENSE");


// Copy README.md
if (existsSync(readmePath)) {
  try {
    copyFileSync(readmePath, targetReadmePath);
    console.log("✅ Copied README.md");
  } catch (error) {
    console.error("❌ Failed to copy README.md:", error.message);
    process.exit(1);
  }
} else {
  console.error("❌ README.md not found at:", readmePath);
  process.exit(1);
}

// Copy LICENSE
if (existsSync(licensePath)) {
  try {
    copyFileSync(licensePath, targetLicensePath);
    console.log("✅ Copied LICENSE");
  } catch (error) {
    console.error("❌ Failed to copy LICENSE:", error.message);
    process.exit(1);
  }
} else {
  console.error("❌ LICENSE not found at:", licensePath);
  process.exit(1);
}


console.log("✅ Prepack completed successfully");