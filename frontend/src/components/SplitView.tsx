import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type {
  ProjectInfo,
  ConversationSummary,
  ChatRequest,
  ChatMessage,
  PermissionMode,
} from "../types";
import { getProjectsUrl, getHistoriesUrl, getChatUrl } from "../config/api";
import { useClaudeStreaming } from "../hooks/useClaudeStreaming";
import { useChatState } from "../hooks/chat/useChatState";
import { usePermissions } from "../hooks/chat/usePermissions";
import { usePermissionMode } from "../hooks/chat/usePermissionMode";
import { useAbortController } from "../hooks/chat/useAbortController";
import { useAutoCachedHistoryLoader } from "../hooks/useCachedHistoryLoader";
import { useSessionCache } from "../hooks/useSessionCache";
import { normalizeWindowsPath } from "../utils/pathUtils";
import type { StreamingContext } from "../hooks/streaming/useMessageProcessor";
import { SettingsButton } from "./SettingsButton";
import { SettingsModal } from "./SettingsModal";
import { HistoryView } from "./HistoryView";
import { ChatInput } from "./chat/ChatInput";
import { ChatMessages } from "./chat/ChatMessages";

interface ProjectWithSessions extends ProjectInfo {
  sessions?: ConversationSummary[];
  expanded?: boolean;
  loadingSessions?: boolean;
}

