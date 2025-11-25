import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, ChatBubbleLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useClaudeProjects, useProjectConversations } from '../../hooks/useClaudeProjects';
import type { ClaudeProject, ConversationSummary } from '../../../../shared/types';

interface ProjectsSidebarProps {
  onConversationSelect: (projectEncodedName: string, conversationId: string) => void;
  activeProjectPath?: string;
  activeSessionId?: string;
  className?: string;
}

interface ProjectItemProps {
  project: ClaudeProject;
  isActive: boolean;
  activeSessionId?: string;
  onConversationSelect: (projectEncodedName: string, conversationId: string) => void;
}

function formatDate(dateString: string): string {
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
}

function ConversationItem({ 
  conversation, 
  isActive,
  onSelect 
}: { 
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: () => void; 
}) {
  return (
    <div
      onClick={onSelect}
      className={`group pl-12 pr-3 py-2 cursor-pointer transition-all duration-150 ${
        isActive 
          ? 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500' 
          : 'border-l-4 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
      }`}
    >
      <div className="flex items-start gap-2">
        <ChatBubbleLeftIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
          isActive ? 'text-green-600' : 'text-gray-400'
        }`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm truncate ${
            isActive ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-gray-100'
          }`}>
            {conversation.lastMessagePreview || 'No preview available'}
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${
              isActive ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {conversation.messageCount} messages
            </span>
            <span className={`text-xs ${
              isActive ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {formatDate(conversation.lastTime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectItem({ project, isActive, activeSessionId, onConversationSelect }: ProjectItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsLatestConversation, setNeedsLatestConversation] = useState(false);
  
  const { conversations, loading, error } = useProjectConversations(
    isExpanded || needsLatestConversation ? project.encodedName : null
  );

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleProjectClick = async () => {
    console.log(`[ProjectItem] Click on project: ${project.displayName} (${project.encodedName})`);
    console.log(`[ProjectItem] Conversations loaded: ${conversations.length}`);
    
    // If conversations are already loaded, use them
    if (conversations.length > 0) {
      const latestConversation = conversations[0];
      console.log(`[ProjectItem] Opening latest conversation: ${latestConversation.sessionId}`);
      onConversationSelect(project.encodedName, latestConversation.sessionId);
    } else {
      // Otherwise, trigger loading and wait for conversations
      console.log(`[ProjectItem] Triggering conversation loading...`);
      setNeedsLatestConversation(true);
    }
  };

  // Effect to handle opening latest conversation once loaded
  React.useEffect(() => {
    if (needsLatestConversation && conversations.length > 0) {
      const latestConversation = conversations[0];
      console.log(`[ProjectItem] useEffect - Opening latest conversation: ${latestConversation.sessionId} for project ${project.displayName}`);
      onConversationSelect(project.encodedName, latestConversation.sessionId);
      setNeedsLatestConversation(false);
    }
  }, [needsLatestConversation, conversations, project.encodedName, onConversationSelect]);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      {/* Project Header - Unified hover area */}
      <div
        className={`group flex items-center transition-colors cursor-pointer ${
          isActive 
            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500' 
            : 'border-l-4 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        onClick={handleProjectClick}
      >
        {/* Expand/Collapse button - full height click area */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
          className="flex items-center gap-2 px-4 self-stretch cursor-pointer hover:bg-gray-200/70 dark:hover:bg-gray-600/70 transition-colors"
        >
          {isExpanded ? (
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`} />
          ) : (
            <ChevronRightIcon className={`h-4 w-4 transition-transform ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`} />
          )}
          <FolderIcon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-blue-500 group-hover:text-blue-600'}`} />
        </div>
        
        {/* Project details */}
        <div className="flex-1 pr-4 py-3 min-w-0">
          <div className={`font-medium ${
            isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
          }`}>
            {project.displayName}
          </div>
          <div className={`text-sm ${
            isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
          }`}>
            {project.conversationCount} conversations
            {project.lastModified && (
              <> • {formatDate(project.lastModified)}</>
            )}
          </div>
        </div>
      </div>

      {/* Conversations List */}
      {isExpanded && (
        <div className="bg-gray-50 dark:bg-gray-800">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Loading conversations...
            </div>
          )}
          
          {error && (
            <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
              Error: {error}
            </div>
          )}
          
          {!loading && !error && conversations.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No conversations found
            </div>
          )}
          
          {!loading && !error && conversations.map((conversation) => (
            <ConversationItem
              key={conversation.sessionId}
              conversation={conversation}
              isActive={activeSessionId === conversation.sessionId}
              onSelect={() => onConversationSelect(project.encodedName, conversation.sessionId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsSidebar({ onConversationSelect, activeProjectPath, activeSessionId, className = '' }: ProjectsSidebarProps) {
  const { projects, loading, error, refetch } = useClaudeProjects();
  const navigate = useNavigate();

  const handleHeaderClick = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
        <div 
          onClick={handleHeaderClick}
          className="flex-shrink-0 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Projects
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading projects...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
        <div 
          onClick={handleHeaderClick}
          className="flex-shrink-0 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Projects
          </h2>
          <div className="text-sm text-red-600 dark:text-red-400 mb-2">
            Error: {error}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              refetch();
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
      <div 
        onClick={handleHeaderClick}
        className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Projects
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {projects.length} projects found
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        {projects.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            No projects found. Start a conversation with Claude CLI to see projects here.
          </div>
        ) : (
          projects.map((project) => (
            <ProjectItem
              key={project.encodedName}
              project={project}
              isActive={activeProjectPath === project.path}
              activeSessionId={activeSessionId}
              onConversationSelect={onConversationSelect}
            />
          ))
        )}
      </div>
      
      {/* New Chat Button - only show when we have an active project */}
      {activeProjectPath && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={() => {
              // Navigate to new chat for the current project
              navigate(`/projects/${encodeURIComponent(activeProjectPath)}`);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Chat
          </button>
        </div>
      )}
    </div>
  );
}