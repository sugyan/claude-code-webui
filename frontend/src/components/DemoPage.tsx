import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { type Theme } from "../hooks/useTheme";
import { useChatState } from "../hooks/chat/useChatState";
import { usePermissions } from "../hooks/chat/usePermissions";
import { useDemoAutomation } from "../hooks/useDemoAutomation";
import { ThemeToggle } from "./chat/ThemeToggle";
import { ChatInput } from "./chat/ChatInput";
import { ChatMessages } from "./chat/ChatMessages";
import { DemoPermissionDialogWrapper } from "./DemoPermissionDialogWrapper";
import { DEMO_SCENARIOS } from "../utils/mockResponseGenerator";

export function DemoPage() {
  const location = useLocation();
  const isDemo = true;

  // Check for control parameter, scenario, and theme
  const searchParams = new URLSearchParams(location.search);
  const showControls = searchParams.get("control") === "true";
  const scenarioParam = searchParams.get(
    "scenario",
  ) as keyof typeof DEMO_SCENARIOS;
  const selectedScenario =
    scenarioParam && DEMO_SCENARIOS[scenarioParam] ? scenarioParam : "basic";

  // Get theme from URL or use system default
  const themeParam = searchParams.get("theme");
  const [theme, setTheme] = useState<Theme>(() => {
    if (themeParam === "dark" || themeParam === "light") {
      return themeParam;
    }
    // Get system theme without using useTheme hook
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") {
      return saved;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const toggleTheme = () => {
    // For demo, theme is controlled by URL parameter
    if (themeParam) return;
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Apply theme to DOM (similar to useTheme hook but with URL override)
  useEffect(() => {
    const root = window.document.documentElement;

    // For demo with URL theme, disable transitions temporarily
    if (themeParam) {
      const styleId = "demo-disable-transitions";
      let style = document.getElementById(styleId) as HTMLStyleElement;
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        style.textContent =
          "*, *::before, *::after { transition: none !important; animation: none !important; }";
        document.head.appendChild(style);
      }

      // Remove after a short delay
      setTimeout(() => {
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
          document.head.removeChild(existingStyle);
        }
      }, 100);
    }

    // Remove existing theme class
    root.classList.remove("dark");

    // Apply current theme
    if (theme === "dark") {
      root.classList.add("dark");
    }

    // Save to localStorage (unless overridden by URL)
    if (!themeParam) {
      localStorage.setItem("theme", theme);
    }

    console.log(`Demo theme applied: ${theme}`, {
      classList: root.className,
      themeParam,
      urlOverride: !!themeParam,
    });
  }, [theme, themeParam]);

  // Update theme when URL parameter changes
  useEffect(() => {
    if (themeParam === "dark" || themeParam === "light") {
      setTheme(themeParam);
    }
  }, [themeParam]);

  const {
    messages,
    input,
    isLoading,
    currentRequestId,
    addMessage,
    setInput: setChatInput,
    startRequest,
    resetRequestState,
    generateRequestId,
  } = useChatState();

  const {
    permissionDialog,
    closePermissionDialog,
    allowToolPermanent,
    showPermissionDialog,
  } = usePermissions();

  // Demo automation
  const {
    currentStep,
    isCompleted,
    currentInput,
    isTyping,
    startDemo,
    pauseDemo,
    resetDemo,
    resumeDemo,
    isPaused,
  } = useDemoAutomation({
    autoStart: true,
    typingSpeed: 25,
    scenarioKey: selectedScenario,
    onStepComplete: (step) => {
      console.log(`Demo step ${step} completed`);
    },
    onDemoComplete: () => {
      console.log("Demo completed");
      permissionDialogCountRef.current = 0; // Reset dialog count on demo completion
    },
    // Pass message handling functions from DemoPage
    addMessage,
    setInput: setChatInput,
    startRequest,
    resetRequestState,
    generateRequestId,
    showPermissionDialog,
  });

  // Demo state
  const demoWorkingDirectory = "/Users/demo/claude-code-webui";
  const [autoClickButton, setAutoClickButton] = useState<
    "allow" | "allowPermanent" | null
  >(null);
  const permissionDialogCountRef = useRef(0);
  const hasHandledDialogRef = useRef(false);

  // Auto-allow permissions for demo after 1 second with visual effect
  useEffect(() => {
    if (
      permissionDialog &&
      permissionDialog.isOpen &&
      !hasHandledDialogRef.current
    ) {
      hasHandledDialogRef.current = true; // Mark this dialog as handled

      // Increment dialog count when a new dialog opens
      const currentCount = permissionDialogCountRef.current;
      permissionDialogCountRef.current += 1;

      const timer = setTimeout(() => {
        // First dialog: use allowPermanent, Second+ dialog: use allow
        const buttonToClick = currentCount === 0 ? "allowPermanent" : "allow";
        setAutoClickButton(buttonToClick);
        // That's it! PermissionDialog will handle the rest
      }, 1000); // Auto-allow after 1 second for demo

      return () => {
        clearTimeout(timer);
        hasHandledDialogRef.current = false;
      };
    }
  }, [permissionDialog]);

  // Reset autoClickButton when dialog closes
  useEffect(() => {
    if (!permissionDialog || !permissionDialog.isOpen) {
      setAutoClickButton(null);
      hasHandledDialogRef.current = false;
    }
  }, [permissionDialog]);

  // Reset dialog count when demo starts/resets
  useEffect(() => {
    if (currentStep === 0 || currentStep === 1) {
      permissionDialogCountRef.current = 0;
    }
  }, [currentStep]);

  // Permission dialog handlers (for demo)
  const handlePermissionAllow = () => {
    if (!permissionDialog) return;
    closePermissionDialog();
  };

  const handlePermissionAllowPermanent = () => {
    if (!permissionDialog) return;
    // For demo purposes, just take the first pattern
    const pattern = permissionDialog.patterns[0];
    allowToolPermanent(pattern);
    closePermissionDialog();
  };

  const handlePermissionDeny = () => {
    closePermissionDialog();
  };

  // Fake send message for demo (input is controlled by automation)
  const handleSendMessage = () => {
    // In demo mode, this does nothing - messages are automated
    if (isDemo) return;
  };

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300"
      data-demo-active={isDemo}
      data-demo-completed={isCompleted}
      data-demo-step={currentStep}
    >
      <div className="max-w-6xl mx-auto p-6 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-shrink-0">
          <div>
            <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-bold tracking-tight">
              Claude Code Web UI
              {isDemo && (
                <span className="ml-3 text-lg font-normal text-slate-600 dark:text-slate-400">
                  (Demo)
                </span>
              )}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-mono mt-1">
              {demoWorkingDirectory}
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

        {/* Demo Controls (only shown with ?control=true) */}
        {showControls && (
          <div className="mb-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Demo Controls - Scenario: {selectedScenario} | Step:{" "}
                {currentStep} | Status:{" "}
                {isCompleted
                  ? "Completed"
                  : isPaused
                    ? "Paused"
                    : isTyping
                      ? "Typing"
                      : "Running"}
              </div>
              <div className="flex gap-2">
                {!isCompleted && (
                  <>
                    {isPaused ? (
                      <button
                        onClick={resumeDemo}
                        className="px-3 py-1 text-xs bg-green-200 dark:bg-green-700 text-green-700 dark:text-green-300 rounded hover:bg-green-300 dark:hover:bg-green-600"
                      >
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={pauseDemo}
                        className="px-3 py-1 text-xs bg-yellow-200 dark:bg-yellow-700 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-300 dark:hover:bg-yellow-600"
                      >
                        Pause
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={resetDemo}
                  className="px-3 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Reset Demo
                </button>
                {isCompleted && (
                  <button
                    onClick={startDemo}
                    className="px-3 py-1 text-xs bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-300 dark:hover:bg-blue-600"
                  >
                    Restart
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <ChatMessages messages={messages} isLoading={isLoading} />

        {/* Input */}
        <ChatInput
          input={isDemo ? currentInput : input}
          isLoading={isLoading} // Use real loading state like ChatPage
          currentRequestId={currentRequestId}
          onInputChange={() => {}} // No-op in demo - intentionally blocks user input to simulate a controlled environment where input is not required or allowed
          onSubmit={handleSendMessage}
          onAbort={() => {}} // No-op in demo
        />
      </div>

      {/* Permission Dialog */}
      {permissionDialog && (
        <DemoPermissionDialogWrapper
          isOpen={permissionDialog.isOpen}
          patterns={permissionDialog.patterns}
          onAllow={handlePermissionAllow}
          onAllowPermanent={handlePermissionAllowPermanent}
          onDeny={handlePermissionDeny}
          onClose={closePermissionDialog}
          autoClickButton={autoClickButton}
        />
      )}
    </div>
  );
}
