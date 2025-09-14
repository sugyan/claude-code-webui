import { useRef, useEffect } from "react";
import type { AllMessage } from "../../types";
import {
  isChatMessage,
  isSystemMessage,
  isToolMessage,
  isToolResultMessage,
  isPlanMessage,
  isThinkingMessage,
  isTodoMessage,
} from "../../types";
import {
  ChatMessageComponent,
  SystemMessageComponent,
  ToolMessageComponent,
  ToolResultMessageComponent,
  PlanMessageComponent,
  ThinkingMessageComponent,
  TodoMessageComponent,
  LoadingComponent,
} from "../MessageComponents";
import { MessageSquare } from "lucide-react";
// import { UI_CONSTANTS } from "../../utils/constants"; // Unused for now

interface ChatMessagesProps {
  messages: AllMessage[];
  isLoading: boolean;
  restoreScrollPosition?: number;
  onScrollPositionChange?: (position: number) => void;
  shouldAutoScroll?: boolean;
}

export function ChatMessages({
  messages,
  isLoading,
  restoreScrollPosition,
  onScrollPositionChange,
  shouldAutoScroll = true,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isRestoringScroll = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current && messagesEndRef.current.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Restore scroll position
  const restoreScroll = (position: number) => {
    if (messagesContainerRef.current) {
      isRestoringScroll.current = true;
      messagesContainerRef.current.scrollTop = position;
      // Clear the flag after a brief delay to allow for scroll event handling
      setTimeout(() => {
        isRestoringScroll.current = false;
      }, 100);
    }
  };

  // Handle scroll position changes for caching
  const handleScroll = () => {
    if (
      isRestoringScroll.current ||
      !messagesContainerRef.current ||
      !onScrollPositionChange
    ) {
      return;
    }

    // Debounce scroll position updates
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    scrollTimeout.current = setTimeout(() => {
      if (messagesContainerRef.current) {
        onScrollPositionChange(messagesContainerRef.current.scrollTop);
      }
    }, 150);
  };

  // Check if user is near bottom of messages (unused but kept for future use)
  // const isNearBottom = () => {
  //   const container = messagesContainerRef.current;
  //   if (!container) return true;

  //   const { scrollTop, scrollHeight, clientHeight } = container;
  //   return (
  //     scrollHeight - scrollTop - clientHeight <
  //     UI_CONSTANTS.NEAR_BOTTOM_THRESHOLD_PX
  //   );
  // };

  // Handle scroll restoration when restoreScrollPosition changes
  useEffect(() => {
    if (restoreScrollPosition !== undefined) {
      restoreScroll(restoreScrollPosition);
    }
  }, [restoreScrollPosition]);

  // Auto-scroll when messages change (only if shouldAutoScroll is true and not restoring)
  useEffect(() => {
    if (shouldAutoScroll && restoreScrollPosition === undefined) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll, restoreScrollPosition]);

  const renderMessage = (message: AllMessage, index: number) => {
    // Use timestamp as key for stable rendering, fallback to index if needed
    const key = `${message.timestamp}-${index}`;

    if (isSystemMessage(message)) {
      return <SystemMessageComponent key={key} message={message} />;
    } else if (isToolMessage(message)) {
      return <ToolMessageComponent key={key} message={message} />;
    } else if (isToolResultMessage(message)) {
      return <ToolResultMessageComponent key={key} message={message} />;
    } else if (isPlanMessage(message)) {
      return <PlanMessageComponent key={key} message={message} />;
    } else if (isThinkingMessage(message)) {
      return <ThinkingMessageComponent key={key} message={message} />;
    } else if (isTodoMessage(message)) {
      return <TodoMessageComponent key={key} message={message} />;
    } else if (isChatMessage(message)) {
      return <ChatMessageComponent key={key} message={message} />;
    }
    return null;
  };

  return (
    <div
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 p-3 sm:p-6 mb-3 sm:mb-6 rounded-2xl shadow-sm backdrop-blur-sm flex flex-col"
    >
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Spacer div to push messages to the bottom */}
          <div className="flex-1" aria-hidden="true"></div>
          {messages.map(renderMessage)}
          {isLoading && <LoadingComponent />}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400">
      <div>
        <div className="mb-6 opacity-60">
          <MessageSquare className="w-16 h-16 mx-auto" />
        </div>
        <p className="text-lg font-medium">Start a conversation with Claude</p>
        <p className="text-sm mt-2 opacity-80">
          Type your message below to begin
        </p>
      </div>
    </div>
  );
}
