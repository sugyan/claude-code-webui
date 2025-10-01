import { useState, useCallback, useRef } from "react";
import type { ConversationHistory, AllMessage } from "../types";

interface CachedSession {
  messages: AllMessage[];
  sessionId: string;
  timestamp: number;
  projectPath: string;
  scrollPosition?: number;
}

interface SessionCacheHook {
  getCachedSession: (
    projectPath: string,
    sessionId: string,
  ) => CachedSession | null;
  setCachedSession: (
    projectPath: string,
    sessionId: string,
    messages: AllMessage[],
    scrollPosition?: number,
  ) => void;
  updateScrollPosition: (
    projectPath: string,
    sessionId: string,
    scrollPosition: number,
  ) => void;
  preloadSession: (
    projectPath: string,
    sessionId: string,
    encodedName: string,
  ) => Promise<void>;
  clearCache: () => void;
  getCacheSize: () => number;
}

const MAX_CACHE_SIZE = 10; // Maximum number of sessions to keep cached
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

export function useSessionCache(): SessionCacheHook {
  const cache = useRef<Map<string, CachedSession>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());
  const [, forceRerender] = useState(0);

  const getCacheKey = useCallback(
    (projectPath: string, sessionId: string): string => {
      return `${projectPath}:${sessionId}`;
    },
    [],
  );

  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    cache.current.forEach((session, key) => {
      if (now - session.timestamp > CACHE_EXPIRY) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => cache.current.delete(key));
  }, []);

  const enforceMaxCacheSize = useCallback(() => {
    if (cache.current.size <= MAX_CACHE_SIZE) return;

    // Convert to array and sort by timestamp (oldest first)
    const entries = Array.from(cache.current.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp,
    );

    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, cache.current.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => cache.current.delete(key));
  }, []);

  const getCachedSession = useCallback(
    (projectPath: string, sessionId: string): CachedSession | null => {
      cleanExpiredCache();
      const key = getCacheKey(projectPath, sessionId);
      const cached = cache.current.get(key);

      if (cached) {
        // Update timestamp to mark as recently accessed
        cached.timestamp = Date.now();
      }

      return cached || null;
    },
    [getCacheKey, cleanExpiredCache],
  );

  const setCachedSession = useCallback(
    (
      projectPath: string,
      sessionId: string,
      messages: AllMessage[],
      scrollPosition?: number,
    ) => {
      cleanExpiredCache();
      const key = getCacheKey(projectPath, sessionId);

      const existing = cache.current.get(key);

      cache.current.set(key, {
        messages: [...messages], // Create a copy to avoid mutations
        sessionId,
        projectPath,
        timestamp: Date.now(),
        scrollPosition: scrollPosition ?? existing?.scrollPosition,
      });

      enforceMaxCacheSize();
      forceRerender((prev) => prev + 1); // Trigger rerender for cache size updates
    },
    [getCacheKey, cleanExpiredCache, enforceMaxCacheSize],
  );

  const updateScrollPosition = useCallback(
    (projectPath: string, sessionId: string, scrollPosition: number) => {
      const key = getCacheKey(projectPath, sessionId);
      const existing = cache.current.get(key);

      if (existing) {
        existing.scrollPosition = scrollPosition;
        existing.timestamp = Date.now(); // Mark as recently accessed
      }
    },
    [getCacheKey],
  );

  const preloadSession = useCallback(
    async (
      projectPath: string,
      sessionId: string,
      encodedName: string,
    ): Promise<void> => {
      const key = getCacheKey(projectPath, sessionId);

      // Don't preload if already cached or currently loading
      if (cache.current.has(key) || loadingRef.current.has(key)) {
        return;
      }

      loadingRef.current.add(key);

      try {
        const response = await fetch(
          `/api/projects/${encodedName}/histories/${sessionId}`,
        );
        if (response.ok) {
          const data: ConversationHistory = await response.json();
          setCachedSession(projectPath, sessionId, data.messages);
        }
      } catch (error) {
        console.error("Failed to preload session:", error);
      } finally {
        loadingRef.current.delete(key);
      }
    },
    [getCacheKey, setCachedSession],
  );

  const clearCache = useCallback(() => {
    cache.current.clear();
    loadingRef.current.clear();
    forceRerender((prev) => prev + 1);
  }, []);

  const getCacheSize = useCallback(() => {
    return cache.current.size;
  }, []);

  return {
    getCachedSession,
    setCachedSession,
    updateScrollPosition,
    preloadSession,
    clearCache,
    getCacheSize,
  };
}
