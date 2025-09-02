import type {
  ChatMessage,
  SystemMessage,
  ToolMessage,
  ToolResultMessage,
  PlanMessage,
  ThinkingMessage,
  TodoMessage,
  TodoItem,
  HooksMessage,
} from "../types";
import { TimestampComponent } from "./TimestampComponent";
import { MessageContainer } from "./messages/MessageContainer";
import { CollapsibleDetails } from "./messages/CollapsibleDetails";
import { MESSAGE_CONSTANTS } from "../utils/constants";
import {
  createEditResult,
  createBashPreview,
  createContentPreview,
  isEditToolUseResult,
  isBashToolUseResult,
} from "../utils/contentUtils";

// ANSI escape sequence regex for cleaning hooks messages
const ANSI_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

// Type guard to check if the message is a hooks message
function isHooksMessage(
  msg: SystemMessage,
): msg is HooksMessage & { timestamp: number } {
  return (
    msg.type === "system" &&
    "content" in msg &&
    typeof msg.content === "string" &&
    !("subtype" in msg)
  );
}

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
    if (
      message.type === "system" &&
      "subtype" in message &&
      message.subtype === "init"
    ) {
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
    } else if (isHooksMessage(message)) {
      // This is a hooks message - show only the content
      // Remove ANSI escape sequences for cleaner display
      return message.content.replace(ANSI_REGEX, "");
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
      badge={"subtype" in message ? message.subtype : undefined}
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
  const toolUseResult = message.toolUseResult;

  let previewContent: string | undefined;
  let previewSummary: string | undefined;
  let maxPreviewLines = 5;
  let displayContent = message.content;
  let defaultExpanded = false;

  // Handle Edit tool results with structuredPatch
  if (message.toolName === "Edit" && isEditToolUseResult(toolUseResult)) {
    const editResult = createEditResult(
      toolUseResult.structuredPatch,
      message.content,
      20, // autoExpandThreshold: auto-expand if 20 lines or fewer
    );
    displayContent = editResult.details;
    previewSummary = editResult.summary;
    previewContent = editResult.previewContent;
    defaultExpanded = editResult.defaultExpanded;
    maxPreviewLines = 20; // Use 20 for Edit results to match previewContent
  }

  // Handle Bash tool results with stdout/stderr
  else if (message.toolName === "Bash" && isBashToolUseResult(toolUseResult)) {
    const isError = Boolean(toolUseResult.stderr?.trim());
    const bashPreview = createBashPreview(
      toolUseResult.stdout || "",
      toolUseResult.stderr || "",
      isError,
      5,
    );
    if (bashPreview.hasMore) {
      previewContent = bashPreview.preview;
    }
  }

  // Handle specific tool results that benefit from content preview
  // Note: Read tool should NOT show preview, only line counts in summary
  else if (message.toolName === "Grep" && message.content.trim().length > 0) {
    const contentPreview = createContentPreview(message.content, 5);
    if (contentPreview.hasMore) {
      previewContent = contentPreview.preview;
    }
  }

  // Determine if preview should be shown for this tool
  const shouldShowPreview =
    message.toolName === "Bash" ||
    message.toolName === "Edit" ||
    message.toolName === "Grep";

  return (
    <CollapsibleDetails
      label={message.toolName}
      details={displayContent}
      badge={message.toolName === "Edit" ? undefined : message.summary}
      icon={<span className="bg-emerald-400 dark:bg-emerald-500">✓</span>}
      colorScheme={{
        header: "text-emerald-800 dark:text-emerald-300",
        content: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-700",
        bg: "bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800",
      }}
      previewContent={previewContent}
      previewSummary={previewSummary}
      maxPreviewLines={maxPreviewLines}
      showPreview={shouldShowPreview}
      defaultExpanded={defaultExpanded}
    />
  );
}

interface PlanMessageComponentProps {
  message: PlanMessage;
}

export function PlanMessageComponent({ message }: PlanMessageComponentProps) {
  return (
    <MessageContainer
      alignment="left"
      colorScheme="bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold opacity-90 text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
            📋
          </div>
          Ready to code?
        </div>
        <TimestampComponent
          timestamp={message.timestamp}
          className="text-xs opacity-70 text-blue-600 dark:text-blue-400"
        />
      </div>

      <div className="mb-3">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          Here is Claude's plan:
        </p>
        <div className="bg-blue-100/50 dark:bg-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
          <pre className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap font-mono leading-relaxed">
            {message.plan}
          </pre>
        </div>
      </div>
    </MessageContainer>
  );
}

interface ThinkingMessageComponentProps {
  message: ThinkingMessage;
}

export function ThinkingMessageComponent({
  message,
}: ThinkingMessageComponentProps) {
  return (
    <CollapsibleDetails
      label="Claude's Reasoning"
      details={message.content}
      badge="thinking"
      icon={<span className="bg-purple-400 dark:bg-purple-500">💭</span>}
      colorScheme={{
        header: "text-purple-700 dark:text-purple-300",
        content: "text-purple-600 dark:text-purple-400 italic",
        border: "border-purple-200 dark:border-purple-700",
        bg: "bg-purple-50/60 dark:bg-purple-900/15 border border-purple-200 dark:border-purple-800",
      }}
      defaultExpanded={true}
    />
  );
}

interface TodoMessageComponentProps {
  message: TodoMessage;
}

export function TodoMessageComponent({ message }: TodoMessageComponentProps) {
  const getStatusIcon = (status: TodoItem["status"]) => {
    switch (status) {
      case "completed":
        return { icon: "✅", label: "Completed" };
      case "in_progress":
        return { icon: "🔄", label: "In progress" };
      case "pending":
      default:
        return { icon: "⏳", label: "Pending" };
    }
  };

  const getStatusColor = (status: TodoItem["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-700 dark:text-green-400";
      case "in_progress":
        return "text-blue-700 dark:text-blue-400";
      case "pending":
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <MessageContainer
      alignment="left"
      colorScheme="bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold opacity-90 text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <div
            className="w-4 h-4 bg-amber-500 dark:bg-amber-600 rounded-full flex items-center justify-center text-white text-xs"
            aria-hidden="true"
          >
            📋
          </div>
          Todo List Updated
        </div>
        <TimestampComponent
          timestamp={message.timestamp}
          className="text-xs opacity-70 text-amber-600 dark:text-amber-400"
        />
      </div>

      <div className="space-y-1">
        {message.todos.map((todo, index) => {
          const statusIcon = getStatusIcon(todo.status);
          return (
            <div key={index} className="flex items-start gap-2">
              <span
                className="text-sm flex-shrink-0 mt-0.5"
                aria-label={statusIcon.label}
              >
                {statusIcon.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${getStatusColor(todo.status)}`}>
                  {todo.content}
                </div>
                {todo.status === "in_progress" && (
                  <div className="text-xs text-amber-600 dark:text-amber-500 italic">
                    {todo.activeForm}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-amber-700 dark:text-amber-400">
        {message.todos.filter((t) => t.status === "completed").length} of{" "}
        {message.todos.length} completed
      </div>
    </MessageContainer>
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
