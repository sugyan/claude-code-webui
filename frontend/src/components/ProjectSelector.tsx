import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FolderIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { SettingsButton } from "./SettingsButton";
import { SettingsModal } from "./SettingsModal";
import ProjectsSidebar from "./sidebar/ProjectsSidebar";
import { useClaudeProjects } from "../hooks/useClaudeProjects";
import { getClaudeProjectConversationsUrl } from "../config/api";
import type { ClaudeProject } from "../../../shared/types";

export function ProjectSelector() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();
  
  // Use the same data source as the sidebar
  const { projects, loading, error } = useClaudeProjects();

  const handleProjectSelect = async (project: ClaudeProject) => {
    try {
      // Fetch the conversations for this project to get the latest one
      const response = await fetch(getClaudeProjectConversationsUrl(project.encodedName));
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      
      if (data.conversations && data.conversations.length > 0) {
        // Navigate to the most recent conversation (conversations are sorted by most recent first)
        const latestConversation = data.conversations[0];
        console.log(`[ProjectSelector] Opening latest conversation: ${latestConversation.sessionId} for project ${project.displayName}`);
        navigate(`/projects/${encodeURIComponent(project.path)}?sessionId=${latestConversation.sessionId}`);
      } else {
        // If no conversations found, navigate to project without session (will create new conversation)
        console.log(`[ProjectSelector] No conversations found for ${project.displayName}, starting new conversation`);
        navigate(`/projects/${encodeURIComponent(project.path)}`);
      }
    } catch (error) {
      console.error('Error loading project conversations:', error);
      // Fallback to navigating to project without session
      navigate(`/projects/${encodeURIComponent(project.path)}`);
    }
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Handle conversation selection from sidebar  
  const handleConversationSelect = useCallback((projectEncodedName: string, conversationId: string) => {
    // Find the project from our loaded projects
    const project = projects.find(p => p.encodedName === projectEncodedName);
    
    if (!project) {
      console.error('Project not found for encoded name:', projectEncodedName);
      return;
    }
    
    console.log(`[ProjectSelector] Navigating to: ${project.path} with session: ${conversationId}`);
    
    // Navigate to the project with the session ID to continue the conversation
    navigate(`/projects/${encodeURIComponent(project.path)}?sessionId=${conversationId}`);
  }, [navigate, projects]);

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
      <div className="h-screen flex">
        {/* Claude Projects Sidebar */}
        <ProjectsSidebar 
          onConversationSelect={handleConversationSelect}
          activeProjectPath={undefined}
          activeSessionId={undefined}
          className="w-80 h-full"
        />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col max-w-6xl mx-auto p-3 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-bold tracking-tight">
              Select a Project
            </h1>
            <SettingsButton onClick={handleSettingsClick} />
          </div>

          <div className="space-y-3">
            {projects.length > 0 && (
              <>
                <h2 className="text-slate-700 dark:text-slate-300 text-lg font-medium mb-4">
                  Recent Projects
                </h2>
                {projects.map((project) => (
                  <button
                    key={project.encodedName}
                    onClick={() => handleProjectSelect(project)}
                    className="w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-left"
                  >
                    <FolderIcon className="h-6 w-6 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-slate-800 dark:text-slate-200 font-medium truncate">
                          {project.displayName}
                        </h3>
                        {project.lastModified && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
                            {formatDate(project.lastModified)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-mono text-xs truncate">
                          {project.path}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <ChatBubbleLeftIcon className="h-3 w-3" />
                          <span className="text-xs">
                            {project.conversationCount} conversation{project.conversationCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Settings Modal */}
          <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />
        </div>
      </div>
    </div>
  );
}
