import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { AllMessage, ChatMessage } from "../types";
import { useChatState } from "./chat/useChatState";
import { usePermissions } from "./chat/usePermissions";
import {
  scenarioToStream,
  type MockScenarioStep,
  type ButtonActionData,
  DEMO_SCENARIOS,
} from "../utils/mockResponseGenerator";
import type { SDKMessage } from "../types";
import { formatToolArguments } from "../utils/toolUtils";
import { createToolResultMessage } from "../utils/messageConversion";

export interface DemoAutomationHook {
  currentStep: number;
  isCompleted: boolean;
  currentInput: string;
  isTyping: boolean;
  startDemo: () => void;
  pauseDemo: () => void;
  resetDemo: () => void;
  resumeDemo: () => void;
  isPaused: boolean;
}

interface DemoAutomationOptions {
  autoStart?: boolean;
  typingSpeed?: number; // characters per second
  scenarioKey?: keyof typeof DEMO_SCENARIOS;
  pauseAtStep?: number; // Step number to pause at
  onStepComplete?: (step: number) => void;
  onDemoComplete?: () => void;
  addMessage?: (message: AllMessage | ChatMessage) => void;
  setInput?: (input: string) => void;
  startRequest?: () => void;
  resetRequestState?: () => void;
  generateRequestId?: () => string;
  showPermissionRequest?: (
    toolName: string,
    patterns: string[],
    toolUseId: string,
  ) => void;
  onButtonFocus?: (buttonType: string) => void;
  onButtonClick?: (buttonType: string) => void;
}

const DEFAULT_TYPING_SPEED = 30; // characters per second
const REALISTIC_TYPING_VARIANCE = 0.15; // 15% variance in typing speed (reduced for smoother effect)

// Simple seeded pseudo-random number generator for reproducible demos
class SeededRandom {
  private _seed: number;

  constructor(seed: number) {
    this._seed = seed;
  }

  next(): number {
    // Simple linear congruential generator
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }

  reset(seed: number = 42): void {
    this._seed = seed;
  }
}

