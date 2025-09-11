import { useEffect, useCallback, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import type {
  ChatRequest,
  ChatMessage,
  ProjectInfo,
  PermissionMode,
} from "../types";
import type { ConversationSummary } from "../../../shared/types";
import { useClaudeStreaming } from "../hooks/useClaudeStreaming";
import { useChatState } from "../hooks/chat/useChatState";
import { usePermissions } from "../hooks/chat/usePermissions";
import { usePermissionMode } from "../hooks/chat/usePermissionMode";
import { useAbortController } from "../hooks/chat/useAbortController";
import { useAutoHistoryLoader } from "../hooks/useHistoryLoader";
import { SettingsButton } from "./SettingsButton";
import { SettingsModal } from "./SettingsModal";
import { HistoryButton } from "./chat/HistoryButton";
import { ChatInput } from "./chat/ChatInput";
import { ChatMessages } from "./chat/ChatMessages";
import { HistoryView } from "./HistoryView";
import { getChatUrl, getProjectsUrl } from "../config/api";
import { KEYBOARD_SHORTCUTS } from "../utils/constants";
import { normalizeWindowsPath } from "../utils/pathUtils";
import type { StreamingContext } from "../hooks/streaming/useMessageProcessor";
import ProjectsSidebar from "./sidebar/ProjectsSidebar";

function getProjectDisplayName(workingDirectory?: string): string {
  if (!workingDirectory) return "Claude Code Web UI";
  
  // Split the path into segments
  const segments = workingDirectory.replace(/^[A-Z]:[\\/]/, "").split(/[\\/]/).filter(s => s.length > 0);
  
  // Common directory names to skip
  const commonDirs = ["Users", "Documents", "Desktop", "Projects", "Code", "Development"];
  
  // Find the last common directory and take everything after it as the project name
  let projectStartIndex = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (commonDirs.some(dir => segments[i].toLowerCase().includes(dir.toLowerCase()))) {
      projectStartIndex = i + 1;
      break;
    }
  }
  
  // If we found a common directory, take everything after it as the project name
  if (projectStartIndex > 0 && projectStartIndex < segments.length) {
    const projectParts = segments.slice(projectStartIndex);
    return projectParts.join("-");
  }
  
  // Fallback: take the last 2 parts if they look like a project name
  if (segments.length >= 2) {
    const lastTwo = segments.slice(-2);
    if (lastTwo.every(part => part.length <= 10)) {
      return lastTwo.join("-");
    }
  }
  
  // Final fallback: just take the last part
  return segments[segments.length - 1] || "Claude Code Web UI";
}

