import type {
  ChatMessage,
  SystemMessage,
  ToolMessage,
  ToolResultMessage,
} from "../types";
import { TimestampComponent } from "./TimestampComponent";
import { MessageContainer } from "./messages/MessageContainer";
import { CollapsibleDetails } from "./messages/CollapsibleDetails";
import { MESSAGE_CONSTANTS } from "../utils/constants";

interface ChatMessageComponentProps {
  message: ChatMessage;
}

export function ChatMessageComponent({ message }: ChatMessageComponentProps) {
  const isUser = message.role === "user";
  const colorScheme = isUser
    ? "bg-blue-600 text-white"
    : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100";

  return (
    <MessageContainer
      alignment={isUser ? "right" : "left"}
      colorScheme={colorScheme}
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <div
          className={`text-xs font-semibold opacity-90 ${
            isUser ? "text-blue-100" : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {isUser ? "User" : "Claude"}
        </div>
        <TimestampComponent
          timestamp={message.timestamp}
          className={`text-xs opacity-70 ${
            isUser ? "text-blue-200" : "text-slate-500 dark:text-slate-500"
          }`}
        />
      </div>
      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
        {message.content}
      </pre>
    </MessageContainer>
  );
}

interface SystemMessageComponentProps {
  message: SystemMessage;
}

export function SystemMessageComponent({
  message,
}: SystemMessageComponentProps) {
  // Generate details based on message type and subtype
  const getDetails = () => {
    if (message.type === "system" && message.subtype === "init") {
      return [
        `Model: ${message.model}`,
        `Session: ${message.session_id.substring(0, MESSAGE_CONSTANTS.SESSION_ID_DISPLAY_LENGTH)}`,
        `Tools: ${message.tools.length} available`,
        `CWD: ${message.cwd}`,
        `Permission Mode: ${message.permissionMode}`,
        `API Key Source: ${message.apiKeySource}`,
      ].join("\n");
    } else if (message.type === "result") {
      const details = [
        `Duration: ${message.duration_ms}ms`,
        `Cost: $${message.total_cost_usd.toFixed(4)}`,
        `Tokens: ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`,
      ];
      return details.join("\n");
    } else if (message.type === "error") {
      return message.message;
    }
    return JSON.stringify(message, null, 2);
  };

  // Get label based on message type
  const getLabel = () => {
    if (message.type === "system") return "System";
    if (message.type === "result") return "Result";
    if (message.type === "error") return "Error";
    return "Message";
  };

  const details = getDetails();

  return (
    <CollapsibleDetails
      label={getLabel()}
      details={details}
      badge={message.subtype}
      icon={<span className="bg-blue-400 dark:bg-blue-500">⚙</span>}
      colorScheme={{
        header: "text-blue-800 dark:text-blue-300",
        content: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-700",
        bg: "bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
      }}
    />
  );
}

interface ToolMessageComponentProps {
  message: ToolMessage;
}

export function ToolMessageComponent({ message }: ToolMessageComponentProps) {
  return (
    <MessageContainer
      alignment="left"
      colorScheme="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100"
    >
      <div className="text-xs font-semibold mb-2 opacity-90 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
        <div className="w-4 h-4 bg-emerald-500 dark:bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs">
          🔧
        </div>
        {message.content}
      </div>
    </MessageContainer>
  );
}

interface ToolResultMessageComponentProps {
  message: ToolResultMessage;
}

export function ToolResultMessageComponent({
  message,
}: ToolResultMessageComponentProps) {
  return (
    <CollapsibleDetails
      label={message.toolName}
      details={message.content}
      badge={message.summary}
      icon={<span className="bg-emerald-400 dark:bg-emerald-500">✓</span>}
      colorScheme={{
        header: "text-emerald-800 dark:text-emerald-300",
        content: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-700",
        bg: "bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800",
      }}
    />
  );
}

export function LoadingComponent() {
  return (
    <MessageContainer
      alignment="left"
      colorScheme="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
    >
      <div className="text-xs font-semibold mb-2 opacity-90 text-slate-600 dark:text-slate-400">
        Claude
      </div>
      <div className="flex items-center gap-2 text-sm">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        <span className="animate-pulse">Thinking...</span>
      </div>
    </MessageContainer>
  );
}