export function useDemoAutomation(
  options: DemoAutomationOptions = {},
): DemoAutomationHook {
  // Use fixed seed for reproducible demos (per hook instance)
  const demoRandom = useMemo(() => new SeededRandom(42), []);
  const {
    autoStart = true,
    typingSpeed = DEFAULT_TYPING_SPEED,
    scenarioKey = "basic",
    pauseAtStep,
    onStepComplete,
    onDemoComplete,
    addMessage: externalAddMessage,
    setInput: externalSetInput,
    startRequest: externalStartRequest,
    resetRequestState: externalResetRequestState,
    generateRequestId: externalGenerateRequestId,
    showPermissionRequest: externalShowPermissionRequest,
    onButtonFocus,
    onButtonClick,
  } = options;

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Refs for cleanup
  const stepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Chat state (fallback if not provided externally)
  const chatState = useChatState();
  const {
    setInput,
    setCurrentSessionId,
    setHasShownInitMessage,
    setHasReceivedInit,
    setCurrentAssistantMessage,
    addMessage,
    updateLastMessage,
    generateRequestId,
    resetRequestState,
    startRequest,
    currentAssistantMessage,
  } = chatState;

  // Use external functions if provided, otherwise use internal ones
  const finalAddMessage = externalAddMessage || addMessage;
  const finalSetInput = externalSetInput || setInput;
  const finalStartRequest = externalStartRequest || startRequest;
  const finalResetRequestState = externalResetRequestState || resetRequestState;
  const finalGenerateRequestId = externalGenerateRequestId || generateRequestId;

  // Permissions - use external if provided, otherwise use internal
  const permissionsHook = usePermissions();
  const finalShowPermissionRequest =
    externalShowPermissionRequest || permissionsHook.showPermissionRequest;

  // Get current scenario
  const scenario = scenarioToStream(scenarioKey);

  // Typing animation with realistic variance
  const typeText = useCallback(
    (text: string, onComplete?: () => void) => {
      if (!text) {
        onComplete?.();
        return;
      }

      setIsTyping(true);
      setCurrentInput("");
      let currentIndex = 0;

      const typeNextCharacter = () => {
        if (currentIndex < text.length) {
          setCurrentInput(text.slice(0, currentIndex + 1));
          finalSetInput(text.slice(0, currentIndex + 1));
          currentIndex++;

          // Calculate realistic delay with variance (using seeded random for reproducibility)
          const baseDelay = 1000 / typingSpeed;
          const variance = baseDelay * REALISTIC_TYPING_VARIANCE;
          const randomVariance = (demoRandom.next() - 0.5) * 2 * variance;
          const delay = Math.max(50, baseDelay + randomVariance);

          // Add occasional subtle pauses for more realistic typing
          const shouldPause = demoRandom.next() < 0.008; // 0.8% chance of pause (further reduced)
          const pauseDelay = shouldPause ? demoRandom.next() * 80 + 40 : 0;

          typingIntervalRef.current = setTimeout(
            typeNextCharacter,
            delay + pauseDelay,
          );
        } else {
          setIsTyping(false);
          onComplete?.();
        }
      };

      typeNextCharacter();
    },
    [typingSpeed, finalSetInput, demoRandom],
  );

  // Process stream data
  const processStreamData = useCallback(
    (step: MockScenarioStep) => {
      if (step.type === "permission_error") {
        const errorData = step.data as {
          toolName: string;
          pattern: string;
          toolUseId: string;
        };
        finalShowPermissionRequest(
          errorData.toolName,
          [errorData.pattern],
          errorData.toolUseId,
        );
        return;
      }

      if (step.type === "button_focus") {
        const buttonData = step.data as ButtonActionData;
        onButtonFocus?.(buttonData.buttonType);
        return;
      }

      if (step.type === "button_click") {
        const buttonData = step.data as ButtonActionData;
        onButtonClick?.(buttonData.buttonType);
        return;
      }

      const sdkMessage = step.data as SDKMessage;

      switch (sdkMessage.type) {
        case "system": {
          if (sdkMessage.session_id) {
            setCurrentSessionId(sdkMessage.session_id);
          }

          if (!currentAssistantMessage) {
            const systemMessage: AllMessage = {
              ...sdkMessage,
              timestamp: Date.now(),
            };
            finalAddMessage(systemMessage);
            setHasShownInitMessage(true);
            setHasReceivedInit(true);
          }
          break;
        }

        case "assistant": {
          if (sdkMessage.session_id) {
            setCurrentSessionId(sdkMessage.session_id);
          }

          const assistantMsg = sdkMessage as Extract<
            SDKMessage,
            { type: "assistant" }
          >;

          for (const contentItem of assistantMsg.message.content) {
            if (contentItem.type === "text") {
              const textContent = (contentItem as { text: string }).text;
              const assistantMessage: ChatMessage = {
                type: "chat",
                role: "assistant",
                content: textContent,
                timestamp: Date.now(),
              };

              if (currentAssistantMessage) {
                updateLastMessage(textContent);
              } else {
                setCurrentAssistantMessage(assistantMessage);
                finalAddMessage(assistantMessage);
              }
            } else if (contentItem.type === "tool_use") {
              const toolUse = contentItem as {
                type: "tool_use";
                id: string;
                name: string;
                input: Record<string, unknown>;
              };

              // Special handling for ExitPlanMode - create plan message instead of tool message
              if (toolUse.name === "ExitPlanMode") {
                const planContent = (toolUse.input?.plan as string) || "";
                const planMessage = {
                  type: "plan" as const,
                  plan: planContent,
                  toolUseId: toolUse.id || "",
                  timestamp: Date.now(),
                };
                finalAddMessage(planMessage);
              } else {
                const argsDisplay = formatToolArguments(toolUse.input);
                const toolMessage: AllMessage = {
                  type: "tool",
                  content: `${toolUse.name}${argsDisplay}`,
                  timestamp: Date.now(),
                };
                finalAddMessage(toolMessage);
              }
            }
          }

          setCurrentAssistantMessage(null);
          break;
        }

        case "user": {
          // Handle user messages containing tool results (like ExitPlanMode)
          const userMsg = sdkMessage as Extract<SDKMessage, { type: "user" }>;
          const messageContent = userMsg.message.content;

          if (Array.isArray(messageContent)) {
            for (const contentItem of messageContent) {
              if (contentItem.type === "tool_result") {
                const toolResult = contentItem as {
                  type: "tool_result";
                  tool_use_id: string;
                  content: string;
                  is_error?: boolean;
                };

                // Check for permission errors (similar to useToolHandling.ts)
                if (
                  toolResult.is_error &&
                  !toolResult.content.includes("tool_use_error")
                ) {
                  // For demo, we need to trigger permission dialog
                  // Since this is ExitPlanMode, show plan permission request
                  if (toolResult.content === "Exit plan mode?") {
                    // This indicates an ExitPlanMode permission error
                    // Check if showPlanModeRequest is available (it should be from usePermissions)
                    // For now, trigger regular permission request with ExitPlanMode pattern
                    // The ChatPage.tsx logic will convert this to plan mode request
                    finalShowPermissionRequest(
                      "ExitPlanMode",
                      ["ExitPlanMode"],
                      toolResult.tool_use_id,
                    );
                  } else {
                    // For other tool permission errors, show regular permission dialog
                    finalShowPermissionRequest(
                      "Unknown",
                      ["*"],
                      toolResult.tool_use_id,
                    );
                  }
                } else {
                  const toolResultMessage = createToolResultMessage(
                    "Tool result",
                    toolResult.content,
                  );
                  finalAddMessage(toolResultMessage);
                }
              }
            }
          }
          break;
        }

        case "result": {
          if (sdkMessage.session_id) {
            setCurrentSessionId(sdkMessage.session_id);
          }

          const resultMessage: AllMessage = {
            timestamp: Date.now(),
            ...(sdkMessage as Extract<SDKMessage, { type: "result" }>),
          };
          finalAddMessage(resultMessage);
          break;
        }
      }
    },
    [
      currentAssistantMessage,
      setCurrentSessionId,
      setHasShownInitMessage,
      setHasReceivedInit,
      setCurrentAssistantMessage,
      updateLastMessage,
      finalShowPermissionRequest,
      finalAddMessage,
      onButtonFocus,
      onButtonClick,
    ],
  );

  // Execute next demo step
  const executeNextStep = useCallback(() => {
    if (
      isPaused ||
      isCompleted ||
      currentStep === 0 ||
      currentStep > scenario.length
    ) {
      return;
    }

    // Convert step number to array index (step 1 = index 0)
    const stepIndex = currentStep - 1;
    const step = scenario[stepIndex];

    if (!step) {
      console.error(
        `Invalid step index: ${stepIndex} for scenario with ${scenario.length} steps`,
      );
      return;
    }

    // Clear any existing timeouts
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
    }

    stepTimeoutRef.current = setTimeout(() => {
      processStreamData(step);

      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      onStepComplete?.(nextStep);

      // Check if we should pause at this step
      if (pauseAtStep && currentStep === pauseAtStep) {
        console.log(`Demo paused at step ${currentStep} as requested`);
        setIsPaused(true);
        return;
      }

      if (nextStep > scenario.length) {
        setIsCompleted(true);
        finalResetRequestState();
        onDemoComplete?.();
      }
    }, step.delay);
  }, [
    currentStep,
    scenario,
    isPaused,
    isCompleted,
    pauseAtStep,
    processStreamData,
    finalResetRequestState,
    onStepComplete,
    onDemoComplete,
  ]);

  // Demo execution effect
  useEffect(() => {
    if (
      !isCompleted &&
      !isPaused &&
      currentStep > 0 &&
      currentStep <= scenario.length
    ) {
      executeNextStep();
    }

    return () => {
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
      }
    };
  }, [currentStep, isPaused, isCompleted, executeNextStep, scenario.length]);

  // Auto-start effect with typing animation
  useEffect(() => {
    if (autoStart && currentStep === 0 && !isCompleted && !isPaused) {
      // First, simulate typing the input
      const inputText = DEMO_SCENARIOS[scenarioKey].inputText;

      // Start typing after a short delay
      const typingTimer = setTimeout(() => {
        typeText(inputText, () => {
          // Wait a moment after typing is complete before sending (like real user behavior)
          setTimeout(() => {
            // Add the user message to chat
            const userMessage: ChatMessage = {
              type: "chat",
              role: "user",
              content: inputText,
              timestamp: Date.now(),
            };
            finalAddMessage(userMessage);

            // After typing is complete, clear input and start demo (like real chat)
            finalSetInput("");
            setCurrentInput("");
            finalStartRequest();
            finalGenerateRequestId();

            // Start demo execution after a short delay
            setTimeout(() => {
              setCurrentStep(1);
            }, 1000);
          }, 800); // 800ms delay after typing completion before sending
        });
      }, 1000);

      return () => clearTimeout(typingTimer);
    }
    // typeText is intentionally excluded to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoStart,
    currentStep,
    isCompleted,
    isPaused,
    scenarioKey,
    finalAddMessage,
    finalSetInput,
    finalStartRequest,
    finalGenerateRequestId,
  ]);

  // Demo control functions
  const resetDemo = useCallback(() => {
    // Reset the random seed for reproducible demos
    demoRandom.reset(42);

    setCurrentStep(0);
    setIsCompleted(false);
    setIsPaused(false);
    setCurrentInput("");
    setIsTyping(false);
    finalSetInput("");

    // Clear all timeouts
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (typingIntervalRef.current) {
      clearTimeout(typingIntervalRef.current);
    }

    finalResetRequestState();
  }, [finalSetInput, finalResetRequestState, demoRandom]);

  const startDemo = useCallback(() => {
    if (isCompleted) {
      // Reset demo if completed
      resetDemo();
    }
    setIsPaused(false);
    if (currentStep === 0) {
      finalStartRequest();
      finalGenerateRequestId();
    }
  }, [
    isCompleted,
    currentStep,
    finalStartRequest,
    finalGenerateRequestId,
    resetDemo,
  ]);

  const pauseDemo = useCallback(() => {
    setIsPaused(true);
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
    }
    if (typingIntervalRef.current) {
      clearTimeout(typingIntervalRef.current);
    }
    setIsTyping(false);
  }, []);

  const resumeDemo = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    // Capture current refs for cleanup
    const stepTimeout = stepTimeoutRef.current;
    const typingTimeout = typingTimeoutRef.current;
    const typingInterval = typingIntervalRef.current;

    return () => {
      if (stepTimeout) {
        clearTimeout(stepTimeout);
      }
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      if (typingInterval) {
        clearTimeout(typingInterval);
      }
    };
  }, []);

  // Auto-permission handling for demo
  useEffect(() => {
    if (scenarioKey === "fileOperations") {
      // Auto-allow permissions after a short delay for demo purposes
      const timer = setTimeout(() => {
        // This would be handled by the permission interface in the component
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [scenarioKey]);

  return {
    currentStep,
    isCompleted,
    currentInput,
    isTyping,
    startDemo,
    pauseDemo,
    resetDemo,
    resumeDemo,
    isPaused,
  };
}

// Helper function to simulate user input with typing animation
export function useTypingAnimation(
  text: string,
  speed: number = DEFAULT_TYPING_SPEED,
) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create a seeded random generator for this typing animation
  const typingRandom = useMemo(() => new SeededRandom(42), []);

  const startTyping = useCallback(() => {
    setIsTyping(true);
    setDisplayText("");
    let index = 0;

    const typeCharacter = () => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;

        const delay = 1000 / speed + (typingRandom.next() - 0.5) * 100;
        intervalRef.current = setTimeout(typeCharacter, delay);
      } else {
        setIsTyping(false);
      }
    };

    typeCharacter();
  }, [text, speed, typingRandom]);

  const stopTyping = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
    setIsTyping(false);
    setDisplayText(text);
  }, [text]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  return {
    displayText,
    isTyping,
    startTyping,
    stopTyping,
  };
}
