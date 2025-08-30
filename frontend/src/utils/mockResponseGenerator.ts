import type { SDKMessage } from "@anthropic-ai/claude-code";
import { generateToolPattern } from "./toolUtils";
import { generateId } from "./id";

export interface MockStreamResponse {
  type: "claude_json" | "done" | "error";
  data?: SDKMessage;
  error?: string;
}

export interface ButtonActionData {
  buttonType:
    | "permission_allow"
    | "permission_deny"
    | "permission_allow_permanent"
    | "plan_accept_with_edits"
    | "plan_accept_default"
    | "plan_keep_planning";
}

export type MockScenarioStep =
  | {
      type: "system" | "assistant" | "user" | "result";
      delay: number; // delay in milliseconds before this step
      data: SDKMessage;
    }
  | {
      type: "permission_error";
      delay: number;
      data: { toolName: string; pattern: string; toolUseId: string };
    }
  | {
      type: "button_focus" | "button_click";
      delay: number;
      data: ButtonActionData;
    };

// Generate realistic Claude system messages
export function createSystemMessage(
  sessionId: string,
): Extract<SDKMessage, { type: "system" }> {
  return {
    type: "system",
    subtype: "init",
    apiKeySource: "user",
    cwd: "/Users/demo/claude-code-webui",
    session_id: sessionId,
    uuid: generateId(),
    tools: ["Read", "Write", "Edit", "Bash"],
    mcp_servers: [],
    model: "claude-3-5-sonnet-20241022",
    permissionMode: "default",
    slash_commands: [],
    output_style: "default",
  };
}

// Generate realistic Claude assistant messages
export function createAssistantMessage(
  content: string,
  sessionId: string,
): Extract<SDKMessage, { type: "assistant" }> {
  return {
    type: "assistant",
    message: {
      id: "msg_" + generateId(),
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: content }],
      model: "claude-3-5-sonnet-20241022",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 25, output_tokens: 45 },
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid: generateId(),
  };
}

// Generate combined assistant message with both text and tool_use (like real SDK)
export function createCombinedAssistantMessage(
  textContent: string,
  toolUse: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  },
  sessionId: string,
): Extract<SDKMessage, { type: "assistant" }> {
  return {
    type: "assistant",
    message: {
      id: "msg_" + generateId(),
      type: "message",
      role: "assistant",
      content: [
        { type: "text", text: textContent },
        {
          type: "tool_use",
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input,
        },
      ],
      model: "claude-3-5-sonnet-20241022",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 25, output_tokens: 65 },
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid: generateId(),
  };
}

// Generate realistic Claude result messages
export function createResultMessage(
  sessionId: string,
  inputTokens: number = 45,
  outputTokens: number = 120,
): Extract<SDKMessage, { type: "result" }> {
  return {
    type: "result",
    subtype: "success",
    session_id: sessionId,
    duration_ms: 1200,
    duration_api_ms: 800,
    is_error: false,
    num_turns: 1,
    result: "Success",
    total_cost_usd: (inputTokens * 0.003 + outputTokens * 0.015) / 1000,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
    },
    permission_denials: [],
    uuid: generateId(),
  };
}

// Generate ExitPlanMode tool use message
export function createExitPlanModeToolUse(
  sessionId: string,
  planContent: string,
): Extract<SDKMessage, { type: "assistant" }> {
  const toolUseId = generateId();
  return {
    type: "assistant",
    message: {
      id: "msg_" + generateId(),
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: toolUseId,
          name: "ExitPlanMode",
          input: {
            plan: planContent,
          },
        },
      ],
      model: "claude-3-5-sonnet-20241022",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 25, output_tokens: 28 },
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid: generateId(),
  };
}

// Generate ExitPlanMode tool use message with specific ID
export function createExitPlanModeToolUseWithId(
  sessionId: string,
  toolUseId: string,
  planContent: string,
): Extract<SDKMessage, { type: "assistant" }> {
  return {
    type: "assistant",
    message: {
      id: "msg_" + generateId(),
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: toolUseId,
          name: "ExitPlanMode",
          input: {
            plan: planContent,
          },
        },
      ],
      model: "claude-3-5-sonnet-20241022",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 25, output_tokens: 28 },
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid: generateId(),
  };
}

// Generate ExitPlanMode tool result message
export function createExitPlanModeToolResult(
  sessionId: string,
  toolUseId: string,
): Extract<SDKMessage, { type: "user" }> {
  return {
    type: "user",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          content: "Exit plan mode?",
          is_error: true, // Mark as error to trigger permission dialog
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid: generateId(),
  };
}

