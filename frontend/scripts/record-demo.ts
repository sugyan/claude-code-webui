#!/usr/bin/env node

import { chromium } from "playwright";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  unlinkSync,
  statSync,
} from "fs";
import { join } from "path";
import {
  DEMO_SCENARIOS,
  type DemoScenario,
  type Theme,
  type RecordingOptions,
} from "./demo-constants";
import { STORAGE_KEYS, setStorageItem } from "../src/utils/storage";

/**
 * Demo recording script using Playwright's native video recording
 * Creates context dynamically to control recording timing
 */

function createOutputDir(): string {
  const outputDir = join(process.cwd(), "demo-recordings");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }
  return outputDir;
}

function createVideoFilename(scenario: DemoScenario, theme: Theme): string {
  const themeLabel = theme !== "light" ? `-${theme}` : "";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${scenario}${themeLabel}-${timestamp}.webm`;
}

async function recordDemoVideo(options: RecordingOptions): Promise<void> {
  const { scenario, theme } = options;
  const themeLabel = theme !== "light" ? ` (${theme})` : "";
  console.log(`🎬 Recording demo scenario: ${scenario}${themeLabel}`);

  const startTime = Date.now();
  const logTiming = (message: string) => {
    const elapsed = Date.now() - startTime;
    console.log(`[${elapsed.toString().padStart(5)}ms] ${message}`);
  };

  const browser = await chromium.launch({
    headless: !!process.env.CI, // Use headless mode in CI environment
    args: ["--disable-web-security", "--disable-features=VizDisplayCompositor"],
  });

  // Setup phase - no recording context
  const setupContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  let page = await setupContext.newPage();

  try {
    // Setup phase (not recorded)
    logTiming("📱 Setting up demo page...");

    // Pre-configure theme to avoid flashing
    if (theme === "dark") {
      await page.addInitScript(() => {
        setStorageItem(STORAGE_KEYS.THEME, "dark");
        document.documentElement.classList.add("dark");
      });
    }

    // Navigate to demo page
    const actualTheme = theme === "both" ? "light" : theme;
    const url = `http://localhost:3000/demo?scenario=${scenario}&theme=${actualTheme}`;

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    logTiming("🌐 Navigation completed");

    // Wait for demo page to be ready
    await page.waitForSelector('[data-demo-active="true"]', { timeout: 10000 });
    await page.waitForSelector("h1");
    logTiming(`📝 Demo page loaded for scenario: ${scenario}${themeLabel}`);

    // Verify theme is applied correctly
    if (actualTheme === "dark") {
      logTiming("⏳ Verifying dark theme...");
      await page.waitForFunction(
        () => document.documentElement.classList.contains("dark"),
        { timeout: 5000 },
      );
      logTiming("✅ Dark theme applied");
    }

    // Wait for demo to be ready to start (when demo step appears)
    await page.waitForSelector("[data-demo-step]", { timeout: 10000 });
    logTiming("🎯 Demo is ready to start");

    // Additional stabilization wait
    await page.waitForTimeout(2000);
    logTiming("✅ Stabilization completed");

    // Close setup context and create recording context
    logTiming("🔄 Switching to recording context...");
    await setupContext.close();

    // Create recording context with video enabled
    const outputDir = createOutputDir();
    const videoFilename = createVideoFilename(scenario, actualTheme);

    const recordingContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: outputDir,
        size: { width: 1280, height: 720 },
      },
    });

    page = await recordingContext.newPage();

    logTiming("🔴 Recording started");

    // Re-setup in recording context
    if (theme === "dark") {
      await page.addInitScript(() => {
        setStorageItem(STORAGE_KEYS.THEME, "dark");
        document.documentElement.classList.add("dark");
      });
    }

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for demo to be ready again
    await page.waitForSelector('[data-demo-active="true"]', { timeout: 10000 });
    await page.waitForSelector("[data-demo-step]", { timeout: 10000 });
    logTiming("🎯 Recording demo ready");

    // Wait for demo completion
    logTiming("⏳ Waiting for demo to complete...");
    try {
      await page.waitForSelector('[data-demo-completed="true"]', {
        timeout: 120000, // 2 minutes timeout
      });
      logTiming("✅ Demo completed detected");

      // Wait 1 second for viewers to read the final message
      await page.waitForTimeout(1000);
      logTiming("✅ Buffer time completed");
    } catch (error) {
      logTiming("❌ Demo did not complete within timeout");
      throw error;
    }

    // Close recording context to save video
    logTiming("⏹️ Stopping video recording...");
    await recordingContext.close();
    logTiming("💾 Video saved to disk");

    // Find and rename the generated video file (find the newest one)
    const videoFiles = readdirSync(outputDir)
      .filter((f) => f.endsWith(".webm"))
      .map((f) => ({
        name: f,
        path: join(outputDir, f),
        stat: statSync(join(outputDir, f)),
      }))
      .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime()); // Sort by modification time, newest first

    if (videoFiles.length > 0) {
      const newestVideo = videoFiles[0];
      const finalVideoPath = join(outputDir, videoFilename);

      if (newestVideo.path !== finalVideoPath) {
        copyFileSync(newestVideo.path, finalVideoPath);
        // Remove the original file with generated name
        try {
          unlinkSync(newestVideo.path);
        } catch {
          // Ignore deletion errors
        }
      }
      logTiming(`📹 Video saved: ${videoFilename}`);
    }

    logTiming(`✅ Successfully recorded ${scenario} demo${themeLabel}`);
  } catch (error) {
    logTiming(`❌ Failed to record ${scenario} demo${themeLabel}: ${error}`);
    throw error;
  } finally {
    await browser.close();
    logTiming("🔚 Browser closed");
  }
}

