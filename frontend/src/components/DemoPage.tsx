import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { type Theme } from "../types/settings";
import { STORAGE_KEYS, getStorageItem, setStorageItem } from "../utils/storage";
import { useChatState } from "../hooks/chat/useChatState";
import { usePermissions } from "../hooks/chat/usePermissions";
import { useDemoAutomation } from "../hooks/useDemoAutomation";
import { SettingsButton } from "./SettingsButton";
import { SettingsModal } from "./SettingsModal";
import { ChatInput } from "./chat/ChatInput";
import { ChatMessages } from "./chat/ChatMessages";
import { DEMO_SCENARIOS } from "../utils/mockResponseGenerator";

export function DemoPage() {
  const location = useLocation();
  const isDemo = true;

  // Check for control parameter, scenario, theme, and pauseAt
  const searchParams = new URLSearchParams(location.search);
  const showControls = searchParams.get("control") === "true";
  const scenarioParam = searchParams.get(
    "scenario",
  ) as keyof typeof DEMO_SCENARIOS;
  const selectedScenario =
    scenarioParam && DEMO_SCENARIOS[scenarioParam] ? scenarioParam : "basic";

  // Parse pauseAt parameter
  const pauseAtParam = searchParams.get("pauseAt");
  const pauseAtStep = pauseAtParam ? parseInt(pauseAtParam, 10) : undefined;

  // Get theme from URL or use system default
  // NOTE: DemoPage manages its own theme state separately from SettingsContext
  // to support URL-based theme overrides (?theme=dark) and disable transitions
  // during demo recording/playback for visual consistency
  const themeParam = searchParams.get("theme");
  const [theme, setTheme] = useState<Theme>(() => {
    if (themeParam === "dark" || themeParam === "light") {
      return themeParam;
    }
    // Get system theme without using useTheme hook
    const systemDefault = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    return getStorageItem(STORAGE_KEYS.THEME, systemDefault);
  });

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
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
      setStorageItem(STORAGE_KEYS.THEME, theme);
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
    permissionRequest,
    closePermissionRequest,
    allowToolPermanent,
    showPermissionRequest,
    isPermissionMode,
    planModeRequest,
    showPlanModeRequest,
    closePlanModeRequest,
  } = usePermissions();

  const handlePermissionError = useCallback(
    (toolName: string, patterns: string[], toolUseId: string) => {
      // Check if this is an ExitPlanMode permission error
      if (patterns.includes("ExitPlanMode")) {
        // For ExitPlanMode, show plan permission interface instead of regular permission
        showPlanModeRequest(""); // Empty plan content since it was already displayed
      } else {
        showPermissionRequest(toolName, patterns, toolUseId);
      }
    },
    [showPermissionRequest, showPlanModeRequest],
  );

  // Permission request handlers (for demo)
  const handlePermissionAllow = useCallback(() => {
    if (!permissionRequest) return;
    closePermissionRequest();
  }, [permissionRequest, closePermissionRequest]);

  const handlePermissionAllowPermanent = useCallback(() => {
    if (!permissionRequest) return;
    // For demo purposes, just take the first pattern
    const pattern = permissionRequest.patterns[0];
    allowToolPermanent(pattern);
    closePermissionRequest();
  }, [permissionRequest, allowToolPermanent, closePermissionRequest]);

  const handlePermissionDeny = useCallback(() => {
    closePermissionRequest();
  }, [closePermissionRequest]);

  // Plan mode request handlers (for demo)
  const handlePlanAcceptWithEdits = useCallback(() => {
    closePlanModeRequest();
  }, [closePlanModeRequest]);

  const handlePlanAcceptDefault = useCallback(() => {
    closePlanModeRequest();
  }, [closePlanModeRequest]);

  const handlePlanKeepPlanning = useCallback(() => {
    closePlanModeRequest();
  }, [closePlanModeRequest]);

  // Demo permission selection state (for external control)
  const [demoSelectedOption, setDemoSelectedOption] = useState<
    "allow" | "allowPermanent" | "deny" | null
  >(null);

  // Handle button focus from demo automation
  const handleButtonFocus = useCallback((buttonType: string) => {
    console.log(`Demo button focus: ${buttonType}`);

    // Map button types to internal names and sync with permission panel
    if (buttonType === "permission_allow") {
      setActiveButton("allow");
      setDemoSelectedOption("allow");
    } else if (buttonType === "permission_allow_permanent") {
      setActiveButton("allowPermanent");
      setDemoSelectedOption("allowPermanent");
    } else if (buttonType === "permission_deny") {
      setActiveButton("deny");
      setDemoSelectedOption("deny");
    } else if (buttonType === "plan_accept_with_edits") {
      // For plan permission focus, we can add visual feedback later if needed
      console.log("Plan button focused: Accept with Edits");
    } else if (buttonType === "plan_accept_default") {
      console.log("Plan button focused: Accept Default");
    } else if (buttonType === "plan_keep_planning") {
      console.log("Plan button focused: Keep Planning");
    }
  }, []);

  // Create permission data for inline permission interface with demo effects
  const permissionData = permissionRequest
    ? {
        patterns: permissionRequest.patterns,
        onAllow: handlePermissionAllow,
        onAllowPermanent: handlePermissionAllowPermanent,
        onDeny: handlePermissionDeny,
        getButtonClassName: (
          buttonType: "allow" | "allowPermanent" | "deny",
          defaultClassName: string,
        ) => {
          const isActive = activeButton === buttonType;
          const isClicked = clickedButton === buttonType;

          // Pressed state (brief moment before action)
          if (isClicked) {
            return `${defaultClassName} ring-2 ring-white/70`;
          }

          // Demo focus state (subtle addition to normal styles)
          if (isActive) {
            if (buttonType === "allowPermanent") {
              return `${defaultClassName} ring-1 ring-green-300`;
            } else if (buttonType === "allow") {
              return `${defaultClassName} ring-1 ring-blue-300`;
            }
          }

          // Default state (normal styles)
          return defaultClassName;
        },
        onSelectionChange: (selection: "allow" | "allowPermanent" | "deny") => {
          // Sync demo state with component selection state
          setActiveButton(selection);
          setDemoSelectedOption(selection);
        },
        externalSelectedOption: demoSelectedOption,
      }
    : undefined;

  // Create plan permission data for plan mode interface
  const planPermissionData = planModeRequest
    ? {
        onAcceptWithEdits: handlePlanAcceptWithEdits,
        onAcceptDefault: handlePlanAcceptDefault,
        onKeepPlanning: handlePlanKeepPlanning,
      }
    : undefined;

  // Handle button clicks from demo automation
  const handleButtonClick = useCallback(
    (buttonType: string) => {
      console.log(`Demo button click: ${buttonType}`);

      // Set clicked effect first
      if (buttonType === "permission_allow") {
        setClickedButton("allow");
        setTimeout(() => handlePermissionAllow(), 200);
      } else if (buttonType === "permission_allow_permanent") {
        setClickedButton("allowPermanent");
        setTimeout(() => handlePermissionAllowPermanent(), 200);
      } else if (buttonType === "permission_deny") {
        setClickedButton("deny");
        setTimeout(() => handlePermissionDeny(), 200);
      } else if (buttonType === "plan_accept_with_edits") {
        setTimeout(() => handlePlanAcceptWithEdits(), 200);
      } else if (buttonType === "plan_accept_default") {
        setTimeout(() => handlePlanAcceptDefault(), 200);
      } else if (buttonType === "plan_keep_planning") {
        setTimeout(() => handlePlanKeepPlanning(), 200);
      }
    },
    [
      handlePermissionAllow,
      handlePermissionAllowPermanent,
      handlePermissionDeny,
      handlePlanAcceptWithEdits,
      handlePlanAcceptDefault,
      handlePlanKeepPlanning,
    ],
  );

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
    pauseAtStep: pauseAtStep,
    onStepComplete: (step) => {
      console.log(`Demo step ${step} completed`);
    },
    onDemoComplete: () => {
      console.log("Demo completed");
      permissionRequestCountRef.current = 0; // Reset permission request count on demo completion
    },
    // Pass message handling functions from DemoPage
    addMessage,
    setInput: setChatInput,
    startRequest,
    resetRequestState,
    generateRequestId,
    showPermissionRequest: handlePermissionError,
    onButtonFocus: handleButtonFocus,
    onButtonClick: handleButtonClick,
  });

  // Demo state
  const demoWorkingDirectory = "/Users/demo/claude-code-webui";
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [clickedButton, setClickedButton] = useState<string | null>(null);
  const permissionRequestCountRef = useRef(0);

  // Reset states when permission request closes
  useEffect(() => {
    if (!permissionRequest || !permissionRequest.isOpen) {
      setActiveButton(null);
      setClickedButton(null);
      setDemoSelectedOption(null);
    }
  }, [permissionRequest]);

  // Reset permission request count when demo starts/resets
  useEffect(() => {
    if (currentStep === 0 || currentStep === 1) {
      permissionRequestCountRef.current = 0;
    }
  }, [currentStep]);

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
      <div className="max-w-6xl mx-auto p-3 sm:p-6 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-8 flex-shrink-0">
          <div>
            <h1 className="text-slate-800 dark:text-slate-100 text-lg sm:text-3xl font-bold tracking-tight">
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
          <SettingsButton onClick={handleSettingsClick} />
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
          permissionMode="default" // Demo always uses default mode
          onPermissionModeChange={() => {}} // No-op in demo
          showPermissions={isPermissionMode}
          permissionData={permissionData}
          planPermissionData={planPermissionData}
        />

        {/* Settings Modal */}
        <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />
      </div>
    </div>
  );
}