// Generate realistic tool use assistant messages
export function createToolUseMessage(
  toolName: string,
  toolInput: Record<string, unknown>,
  sessionId: string,
  toolUseId: string = generateId(),
): Extract<SDKMessage, { type: "assistant" }> {
  return {
    type: "assistant",
    message: {
      id: "msg_" + generateId(),
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: toolUseId,
          name: toolName,
          input: toolInput,
        },
      ],
      model: "claude-3-5-sonnet-20241022",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 45, output_tokens: 28 },
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid: generateId(),
  };
}

// Generate streaming responses for demo
export function* generateMockStream(
  steps: MockScenarioStep[],
): Generator<MockStreamResponse, void, unknown> {
  for (const step of steps) {
    if (step.type === "permission_error") {
      // This would trigger permission request in real app
      const errorData = step.data as {
        toolName: string;
        pattern: string;
        toolUseId: string;
      };
      yield {
        type: "error",
        error: `Permission required for tool: ${errorData.toolName}`,
      };
      continue;
    }

    yield {
      type: "claude_json",
      data: step.data as SDKMessage,
    };
  }

  yield { type: "done" };
}

// Demo input scenarios
export const DEMO_INPUTS = {
  basic: "Hello! Can you help me understand this project?",
  fileOperations:
    "Can you read the main App.tsx file and explain what it does?",
  codeAnalysis:
    "Please analyze the frontend code structure and suggest improvements",
  codeGeneration:
    "Write a simple Python script that calculates fibonacci numbers and run it",
  planMode:
    "Create a simple README.md file for this project with basic documentation",
} as const;

