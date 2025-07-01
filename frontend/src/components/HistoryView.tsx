import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ConversationSummary } from "../../../shared/types";
import { getHistoriesUrl } from "../config/api";

interface HistoryViewProps {
  workingDirectory: string;
  encodedName: string | null;
  onBack: () => void;
}

export function HistoryView({ encodedName }: HistoryViewProps) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConversations = async () => {
      if (!encodedName) {
        // Keep loading state when encodedName is not available yet
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(getHistoriesUrl(encodedName));

        if (!response.ok) {
          throw new Error(
            `Failed to load conversations: ${response.statusText}`,
          );
        }
        const data = await response.json();
        setConversations(data.conversations || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load conversations",
        );
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [encodedName]);

  const handleConversationSelect = (sessionId: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set("sessionId", sessionId);
    navigate({ search: searchParams.toString() });
  };

  if (loading || !encodedName) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">
            {!encodedName ? "Loading project..." : "Loading conversations..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
            Error Loading History
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-400 dark:text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-slate-800 dark:text-slate-100 text-xl font-semibold mb-2">
            No Conversations Yet
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm">
            Start chatting to see your conversation history here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="p-6 h-full flex flex-col">
        <div className="grid gap-4 flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.sessionId}
              onClick={() => handleConversationSelect(conversation.sessionId)}
              className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    Session: {conversation.sessionId.substring(0, 8)}...
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(conversation.startTime).toLocaleString()} •{" "}
                    {conversation.messageCount} messages
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                    {conversation.lastMessagePreview}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
