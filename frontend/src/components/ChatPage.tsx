import { useEffect, useCallback, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import type { ChatRequest, ChatMessage, ProjectInfo } from "../types";
import { useTheme } from "../hooks/useTheme";
import { useClaudeStreaming } from "../hooks/useClaudeStreaming";
import { useChatState } from "../hooks/chat/useChatState";
import { usePermissions } from "../hooks/chat/usePermissions";
import { useAbortController } from "../hooks/chat/useAbortController";
import { ThemeToggle } from "./chat/ThemeToggle";
import { HistoryButton } from "./chat/HistoryButton";
import { ChatInput } from "./chat/ChatInput";
import { ChatMessages } from "./chat/ChatMessages";
import { PermissionDialog } from "./PermissionDialog";
import { HistoryView } from "./HistoryView";
import { getChatUrl, getProjectsUrl } from "../config/api";
import { KEYBOARD_SHORTCUTS } from "../utils/constants";
import type { StreamingContext } from "../hooks/streaming/useMessageProcessor";

export function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);

  // Extract and normalize working directory from URL
  const workingDirectory = (() => {
    const rawPath = location.pathname.replace("/projects", "");
    if (!rawPath) return undefined;

    // URL decode the path
    const decodedPath = decodeURIComponent(rawPath);

    return decodedPath;
  })();

  // Get current view from query parameters
  const currentView = searchParams.get("view");
  // TODO: sessionId will be used for conversation restoration in issue #112
  // const sessionId = searchParams.get("sessionId");
  const isHistoryView = currentView === "history";

  const { theme, toggleTheme } = useTheme();
  const { processStreamLine } = useClaudeStreaming();
  const { abortRequest, createAbortHandler } = useAbortController();

  const {
    messages,
    input,
    isLoading,
    currentSessionId,
    currentRequestId,
    hasShownInitMessage,
    currentAssistantMessage,
    setInput,
    setCurrentSessionId,
    setHasShownInitMessage,
    setHasReceivedInit,
    setCurrentAssistantMessage,
    addMessage,
    updateLastMessage,
    clearInput,
    generateRequestId,
    resetRequestState,
    startRequest,
  } = useChatState();

  const {
    allowedTools,
    permissionDialog,
    showPermissionDialog,
    closePermissionDialog,
    allowToolTemporary,
    allowToolPermanent,
  } = usePermissions();

  const handlePermissionError = useCallback(
    (toolName: string, pattern: string, toolUseId: string) => {
      showPermissionDialog(toolName, pattern, toolUseId);
    },
    [showPermissionDialog],
  );

  const sendMessage = useCallback(
    async (
      messageContent?: string,
      tools?: string[],
      hideUserMessage = false,
    ) => {
      const content = messageContent || input.trim();
      if (!content || isLoading) return;

      const requestId = generateRequestId();

      // Only add user message to chat if not hidden
      if (!hideUserMessage) {
        const userMessage: ChatMessage = {
          type: "chat",
          role: "user",
          content: content,
          timestamp: Date.now(),
        };
        addMessage(userMessage);
      }

      if (!messageContent) clearInput();
      startRequest();

      try {
        const response = await fetch(getChatUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            requestId,
            ...(currentSessionId ? { sessionId: currentSessionId } : {}),
            allowedTools: tools || allowedTools,
            ...(workingDirectory ? { workingDirectory } : {}),
          } as ChatRequest),
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Local state for this streaming session
        let localHasReceivedInit = false;
        let shouldAbort = false;

        const streamingContext: StreamingContext = {
          currentAssistantMessage,
          setCurrentAssistantMessage,
          addMessage,
          updateLastMessage,
          onSessionId: setCurrentSessionId,
          shouldShowInitMessage: () => !hasShownInitMessage,
          onInitMessageShown: () => setHasShownInitMessage(true),
          get hasReceivedInit() {
            return localHasReceivedInit;
          },
          setHasReceivedInit: (received: boolean) => {
            localHasReceivedInit = received;
            setHasReceivedInit(received);
          },
          onPermissionError: handlePermissionError,
          onAbortRequest: async () => {
            shouldAbort = true;
            await createAbortHandler(requestId)();
          },
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done || shouldAbort) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            if (shouldAbort) break;
            processStreamLine(line, streamingContext);
          }

          if (shouldAbort) break;
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        addMessage({
          type: "chat",
          role: "assistant",
          content: "Error: Failed to get response",
          timestamp: Date.now(),
        });
      } finally {
        resetRequestState();
      }
    },
    [
      input,
      isLoading,
      currentSessionId,
      allowedTools,
      hasShownInitMessage,
      currentAssistantMessage,
      workingDirectory,
      generateRequestId,
      clearInput,
      startRequest,
      addMessage,
      updateLastMessage,
      setCurrentSessionId,
      setHasShownInitMessage,
      setHasReceivedInit,
      setCurrentAssistantMessage,
      resetRequestState,
      processStreamLine,
      handlePermissionError,
      createAbortHandler,
    ],
  );

  const handleAbort = useCallback(() => {
    abortRequest(currentRequestId, isLoading, resetRequestState);
  }, [abortRequest, currentRequestId, isLoading, resetRequestState]);

  // Permission dialog handlers
  const handlePermissionAllow = useCallback(() => {
    if (!permissionDialog) return;

    const pattern = permissionDialog.pattern;
    closePermissionDialog();

    if (currentSessionId) {
      sendMessage("continue", allowToolTemporary(pattern), true);
    }
  }, [
    permissionDialog,
    currentSessionId,
    sendMessage,
    allowToolTemporary,
    closePermissionDialog,
  ]);

  const handlePermissionAllowPermanent = useCallback(() => {
    if (!permissionDialog) return;

    const pattern = permissionDialog.pattern;
    const updatedAllowedTools = allowToolPermanent(pattern);
    closePermissionDialog();

    if (currentSessionId) {
      sendMessage("continue", updatedAllowedTools, true);
    }
  }, [
    permissionDialog,
    currentSessionId,
    sendMessage,
    allowToolPermanent,
    closePermissionDialog,
  ]);

  const handlePermissionDeny = useCallback(() => {
    closePermissionDialog();
  }, [closePermissionDialog]);

  const handleHistoryClick = useCallback(() => {
    const searchParams = new URLSearchParams();
    searchParams.set("view", "history");
    navigate({ search: searchParams.toString() });
  }, [navigate]);

  // Load projects to get encodedName mapping
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch(getProjectsUrl());
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error("Failed to load projects:", error);
      }
    };
    loadProjects();
  }, []);

  // Get encoded name for current working directory
  const getEncodedName = useCallback(() => {
    if (!workingDirectory || !projects.length) {
      return null;
    }

    const project = projects.find((p) => p.path === workingDirectory);
    return project?.encodedName || null;
  }, [workingDirectory, projects]);

  const handleBackToChat = useCallback(() => {
    navigate({ search: "" });
  }, [navigate]);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_SHORTCUTS.ABORT && isLoading && currentRequestId) {
        e.preventDefault();
        handleAbort();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isLoading, currentRequestId, handleAbort]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-6 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            {isHistoryView && (
              <button
                onClick={handleBackToChat}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
                aria-label="Back to chat"
              >
                <ChevronLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            )}
            <div>
              <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-bold tracking-tight">
                {isHistoryView ? "Conversation History" : "Claude Code Web UI"}
              </h1>
              {workingDirectory && (
                <p className="text-slate-600 dark:text-slate-400 text-sm font-mono mt-1">
                  {workingDirectory}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isHistoryView && <HistoryButton onClick={handleHistoryClick} />}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>

        {/* Main Content */}
        {isHistoryView ? (
          <HistoryView
            workingDirectory={workingDirectory || ""}
            encodedName={getEncodedName()}
            onBack={handleBackToChat}
          />
        ) : (
          <>
            {/* Chat Messages */}
            <ChatMessages messages={messages} isLoading={isLoading} />

            {/* Input */}
            <ChatInput
              input={input}
              isLoading={isLoading}
              currentRequestId={currentRequestId}
              onInputChange={setInput}
              onSubmit={() => sendMessage()}
              onAbort={handleAbort}
            />
          </>
        )}
      </div>

      {/* Permission Dialog */}
      {permissionDialog && (
        <PermissionDialog
          isOpen={permissionDialog.isOpen}
          toolName={permissionDialog.toolName}
          pattern={permissionDialog.pattern}
          onAllow={handlePermissionAllow}
          onAllowPermanent={handlePermissionAllowPermanent}
          onDeny={handlePermissionDeny}
          onClose={closePermissionDialog}
        />
      )}
    </div>
  );
}