// Predefined demo scenarios
export const DEMO_SCENARIOS = {
  basic: {
    sessionId: "demo-session-basic",
    inputText: DEMO_INPUTS.basic,
    steps: [
      {
        type: "system" as const,
        delay: 800,
        data: createSystemMessage("demo-session-basic"),
      },
      {
        type: "assistant" as const,
        delay: 1500,
        data: createAssistantMessage(
          "Hello! I'm Claude, your AI assistant. I can help you with coding, file operations, and much more. I can see this is a Claude Code Web UI project - a React frontend with a Deno backend. What specific aspect would you like me to help you understand?",
          "demo-session-basic",
        ),
      },
      {
        type: "result" as const,
        delay: 600,
        data: createResultMessage("demo-session-basic", 35, 65),
      },
    ],
  },
  fileOperations: {
    sessionId: "demo-session-files",
    inputText: DEMO_INPUTS.fileOperations,
    steps: [
      {
        type: "system" as const,
        delay: 600,
        data: createSystemMessage("demo-session-files"),
      },
      {
        type: "assistant" as const,
        delay: 1800,
        data: createToolUseMessage(
          "Read",
          { file_path: "/Users/demo/claude-code-webui/frontend/src/App.tsx" },
          "demo-session-files",
          "read-app-tsx",
        ),
      },
      {
        type: "permission_error" as const,
        delay: 1000,
        data: {
          toolName: "Read",
          pattern: generateToolPattern("Read", "*"),
          toolUseId: "read-app-tsx",
        },
      },
      {
        type: "button_focus" as const,
        delay: 500,
        data: {
          buttonType: "permission_allow",
        },
      },
      {
        type: "button_click" as const,
        delay: 700,
        data: {
          buttonType: "permission_allow",
        },
      },
      {
        type: "assistant" as const,
        delay: 1000,
        data: createAssistantMessage(
          "I can see this is the main App.tsx file for the Claude Code Web UI project. It's a React application that uses React Router for navigation between a project selector page and the main chat interface. The app includes theme management with light/dark mode support, and provides a web-based interface for interacting with the Claude CLI tool. The routing system allows users to first select a working directory, then engage in conversations with Claude within that project context.",
          "demo-session-files",
        ),
      },
      {
        type: "result" as const,
        delay: 800,
        data: createResultMessage("demo-session-files", 45, 120),
      },
    ],
  },
  codeAnalysis: {
    sessionId: "demo-session-analysis",
    inputText: DEMO_INPUTS.codeAnalysis,
    steps: [
      {
        type: "system" as const,
        delay: 700,
        data: createSystemMessage("demo-session-analysis"),
      },
      {
        type: "assistant" as const,
        delay: 1600,
        data: createToolUseMessage(
          "Bash",
          {
            command:
              "find frontend/src -name '*.tsx' -o -name '*.ts' | head -10",
          },
          "demo-session-analysis",
          "find-files",
        ),
      },
      {
        type: "permission_error" as const,
        delay: 900,
        data: {
          toolName: "Bash",
          pattern: generateToolPattern("Bash", "find"),
          toolUseId: "find-files",
        },
      },
      {
        type: "button_focus" as const,
        delay: 500,
        data: {
          buttonType: "permission_allow",
        },
      },
      {
        type: "button_click" as const,
        delay: 700,
        data: {
          buttonType: "permission_allow",
        },
      },
      {
        type: "assistant" as const,
        delay: 1000,
        data: createToolUseMessage(
          "Read",
          { file_path: "/Users/demo/claude-code-webui/frontend/src" },
          "demo-session-analysis",
          "read-src-dir",
        ),
      },
      {
        type: "assistant" as const,
        delay: 1800,
        data: createAssistantMessage(
          "Based on my analysis of the frontend code structure, here are some observations and suggestions:\n\n**Strengths:**\n- Well-organized modular architecture with clear separation of concerns\n- Proper TypeScript usage throughout\n- Good hook composition pattern\n- Comprehensive component testing setup\n\n**Suggestions for improvement:**\n- Consider implementing lazy loading for better performance\n- Add error boundaries for better error handling\n- Implement proper loading states for better UX\n- Consider adding more comprehensive error logging",
          "demo-session-analysis",
        ),
      },
      {
        type: "result" as const,
        delay: 900,
        data: createResultMessage("demo-session-analysis", 55, 180),
      },
    ],
  },
  codeGeneration: {
    sessionId: "demo-session-codegen",
    inputText: DEMO_INPUTS.codeGeneration,
    steps: [
      {
        type: "system" as const,
        delay: 700,
        data: createSystemMessage("demo-session-codegen"),
      },
      {
        type: "assistant" as const,
        delay: 1500,
        data: createAssistantMessage(
          "I'll create a Python Fibonacci calculator for you. Let me write the script.",
          "demo-session-codegen",
        ),
      },
      {
        type: "assistant" as const,
        delay: 1800,
        data: createToolUseMessage(
          "Write",
          {
            file_path: "/Users/demo/claude-code-webui/fibonacci.py",
            content: `def fibonacci(n):
    """Generate Fibonacci sequence up to n terms"""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib

if __name__ == "__main__":
    n = 10
    result = fibonacci(n)
    print(f"Fibonacci sequence ({n} terms): {result}")
    print(f"Sum: {sum(result)}")`,
          },
          "demo-session-codegen",
          "write-fibonacci",
        ),
      },
      {
        type: "permission_error" as const,
        delay: 1000,
        data: {
          toolName: "Write",
          pattern: generateToolPattern("Write", "*"),
          toolUseId: "write-fibonacci",
        },
      },
      {
        type: "button_focus" as const,
        delay: 500,
        data: {
          buttonType: "permission_allow",
        },
      },
      {
        type: "button_focus" as const,
        delay: 500,
        data: {
          buttonType: "permission_allow_permanent",
        },
      },
      {
        type: "button_click" as const,
        delay: 700,
        data: {
          buttonType: "permission_allow_permanent",
        },
      },
      {
        type: "assistant" as const,
        delay: 1000,
        data: createAssistantMessage(
          "Great! I've created the Fibonacci script. Now let me run it to show you the results.",
          "demo-session-codegen",
        ),
      },
      {
        type: "assistant" as const,
        delay: 1200,
        data: createToolUseMessage(
          "Bash",
          {
            command: "python fibonacci.py",
            description: "Run the Fibonacci calculator script",
          },
          "demo-session-codegen",
          "run-fibonacci",
        ),
      },
      {
        type: "permission_error" as const,
        delay: 800,
        data: {
          toolName: "Bash",
          pattern: generateToolPattern("Bash", "python"),
          toolUseId: "run-fibonacci",
        },
      },
      {
        type: "button_focus" as const,
        delay: 700,
        data: {
          buttonType: "permission_allow",
        },
      },
      {
        type: "button_click" as const,
        delay: 700,
        data: {
          buttonType: "permission_allow",
        },
      },
      {
        type: "assistant" as const,
        delay: 1200,
        data: createAssistantMessage(
          "Perfect! The script executed successfully. Here's what it generated:\n\n```\nFibonacci sequence (10 terms): [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\nSum: 88\n```\n\nThe Fibonacci script calculates the first 10 numbers in the sequence and shows their sum. Each number is the sum of the two preceding ones, starting from 0 and 1. This demonstrates a complete development workflow from writing code to execution!",
          "demo-session-codegen",
        ),
      },
      {
        type: "result" as const,
        delay: 900,
        data: createResultMessage("demo-session-codegen", 65, 220),
      },
    ],
  },
  planMode: (() => {
    // Generate a consistent tool use ID that will be shared between tool_use and tool_result
    const planToolUseId = "demo-plan-tool-" + Date.now();
    const planContent = `# README Creation Plan

## Overview
I'll create a comprehensive README.md file for the Claude Code Web UI project with essential documentation.

## Implementation Steps
1. **Project Analysis**: Review the project structure to understand key features
2. **README Structure**: Create sections for description, installation, usage, and features
3. **Content Creation**: Write clear, concise documentation with examples
4. **Final Review**: Ensure all important aspects are covered

## Deliverables
- Professional README.md file with project overview
- Installation and usage instructions
- Feature descriptions and screenshots references
- Development and contribution guidelines`;

    return {
      sessionId: "demo-session-plan",
      inputText: DEMO_INPUTS.planMode,
      steps: [
        {
          type: "system" as const,
          delay: 600,
          data: createSystemMessage("demo-session-plan"),
        },
        {
          type: "assistant" as const,
          delay: 1200,
          data: createCombinedAssistantMessage(
            "I'll help you create a comprehensive README.md file! Let me first analyze the project structure and create a documentation plan.",
            {
              id: planToolUseId,
              name: "ExitPlanMode",
              input: { plan: planContent },
            },
            "demo-session-plan",
          ),
        },
        {
          type: "user" as const,
          delay: 1500,
          data: createExitPlanModeToolResult(
            "demo-session-plan",
            planToolUseId,
          ),
        },
        {
          type: "button_focus",
          delay: 800,
          data: {
            buttonType: "plan_accept_with_edits",
          },
        },
        {
          type: "button_click",
          delay: 1000,
          data: {
            buttonType: "plan_accept_with_edits",
          },
        },
        // Post-approval implementation steps (after user accepts plan with edits)
        {
          type: "assistant" as const,
          delay: 1500,
          data: createAssistantMessage(
            "Excellent! Now I'll implement the README creation plan. Let me start by examining the project structure to understand the key features.",
            "demo-session-plan",
          ),
        },
        {
          type: "assistant" as const,
          delay: 1800,
          data: createToolUseMessage(
            "Read",
            { file_path: "/Users/demo/claude-code-webui/package.json" },
            "demo-session-plan",
            "read-package-json",
          ),
        },
        {
          type: "assistant" as const,
          delay: 1200,
          data: createAssistantMessage(
            "Great! I can see this is the Claude Code Web UI project. Now I'll create a comprehensive README.md file with all the essential information.",
            "demo-session-plan",
          ),
        },
        {
          type: "assistant" as const,
          delay: 1600,
          data: createToolUseMessage(
            "Write",
            {
              file_path: "/Users/demo/claude-code-webui/README.md",
              content: `# Claude Code Web UI

A modern, web-based interface for the Claude Code CLI tool that provides streaming responses in an intuitive chat interface.

## ✨ Features

- **🌐 Web Interface**: Access Claude Code through your browser
- **💬 Real-time Chat**: Streaming responses with live updates
- **📁 Project Management**: Select and switch between project directories
- **🎨 Theme Support**: Light/dark theme with system preference detection
- **📝 Conversation History**: Browse and restore previous chat sessions

## 🚀 Quick Start

1. **Install Dependencies**
   \`\`\`bash
   # Backend
   cd backend && npm install
   
   # Frontend  
   cd frontend && npm install
   \`\`\`

2. **Start the Application**
   \`\`\`bash
   # Start backend (port 8080)
   cd backend && npm run dev
   
   # Start frontend (port 3000)
   cd frontend && npm run dev
   \`\`\`

3. **Open your browser** and navigate to \`http://localhost:3000\`

## 🏗️ Architecture

- **Backend**: TypeScript + Hono framework (Deno/Node.js)
- **Frontend**: React + Vite + TailwindCSS + TypeScript
- **Streaming**: Real-time JSON streaming from Claude CLI

## 📄 License

MIT License - see LICENSE file for details.`,
            },
            "demo-session-plan",
            "write-readme",
          ),
        },
        {
          type: "assistant" as const,
          delay: 1200,
          data: createAssistantMessage(
            "Perfect! I've successfully created a comprehensive README.md file with:\n\n✅ Clear project description and features\n✅ Quick start installation guide\n✅ Architecture overview\n✅ Professional formatting with emojis\n\nThe README provides all essential information for users and contributors. Notice how I was able to read the project structure and create the file seamlessly without additional permission requests - that's the power of plan mode approval!",
            "demo-session-plan",
          ),
        },
        {
          type: "result" as const,
          delay: 1000,
          data: createResultMessage("demo-session-plan", 85, 280),
        },
      ],
    };
  })(),
} as const;

// Helper to convert scenario to stream responses
export function scenarioToStream(
  scenarioKey: keyof typeof DEMO_SCENARIOS,
): MockScenarioStep[] {
  return [...DEMO_SCENARIOS[scenarioKey].steps] as MockScenarioStep[];
}
