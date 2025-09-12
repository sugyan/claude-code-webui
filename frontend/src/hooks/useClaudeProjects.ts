import { useState, useEffect, useCallback } from 'react';
import { getClaudeProjectsUrl, getClaudeProjectConversationsUrl } from '../config/api';
import type { 
  ClaudeProject, 
  ClaudeProjectsResponse, 
  ConversationSummary, 
  ProjectConversationsResponse 
} from '../../../shared/types';

export interface UseClaudeProjectsReturn {
  projects: ClaudeProject[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseProjectConversationsReturn {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}


/**
 * Hook to fetch all Claude projects from .claude/projects directory
 */
export function useClaudeProjects(): UseClaudeProjectsReturn {
  const [projects, setProjects] = useState<ClaudeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(getClaudeProjectsUrl());
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      
      const data: ClaudeProjectsResponse = await response.json();
      setProjects(data.projects);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(message);
      console.error('Error fetching Claude projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
  };
}

/**
 * Hook to fetch conversations for a specific Claude project
 */
export function useProjectConversations(encodedProjectName: string | null): UseProjectConversationsReturn {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!encodedProjectName) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(getClaudeProjectConversationsUrl(encodedProjectName));
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }
      
      const data: ProjectConversationsResponse = await response.json();
      setConversations(data.conversations);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(message);
      console.error('Error fetching project conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [encodedProjectName]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  };
}