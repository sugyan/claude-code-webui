import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatRequest, AllMessage, ChatMessage } from "./types";
import { isChatMessage, isSystemMessage, isToolMessage } from "./types";
import { useTheme } from "./hooks/useTheme";
import { useClaudeStreaming } from "./hooks/useClaudeStreaming";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import {
  ChatMessageComponent,
  SystemMessageComponent,
  ToolMessageComponent,
  LoadingComponent,
} from "./components/MessageComponents";

function App() {
  const [messages, setMessages] = useState<AllMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { processStreamLine } = useClaudeStreaming();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [currentAssistantMessage, setCurrentAssistantMessage] =
    useState<ChatMessage | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom function with smooth behavior
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && shouldAutoScroll) {
      // Check if scrollIntoView is available (not available in test environment)
      if (typeof messagesEndRef.current.scrollIntoView === "function") {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    }
  }, [shouldAutoScroll]);

  // Check if user is near bottom of chat
  const checkScrollPosition = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 100; // pixels from bottom
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;

    setShouldAutoScroll(isNearBottom);
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAssistantMessage, isLoading, scrollToBottom]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const computedStyle = getComputedStyle(textarea);
      const maxHeight = parseInt(computedStyle.maxHeight, 10) || 200;
      const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      type: "chat",
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8080/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() } as ChatRequest),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const streamingContext = {
        currentAssistantMessage,
        setCurrentAssistantMessage,
        addMessage: (msg: AllMessage) => {
          setMessages((prev) => [...prev, msg]);
        },
        updateLastMessage: (content: string) => {
          setMessages((prev) =>
            prev.map((msg, index) =>
              index === prev.length - 1 && isChatMessage(msg)
                ? { ...msg, content }
                : msg,
            ),
          );
        },
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          processStreamLine(line, streamingContext);
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "chat",
          role: "assistant",
          content: "Error: Failed to get response",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-6 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-shrink-0">
          <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-bold tracking-tight">
            Claude Code Web UI
          </h1>
          <button
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <SunIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            ) : (
              <MoonIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            )}
          </button>
        </div>

        {/* Chat Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={checkScrollPosition}
          className="flex-1 overflow-y-auto bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 p-6 mb-6 rounded-2xl shadow-sm backdrop-blur-sm flex flex-col"
        >
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400">
              <div>
                <div className="text-6xl mb-6 opacity-60">💬</div>
                <p className="text-lg font-medium">
                  Start a conversation with Claude
                </p>
                <p className="text-sm mt-2 opacity-80">
                  Type your message below to begin
                </p>
              </div>
            </div>
          )}
          {messages.length > 0 && (
            <>
              <div className="flex-1"></div>
              {messages.map((message, index) => {
                if (isSystemMessage(message)) {
                  return (
                    <SystemMessageComponent key={index} message={message} />
                  );
                } else if (isToolMessage(message)) {
                  return <ToolMessageComponent key={index} message={message} />;
                } else {
                  return <ChatMessageComponent key={index} message={message} />;
                }
              })}
              {isLoading && <LoadingComponent />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              rows={1}
              className="w-full px-4 py-3 pr-20 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm shadow-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none overflow-hidden min-h-[48px] max-h-[200px]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 text-sm"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
