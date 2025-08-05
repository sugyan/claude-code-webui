#!/usr/bin/env node

import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { type DemoScenario, type Theme } from "./demo-constants";
import { STORAGE_KEYS, setStorageItem } from "../src/utils/storage";

/**
 * Screenshot capture script using Playwright
 * Captures screenshots at specific demo moments for README
 */

interface ScreenshotOptions {
  scenario: DemoScenario;
  theme: Theme;
  device: "desktop" | "mobile";
  waitForStep?: number; // Step number to wait for before capturing
}

interface ViewportSize {
  width: number;
  height: number;
}

const VIEWPORTS: Record<"desktop" | "mobile", ViewportSize> = {
  desktop: { width: 1400, height: 900 }, // More suitable for README display
  mobile: { width: 375, height: 667 }, // iPhone SE size (more common and less tall)
};

// Define the specific screenshot moments for each scenario
const SCREENSHOT_CONFIGS: Record<
  DemoScenario,
  { step: number; description: string }
> = {
  basic: { step: 3, description: "Chat conversation with input ready" },
  fileOperations: { step: 3, description: "Read permission dialog" },
  codeGeneration: { step: 4, description: "Write permission dialog with code" },
  debugging: { step: 2, description: "Debug analysis" },
};

function createOutputDir(): string {
  const outputDir = join(process.cwd(), "..", "docs", "images");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }
  return outputDir;
}

function createScreenshotFilename(
  scenario: DemoScenario,
  theme: Theme,
  device: "desktop" | "mobile",
): string {
  const themeLabel = theme !== "light" ? `-${theme}` : "";
  return `screenshot-${device}-${scenario}${themeLabel}.png`;
}

async function captureScreenshot(options: ScreenshotOptions): Promise<void> {
  const { scenario, theme, device, waitForStep } = options;
  const viewport = VIEWPORTS[device];
  const themeLabel = theme !== "light" ? ` (${theme})` : "";

  console.log(`📸 Capturing ${device} screenshot: ${scenario}${themeLabel}`);

  const startTime = Date.now();
  const logTiming = (message: string) => {
    const elapsed = Date.now() - startTime;
    console.log(`[${elapsed.toString().padStart(5)}ms] ${message}`);
  };

  const browser = await chromium.launch({
    headless: !!process.env.CI,
    args: ["--disable-web-security", "--disable-features=VizDisplayCompositor"],
  });

  const context = await browser.newContext({
    viewport,
  });

  const page = await context.newPage();

  try {
    // Setup phase
    logTiming(`📱 Setting up demo page for ${device}...`);

    // Pre-configure theme to avoid flashing
    if (theme === "dark") {
      await page.addInitScript(() => {
        setStorageItem(STORAGE_KEYS.THEME, "dark");
        document.documentElement.classList.add("dark");
      });
    }

    // Navigate to demo page with pauseAt parameter to stop at desired step
    const targetStep = waitForStep || SCREENSHOT_CONFIGS[scenario].step;
    const url = `http://localhost:3000/demo?scenario=${scenario}&theme=${theme}&pauseAt=${targetStep}`;

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
    if (theme === "dark") {
      logTiming("⏳ Verifying dark theme...");
      await page.waitForFunction(
        () => document.documentElement.classList.contains("dark"),
        { timeout: 5000 },
      );
      logTiming("✅ Dark theme applied");
    }

    // Wait for demo to reach the target step
    logTiming(`⏳ Waiting for demo to reach step ${targetStep}...`);

    // Wait for either the demo to be paused at our target step or completed
    await Promise.race([
      page.waitForFunction(
        (step) => {
          const demoElement = document.querySelector(
            '[data-demo-active="true"]',
          );
          if (!demoElement) return false;
          const currentStep = demoElement.getAttribute("data-demo-step");
          return currentStep && parseInt(currentStep) >= step;
        },
        targetStep,
        { timeout: 60000 },
      ),
      page.waitForSelector('[data-demo-completed="true"]', { timeout: 60000 }),
    ]);

    logTiming(`✅ Demo reached target state`);

    // Give a moment for UI to settle
    await page.waitForTimeout(1000);

    // Take screenshot
    const outputDir = createOutputDir();
    const filename = createScreenshotFilename(scenario, theme, device);
    const filepath = join(outputDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: false, // Just the viewport for mobile responsiveness demo
      type: "png",
    });

    logTiming(`📸 Screenshot saved: ${filename}`);
    console.log(
      `✅ Successfully captured ${device} screenshot for ${scenario}${themeLabel}`,
    );
  } catch (error) {
    console.error(`❌ Error capturing screenshot:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function captureAllScreenshots(): Promise<void> {
  const scenarios: DemoScenario[] = ["basic", "codeGeneration"];
  const themes: Theme[] = ["light", "dark"];
  const devices: ("desktop" | "mobile")[] = ["desktop", "mobile"];

  console.log("📸 Starting screenshot capture process...");

  for (const scenario of scenarios) {
    for (const theme of themes) {
      for (const device of devices) {
        try {
          await captureScreenshot({
            scenario,
            theme,
            device,
          });
          // Small delay between captures
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(
            `❌ Failed to capture ${device} ${scenario} ${theme}:`,
            error,
          );
        }
      }
    }
  }

  console.log("✅ Screenshot capture process completed!");
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Default: capture all screenshots
    await captureAllScreenshots();
    return;
  }

  const scenario = args[0] as DemoScenario;
  const theme = (args[1] as Theme) || "light";
  const device = (args[2] as "desktop" | "mobile") || "desktop";

  if (
    !["basic", "codeGeneration", "debugging", "fileOperations"].includes(
      scenario,
    )
  ) {
    console.error(
      "❌ Invalid scenario. Use: basic, codeGeneration, debugging, fileOperations",
    );
    process.exit(1);
  }

  await captureScreenshot({
    scenario,
    theme,
    device,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Screenshot capture failed:", error);
    process.exit(1);
  });
}