function parseArguments(): RecordingOptions {
  const args = process.argv.slice(2);
  let scenario: DemoScenario = "codeGeneration";
  let theme: Theme = "light";

  if (args[0] && DEMO_SCENARIOS.includes(args[0] as DemoScenario)) {
    scenario = args[0] as DemoScenario;
  }

  const themeArg = args.find((arg) => arg.startsWith("--theme="));
  if (themeArg) {
    const themeValue = themeArg.split("=")[1] as Theme;
    if (["light", "dark", "both"].includes(themeValue)) {
      theme = themeValue;
    }
  }

  return { scenario, theme };
}

async function checkDependencies(): Promise<void> {
  try {
    const response = await fetch("http://localhost:3000");
    if (!response.ok) {
      throw new Error("Development server not responding");
    }
  } catch {
    console.error(
      "❌ Development server is not running. Please start it first:",
    );
    console.error("   npm run dev");
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArguments();

  console.log("🎥 Claude Code Web UI Demo Recorder");
  console.log("=====================================");

  await checkDependencies();

  try {
    const firstArg = args[0];

    if (firstArg === "all") {
      const themeLabel = options.theme !== "light" ? ` (${options.theme})` : "";
      console.log(
        `📝 Recording all ${DEMO_SCENARIOS.length} demo scenarios${themeLabel}...`,
      );

      if (options.theme === "both") {
        for (const scenario of DEMO_SCENARIOS) {
          await recordDemoVideo({ scenario, theme: "light" });
          await recordDemoVideo({ scenario, theme: "dark" });
        }
      } else {
        for (const scenario of DEMO_SCENARIOS) {
          await recordDemoVideo({ scenario, theme: options.theme });
        }
      }
    } else {
      if (options.theme === "both") {
        await recordDemoVideo({ scenario: options.scenario, theme: "light" });
        await recordDemoVideo({ scenario: options.scenario, theme: "dark" });
      } else {
        await recordDemoVideo(options);
      }
    }

    console.log("🎉 Demo recording completed successfully!");
    console.log(`📹 Videos saved to: ${createOutputDir()}`);
  } catch (error) {
    console.error(
      "❌ Demo recording failed:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/record-demo.ts")
) {
  main().catch(console.error);
}

export { recordDemoVideo };
