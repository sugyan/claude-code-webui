import { useRef, useEffect } from "react";
import type { AllMessage } from "../../types";
import {
  isChatMessage,
  isSystemMessage,
  isToolMessage,
  isToolResultMessage,
  isPlanMessage,
} from "../../types";
import {
  ChatMessageComponent,
  SystemMessageComponent,
  ToolMessageComponent,
  ToolResultMessageComponent,
  PlanMessageComponent,
  LoadingComponent,
} from "../MessageComponents";
// import { UI_CONSTANTS } from "../../utils/constants"; // Unused for now

interface ChatMessagesProps {
  messages: AllMessage[];
  isLoading: boolean;
  workingDirectory?: string;
}

export function ChatMessages({ messages, isLoading, workingDirectory }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current && messagesEndRef.current.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
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

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    } else if (isChatMessage(message)) {
      return <ChatMessageComponent key={key} message={message} />;
    }
    return null;
  };

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 p-3 sm:p-6 mb-3 sm:mb-6 rounded-2xl shadow-sm backdrop-blur-sm flex flex-col"
    >
      {messages.length === 0 ? (
        <EmptyState workingDirectory={workingDirectory} />
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

interface EmptyStateProps {
  workingDirectory?: string;
}

function EmptyState({ workingDirectory }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400">
      <div>
        <div className="text-6xl mb-6 opacity-60">
          <span role="img" aria-label="coding icon">
            💻
          </span>
        </div>
        <p className="text-lg font-medium">You will start coding with Claude</p>
        <p className="text-sm mt-2 opacity-80">
          {workingDirectory ? (
            <>
              The Path of Project is <span className="font-mono text-blue-600 dark:text-blue-400">{workingDirectory}</span>
            </>
          ) : (
            "Project directory not specified"
          )}
        </p>
        <p className="text-sm mt-1 opacity-70">
          Let me know if you need to add more features, design or modify any pages or sections of the project. Just type your message and let me know.
        </p>
      </div>
    </div>
  );
}