export function SplitView() {
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<
    "welcome" | "chat" | "history"
  >("welcome");
  const [searchParams, setSearchParams] = useSearchParams();

  const getProjectDisplayName = (path: string): string => {
    return path.split("/").filter(Boolean).pop() || path;
  };

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;

    const lowercaseSearch = searchTerm.toLowerCase();
    return projects.filter(
      (project) =>
        getProjectDisplayName(project.path)
          .toLowerCase()
          .includes(lowercaseSearch) ||
        project.path.toLowerCase().includes(lowercaseSearch),
    );
  }, [projects, searchTerm]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(getProjectsUrl());
      if (!response.ok) {
        throw new Error(`Failed to load projects: ${response.statusText}`);
      }
      const data = await response.json();
      setProjects(
        data.projects.map((project: ProjectInfo) => ({
          ...project,
          expanded: false,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const loadProjectSessions = async (
    projectIndex: number,
    encodedName: string,
  ) => {
    const updatedProjects = [...projects];
    const project = updatedProjects[projectIndex];
    project.loadingSessions = true;
    setProjects(updatedProjects);

    try {
      const response = await fetch(getHistoriesUrl(encodedName));
      if (response.ok) {
        const data = await response.json();
        const sessions = data.conversations || [];
        project.sessions = sessions;

        // Preload the most recent 3 sessions for faster switching
        const recentSessions = sessions.slice(0, 3);
        for (const session of recentSessions) {
          try {
            await preloadSession(project.path, session.sessionId, encodedName);
          } catch (error) {
            console.warn(
              "Failed to preload session:",
              session.sessionId,
              error,
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      project.sessions = [];
    } finally {
      project.loadingSessions = false;
      setProjects([...updatedProjects]);
    }
  };

  const toggleProjectExpansion = (projectPath: string) => {
    const updatedProjects = [...projects];
    const projectIndex = updatedProjects.findIndex(
      (p) => p.path === projectPath,
    );
    if (projectIndex === -1) return;

    const project = updatedProjects[projectIndex];
    project.expanded = !project.expanded;

    if (project.expanded && !project.sessions && !project.loadingSessions) {
      loadProjectSessions(projectIndex, project.encodedName);
    }

    setProjects(updatedProjects);
  };

  const handleNewSession = (projectPath: string) => {
    setSelectedProject(projectPath);
    setCurrentView("chat");
    setIsSidebarOpen(false); // Close sidebar on mobile when selecting a project
    // Clear any existing session parameters
    setSearchParams({});
  };

  const handleSessionSelect = (projectPath: string, sessionId: string) => {
    setSelectedProject(projectPath);
    setCurrentView("chat");
    setIsSidebarOpen(false); // Close sidebar on mobile when selecting a session
    // Set session parameter for loading existing conversation
    setSearchParams({ sessionId });
  };

  const handleBackToWelcome = () => {
    setCurrentView("welcome");
    setSelectedProject(null);
    setSearchParams({});
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isSidebarOpen && !target.closest('[data-sidebar]') && !target.closest('[data-sidebar-toggle]')) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  // Chat-related hooks and state
  const sessionId = searchParams.get("sessionId");
  const workingDirectory = selectedProject
    ? normalizeWindowsPath(selectedProject)
    : undefined;

  // Get encoded name for current working directory
  const getEncodedName = useCallback(() => {
    if (!workingDirectory || !projects.length) {
      return null;
    }

    const project = projects.find((p) => p.path === workingDirectory);
    const normalizedWorking = normalizeWindowsPath(workingDirectory);
    const normalizedProject = projects.find(
      (p) => normalizeWindowsPath(p.path) === normalizedWorking,
    );
    const finalProject = project || normalizedProject;
    return finalProject?.encodedName || null;
  }, [workingDirectory, projects]);

  const { processStreamLine } = useClaudeStreaming();
  const { abortRequest, createAbortHandler } = useAbortController();
  const { permissionMode, setPermissionMode } = usePermissionMode();
  const { preloadSession, setCachedSession, updateScrollPosition } =
    useSessionCache();

  // Load conversation history if sessionId is provided
  const {
    messages: historyMessages,
    loading: historyLoading,
    error: historyError,
    sessionId: loadedSessionId,
    fromCache: historyFromCache,
    scrollPosition: historyScrollPosition,
  } = useAutoCachedHistoryLoader(
    selectedProject || undefined,
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
  } = usePermissions({
    onPermissionModeChange: setPermissionMode,
  });

  // Chat message sending functionality
  const handlePermissionError = useCallback(
    (toolName: string, patterns: string[]) => {
      showPermissionRequest(toolName, patterns, "");
    },
    [showPermissionRequest],
  );

  const sendMessage = useCallback(
    async (
      messageContent?: string,
      tools?: string[],
      hideUserMessage = false,
      overridePermissionMode?: PermissionMode,
    ) => {
      const content = messageContent || input.trim();
      if (!content || isLoading || !selectedProject) return;

      const requestId = generateRequestId();

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
            workingDirectory: selectedProject,
            permissionMode: overridePermissionMode || permissionMode,
          } as ChatRequest),
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let localHasReceivedInit = false;
        let shouldAbort = false;

        const streamingContext: StreamingContext = {
          currentAssistantMessage,
          setCurrentAssistantMessage,
          addMessage: (msg: ChatMessage) => {
            addMessage(msg);
            // Update cache when new messages are added during streaming
            if (currentSessionId && selectedProject) {
              const updatedMessages = [...messages, msg];
              setCachedSession(
                selectedProject,
                currentSessionId,
                updatedMessages,
              );
            }
          },
          updateLastMessage: (msg: ChatMessage) => {
            updateLastMessage(msg);
            // Update cache when messages are updated during streaming
            if (currentSessionId && selectedProject) {
              const updatedMessages = [...messages];
              updatedMessages[updatedMessages.length - 1] = msg;
              setCachedSession(
                selectedProject,
                currentSessionId,
                updatedMessages,
              );
            }
          },
          onSessionId: (sessionId: string) => {
            setCurrentSessionId(sessionId);
            // Cache the conversation when we get a session ID
            if (selectedProject && messages.length > 0) {
              setCachedSession(selectedProject, sessionId, messages);
            }
          },
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
      selectedProject,
      currentSessionId,
      allowedTools,
      hasShownInitMessage,
      currentAssistantMessage,
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
      messages,
      setCachedSession,
    ],
  );

  // Permission handlers (simplified versions from ChatPage)
  const handlePermissionAllow = useCallback(() => {
    if (!permissionRequest) return;
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

  // Handle scroll position changes to update cache
  const handleScrollPositionChange = useCallback(
    (position: number) => {
      if (selectedProject && currentSessionId) {
        updateScrollPosition(selectedProject, currentSessionId, position);
      }
    },
    [selectedProject, currentSessionId, updateScrollPosition],
  );

  // Create permission data for inline permission interface
  const permissionData = permissionRequest
    ? {
        patterns: permissionRequest.patterns,
        onAllow: handlePermissionAllow,
        onAllowPermanent: handlePermissionAllowPermanent,
        onDeny: handlePermissionDeny,
      }
    : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600 dark:text-slate-400">
          Loading projects...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="flex h-screen relative">
        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Side Panel */}
        <div 
          data-sidebar
          className={`
            fixed lg:relative lg:translate-x-0 z-50 lg:z-auto
            w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 
            flex flex-col transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            h-full lg:h-screen
          `}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Projects
            </h2>
            <div className="flex items-center gap-2">
              <SettingsButton onClick={handleSettingsClick} />
              {/* Close button for mobile */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close sidebar"
              >
                <XMarkIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Projects List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <div
                  key={project.path}
                  className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div
                    className="flex items-center gap-2 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => toggleProjectExpansion(project.path)}
                  >
                    {project.expanded ? (
                      <ChevronDownIcon className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    )}
                    <FolderIcon className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate">
                      {getProjectDisplayName(project.path)}
                    </span>
                  </div>

                  {project.expanded && (
                    <div className="border-t border-slate-200 dark:border-slate-700">
                      {/* New Session Button */}
                      <button
                        onClick={() => handleNewSession(project.path)}
                        className="w-full flex items-center gap-2 p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700"
                      >
                        <PlusIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          New Session
                        </span>
                      </button>

                      {/* Sessions */}
                      {project.loadingSessions ? (
                        <div className="p-3 text-center">
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto"></div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Loading sessions...
                          </div>
                        </div>
                      ) : project.sessions && project.sessions.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto">
                          {project.sessions.map((session) => (
                            <button
                              key={session.sessionId}
                              onClick={() =>
                                handleSessionSelect(
                                  project.path,
                                  session.sessionId,
                                )
                              }
                              className="w-full p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                            >
                              <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                {session.sessionId.substring(0, 8)}...
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {new Date(
                                  session.startTime,
                                ).toLocaleDateString()}{" "}
                                • {session.messageCount} messages
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                                {session.lastMessagePreview}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : project.sessions ? (
                        <div className="p-3 text-center">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            No sessions yet
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Central Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile Header with Burger Menu */}
          <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <button
                data-sidebar-toggle
                onClick={toggleSidebar}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                aria-label="Toggle sidebar"
              >
                <Bars3Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
              {selectedProject && (
                <div className="flex-1 min-w-0 mx-4">
                  <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {getProjectDisplayName(selectedProject)}
                  </h1>
                  {currentSessionId && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                      Session: {currentSessionId.substring(0, 8)}...
                    </div>
                  )}
                </div>
              )}
              {selectedProject && (
                <button
                  onClick={handleBackToWelcome}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  aria-label="Back to project selection"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </button>
              )}
            </div>
          </div>
          {currentView === "welcome" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-4">
                <div className="w-16 h-16 mx-auto mb-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <FolderIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Welcome to Claude Code Web UI
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Select a project from the sidebar to start a new conversation,
                  or choose an existing session to continue where you left off.
                </p>
                <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <ChevronRightIcon className="h-4 w-4" />
                    <span>Click on a project to see its sessions</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    <span>Click "New Session" to start fresh</span>
                  </div>
                  <div className="lg:hidden mt-4">
                    <button
                      onClick={toggleSidebar}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Bars3Icon className="h-4 w-4" />
                      <span>Open Projects</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === "history" && selectedProject && (
            <HistoryView
              workingDirectory={selectedProject}
              encodedName={getEncodedName()}
              onBack={handleBackToWelcome}
            />
          )}

          {currentView === "chat" && selectedProject && (
            <div className="flex-1 flex flex-col p-4 min-h-0">
              {/* Desktop Chat Header - hidden on mobile */}
              <div className="hidden lg:flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBackToWelcome}
                    className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
                    aria-label="Back to project selection"
                  >
                    <ChevronLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {getProjectDisplayName(selectedProject)}
                    </h1>
                    {currentSessionId && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
                        <span>
                          Session: {currentSessionId.substring(0, 8)}...
                        </span>
                        {historyFromCache && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                            cached
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {historyLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Loading conversation history...
                    </p>
                  </div>
                </div>
              ) : historyError ? (
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
                  </div>
                </div>
              ) : (
                <>
                  <ChatMessages
                    messages={messages}
                    isLoading={isLoading}
                    restoreScrollPosition={historyScrollPosition}
                    onScrollPositionChange={handleScrollPositionChange}
                    shouldAutoScroll={
                      !historyFromCache || historyScrollPosition === undefined
                    }
                  />
                  <ChatInput
                    input={input}
                    isLoading={isLoading}
                    currentRequestId={currentRequestId}
                    onInputChange={setInput}
                    onSubmit={() => sendMessage()}
                    onAbort={() =>
                      abortRequest(
                        currentRequestId,
                        isLoading,
                        resetRequestState,
                      )
                    }
                    permissionMode={permissionMode}
                    onPermissionModeChange={setPermissionMode}
                    showPermissions={isPermissionMode}
                    permissionData={permissionData}
                    planPermissionData={undefined}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />
    </div>
  );
}