export function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<{
    title: string;
    fullTitle: string;
    projectEncodedName: string;
  } | null>(null);

  // Extract and normalize working directory from URL
  const workingDirectory = (() => {
    const rawPath = location.pathname.replace("/projects", "");
    if (!rawPath) return undefined;

    // URL decode the path
    const decodedPath = decodeURIComponent(rawPath);
    console.log(`[ChatPage] Raw path: ${rawPath}`);
    console.log(`[ChatPage] Decoded path: ${decodedPath}`);

    // Normalize Windows paths (remove leading slash from /C:/... format)
    const normalized = normalizeWindowsPath(decodedPath);
    console.log(`[ChatPage] Normalized working directory: ${normalized}`);
    return normalized;
  })();

  // Get current view and sessionId from query parameters
  const currentView = searchParams.get("view");
  const sessionId = searchParams.get("sessionId");
  console.log(`[ChatPage] Session ID from URL: ${sessionId}`);
  const isHistoryView = currentView === "history";
  const isLoadedConversation = !!sessionId && !isHistoryView;

  const { processStreamLine } = useClaudeStreaming();
  const { abortRequest, createAbortHandler } = useAbortController();

  // Permission mode state management
  const { permissionMode, setPermissionMode } = usePermissionMode();

  // Get encoded name for current working directory
  const getEncodedName = useCallback(() => {
    console.log(`[ChatPage] getEncodedName - workingDirectory: ${workingDirectory}`);
    console.log(`[ChatPage] getEncodedName - projects.length: ${projects.length}`);
    
    if (!workingDirectory || !projects.length) {
      console.log(`[ChatPage] getEncodedName - returning null (missing data)`);
      return null;
    }

    console.log(`[ChatPage] getEncodedName - available project paths:`, projects.map(p => p.path));
    const project = projects.find((p) => p.path === workingDirectory);
    console.log(`[ChatPage] getEncodedName - direct project match: ${project?.encodedName || 'none'}`);

    // Normalize paths for comparison (handle Windows path issues)
    const normalizedWorking = normalizeWindowsPath(workingDirectory);
    const normalizedProject = projects.find(
      (p) => normalizeWindowsPath(p.path) === normalizedWorking,
    );
    console.log(`[ChatPage] getEncodedName - normalized project match: ${normalizedProject?.encodedName || 'none'}`);

    // Use normalized result if exact match fails
    const finalProject = project || normalizedProject;

    const result = finalProject?.encodedName || null;
    console.log(`[ChatPage] getEncodedName - returning: ${result}`);
    return result;
  }, [workingDirectory, projects]);

  // Load conversation history if sessionId is provided
  const {
    messages: historyMessages,
    loading: historyLoading,
    error: historyError,
    sessionId: loadedSessionId,
  } = useAutoHistoryLoader(
    getEncodedName() || undefined,
    sessionId || undefined,
  );

  // Initialize chat state with loaded history
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
  } = useChatState({
    initialMessages: historyMessages,
    initialSessionId: loadedSessionId || undefined,
  });

  const {
    allowedTools,
    permissionRequest,
    showPermissionRequest,
    closePermissionRequest,
    allowToolTemporary,
    allowToolPermanent,
    isPermissionMode,
    planModeRequest,
    showPlanModeRequest,
    closePlanModeRequest,
    updatePermissionMode,
  } = usePermissions({
    onPermissionModeChange: setPermissionMode,
  });

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

  const sendMessage = useCallback(
    async (
      messageContent?: string,
      tools?: string[],
      hideUserMessage = false,
      overridePermissionMode?: PermissionMode,
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
            permissionMode: overridePermissionMode || permissionMode,
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
      permissionMode,
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

  // Permission request handlers
  const handlePermissionAllow = useCallback(() => {
    if (!permissionRequest) return;

    // Add all patterns temporarily
    let updatedAllowedTools = allowedTools;
    permissionRequest.patterns.forEach((pattern) => {
      updatedAllowedTools = allowToolTemporary(pattern, updatedAllowedTools);
    });

    closePermissionRequest();

    if (currentSessionId) {
      sendMessage("continue", updatedAllowedTools, true);
    }
  }, [
    permissionRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
    allowToolTemporary,
    closePermissionRequest,
  ]);

  const handlePermissionAllowPermanent = useCallback(() => {
    if (!permissionRequest) return;

    // Add all patterns permanently
    let updatedAllowedTools = allowedTools;
    permissionRequest.patterns.forEach((pattern) => {
      updatedAllowedTools = allowToolPermanent(pattern, updatedAllowedTools);
    });

    closePermissionRequest();

    if (currentSessionId) {
      sendMessage("continue", updatedAllowedTools, true);
    }
  }, [
    permissionRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
    allowToolPermanent,
    closePermissionRequest,
  ]);

  const handlePermissionDeny = useCallback(() => {
    closePermissionRequest();
  }, [closePermissionRequest]);

  // Plan mode request handlers
  const handlePlanAcceptWithEdits = useCallback(() => {
    updatePermissionMode("acceptEdits");
    closePlanModeRequest();
    if (currentSessionId) {
      sendMessage("accept", allowedTools, true, "acceptEdits");
    }
  }, [
    updatePermissionMode,
    closePlanModeRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
  ]);

  const handlePlanAcceptDefault = useCallback(() => {
    updatePermissionMode("default");
    closePlanModeRequest();
    if (currentSessionId) {
      sendMessage("accept", allowedTools, true, "default");
    }
  }, [
    updatePermissionMode,
    closePlanModeRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
  ]);

  const handlePlanKeepPlanning = useCallback(() => {
    updatePermissionMode("plan");
    closePlanModeRequest();
  }, [updatePermissionMode, closePlanModeRequest]);

  // Create permission data for inline permission interface
  const permissionData = permissionRequest
    ? {
        patterns: permissionRequest.patterns,
        onAllow: handlePermissionAllow,
        onAllowPermanent: handlePermissionAllowPermanent,
        onDeny: handlePermissionDeny,
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

  const handleHistoryClick = useCallback(() => {
    const searchParams = new URLSearchParams();
    searchParams.set("view", "history");
    navigate({ search: searchParams.toString() });
  }, [navigate]);

  const handleSettingsClick = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Handle conversation selection from sidebar  
  const handleConversationSelect = useCallback(async (projectEncodedName: string, conversationId: string) => {
    try {
      // Fetch the Claude projects to get the decoded path
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}/api/claude/projects`);
      if (!response.ok) {
        throw new Error('Failed to fetch Claude projects');
      }
      
      const data = await response.json();
      const project = data.projects.find((p: any) => p.encodedName === projectEncodedName);
      
      if (!project) {
        console.error('Project not found for encoded name:', projectEncodedName);
        return;
      }
      
      // Use the decoded path from the API
      const workingDir = project.path;
      console.log(`[ChatPage] Navigating to: ${workingDir} with session: ${conversationId}`);
      
      // Navigate to the project with the session ID to continue the conversation
      const searchParams = new URLSearchParams();
      searchParams.set('sessionId', conversationId);
      navigate(`/projects/${encodeURIComponent(workingDir)}?${searchParams.toString()}`);
    } catch (error) {
      console.error('Error selecting conversation:', error);
    }
  }, [navigate]);

  // Load projects to get encodedName mapping
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}/api/claude/projects`);
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

  // Load conversation details when sessionId is present
  useEffect(() => {
    const loadConversationDetails = async () => {
      if (!sessionId || !workingDirectory) {
        setCurrentConversation(null);
        return;
      }

      try {
        // First, get the Claude projects to find the encoded name for the current working directory
        const claudeProjectsResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}/api/claude/projects`);
        if (!claudeProjectsResponse.ok) return;
        
        const claudeProjectsData = await claudeProjectsResponse.json();
        const currentProject = claudeProjectsData.projects.find((p: any) => p.path === workingDirectory);
        
        if (!currentProject) return;

        // Then get the conversations for this project
        const conversationsResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}/api/claude/projects/${currentProject.encodedName}/conversations`);
        if (!conversationsResponse.ok) return;

        const conversationsData = await conversationsResponse.json();
        const conversation = conversationsData.conversations.find((c: ConversationSummary) => c.sessionId === sessionId);

        if (conversation) {
          // Crop to first few words for a cleaner header
          const cropTitle = (text: string, wordLimit = 4) => {
            const words = text.trim().split(/\s+/);
            if (words.length <= wordLimit) return text;
            return words.slice(0, wordLimit).join(' ') + '...';
          };

          const fullTitle = conversation.lastMessagePreview || 'Untitled Conversation';
          
          setCurrentConversation({
            title: cropTitle(fullTitle),
            fullTitle: fullTitle,
            projectEncodedName: currentProject.encodedName,
          });
        }
      } catch (error) {
        console.error('Failed to load conversation details:', error);
      }
    };

    loadConversationDetails();
  }, [sessionId, workingDirectory]);

  const handleBackToChat = useCallback(() => {
    navigate({ search: "" });
  }, [navigate]);

  const handleBackToHistory = useCallback(() => {
    navigate({ search: "" });
  }, [navigate]);

  const handleBackToProjects = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleBackToProjectChat = useCallback(() => {
    if (workingDirectory) {
      navigate(`/projects${workingDirectory}`);
    }
  }, [navigate, workingDirectory]);

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
      <div className="h-screen flex">
        {/* Claude Projects Sidebar */}
        <ProjectsSidebar 
          onConversationSelect={handleConversationSelect}
          activeProjectPath={workingDirectory}
          activeSessionId={sessionId || undefined}
          className="w-80 h-full"
        />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col max-w-6xl mx-auto p-3 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-8 flex-shrink-0">
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
            {isLoadedConversation && (
              <button
                onClick={handleBackToHistory}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
                aria-label="Back to history"
              >
                <ChevronLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            )}
            <div>
              <nav aria-label="Breadcrumb">
                <div className="flex items-center">
                  <button
                    onClick={handleBackToProjects}
                    className="text-slate-800 dark:text-slate-100 text-lg sm:text-3xl font-bold tracking-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-md px-1 -mx-1"
                    aria-label="Back to project selection"
                  >
                    {getProjectDisplayName(workingDirectory)}
                  </button>
                  {(isHistoryView || sessionId) && (
                    <>
                      <span
                        className="text-slate-800 dark:text-slate-100 text-lg sm:text-3xl font-bold tracking-tight mx-3 select-none"
                        aria-hidden="true"
                      >
                        {" "}
                        ›{" "}
                      </span>
                      <h1
                        className="text-slate-800 dark:text-slate-100 text-lg sm:text-3xl font-bold tracking-tight truncate"
                        aria-current="page"
                        title={currentConversation?.fullTitle}
                      >
                        {isHistoryView
                          ? "Conversation History"
                          : currentConversation?.title || "Conversation"}
                      </h1>
                    </>
                  )}
                </div>
              </nav>
              {workingDirectory && (
                <div className="flex items-center text-sm font-mono mt-1">
                  <button
                    onClick={handleBackToProjectChat}
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded px-1 -mx-1 cursor-pointer"
                    aria-label={`Return to new chat in ${workingDirectory}`}
                  >
                    {workingDirectory}
                  </button>
                  {sessionId && (
                    <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                      Session: {sessionId.substring(0, 8)}...
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isHistoryView && <HistoryButton onClick={handleHistoryClick} />}
            <SettingsButton onClick={handleSettingsClick} />
          </div>
        </div>

        {/* Main Content */}
        {isHistoryView ? (
          <HistoryView
            workingDirectory={workingDirectory || ""}
            encodedName={getEncodedName()}
            onBack={handleBackToChat}
          />
        ) : historyLoading ? (
          /* Loading conversation history */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">
                Loading conversation history...
              </p>
            </div>
          </div>
        ) : historyError ? (
          /* Error loading conversation history */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-slate-800 dark:text-slate-100 text-xl font-semibold mb-2">
                Error Loading Conversation
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                {historyError}
              </p>
              <button
                onClick={() => navigate({ search: "" })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start New Conversation
              </button>
            </div>
          </div>
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
              permissionMode={permissionMode}
              onPermissionModeChange={setPermissionMode}
              showPermissions={isPermissionMode}
              permissionData={permissionData}
              planPermissionData={planPermissionData}
            />
          </>
        )}

        {/* Settings Modal */}
        <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />
        </div>
      </div>
    </div>
  );
}
