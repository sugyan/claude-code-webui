import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { JSX } from "react";
import { useState } from "react";

// Helper function to extract command name from pattern like "Bash(ls:*)" -> "ls"
function extractCommandName(pattern: string): string {
  if (!pattern) return "Unknown";
  const match = pattern.match(/Bash\(([^:]+):/);
  return match ? match[1] : pattern;
}

// Helper function to render permission content based on patterns
function renderPermissionContent(patterns: string[]): JSX.Element {
  // Handle empty patterns array
  if (patterns.length === 0) {
    return (
      <p className="text-slate-600 dark:text-slate-300 mb-3">
        Claude wants to use bash commands, but the specific commands could not
        be determined.
      </p>
    );
  }

  const isMultipleCommands = patterns.length > 1;

  if (isMultipleCommands) {
    // Extract command names from patterns like "Bash(ls:*)" -> "ls"
    const commandNames = patterns.map(extractCommandName);

    return (
      <>
        <p className="text-slate-600 dark:text-slate-300 mb-2">
          Claude wants to use the following commands:
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {commandNames.map((cmd, index) => (
            <span
              key={index}
              className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm"
            >
              {cmd}
            </span>
          ))}
        </div>
      </>
    );
  } else {
    const commandName = extractCommandName(patterns[0]);
    return (
      <p className="text-slate-600 dark:text-slate-300 mb-3">
        Claude wants to use the{" "}
        <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm">
          {commandName}
        </span>{" "}
        command.
      </p>
    );
  }
}

// Helper function to render button text for permanent permission
function renderPermanentButtonText(patterns: string[]): string {
  // Handle empty patterns array
  if (patterns.length === 0) {
    return "Yes, and don't ask again for bash commands";
  }

  const isMultipleCommands = patterns.length > 1;
  const commandNames = patterns.map(extractCommandName);

  if (isMultipleCommands) {
    return `Yes, and don't ask again for ${commandNames.join(" and ")} commands`;
  } else {
    return `Yes, and don't ask again for ${commandNames[0]} command`;
  }
}

interface PermissionInputPanelProps {
  patterns: string[];
  onAllow: () => void;
  onAllowPermanent: () => void;
  onDeny: () => void;
  // Optional extension point for custom button styling (e.g., demo effects)
  getButtonClassName?: (
    buttonType: "allow" | "allowPermanent" | "deny",
    defaultClassName: string,
  ) => string;
}

export function PermissionInputPanel({
  patterns,
  onAllow,
  onAllowPermanent,
  onDeny,
  getButtonClassName = (_, defaultClassName) => defaultClassName, // Default: no modification
}: PermissionInputPanelProps) {
  const [selectedOption, setSelectedOption] = useState<
    "allow" | "allowPermanent" | "deny"
  >("allow");
  return (
    <div className="flex-shrink-0 px-4 py-4 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl backdrop-blur-sm shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Permission Required
        </h3>
      </div>

      {/* Content */}
      <div className="mb-4">
        {renderPermissionContent(patterns)}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Do you want to proceed? (Press ESC to deny)
        </p>
      </div>

      {/* Direct-click permission options with selection state */}
      <div className="space-y-2">
        <button
          onClick={() => {
            setSelectedOption("allow");
            onAllow();
          }}
          onMouseEnter={() => setSelectedOption("allow")}
          className={getButtonClassName(
            "allow",
            `w-full p-3 rounded-lg cursor-pointer transition-all duration-200 text-left ${
              selectedOption === "allow"
                ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400 shadow-sm"
                : "border-2 border-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-sm"
            }`,
          )}
        >
          <span
            className={`text-sm font-medium ${
              selectedOption === "allow"
                ? "text-blue-700 dark:text-blue-300"
                : "text-slate-700 dark:text-slate-300"
            }`}
          >
            Yes
          </span>
        </button>

        <button
          onClick={() => {
            setSelectedOption("allowPermanent");
            onAllowPermanent();
          }}
          onMouseEnter={() => setSelectedOption("allowPermanent")}
          className={getButtonClassName(
            "allowPermanent",
            `w-full p-3 rounded-lg cursor-pointer transition-all duration-200 text-left ${
              selectedOption === "allowPermanent"
                ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400 shadow-sm"
                : "border-2 border-transparent hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 dark:hover:border-green-400 hover:shadow-sm"
            }`,
          )}
        >
          <span
            className={`text-sm font-medium ${
              selectedOption === "allowPermanent"
                ? "text-green-700 dark:text-green-300"
                : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {renderPermanentButtonText(patterns)}
          </span>
        </button>

        <button
          onClick={() => {
            setSelectedOption("deny");
            onDeny();
          }}
          onMouseEnter={() => setSelectedOption("deny")}
          className={getButtonClassName(
            "deny",
            `w-full p-3 rounded-lg cursor-pointer transition-all duration-200 text-left ${
              selectedOption === "deny"
                ? "bg-slate-50 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-500 shadow-sm"
                : "border-2 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm"
            }`,
          )}
        >
          <span
            className={`text-sm font-medium ${
              selectedOption === "deny"
                ? "text-slate-800 dark:text-slate-200"
                : "text-slate-700 dark:text-slate-300"
            }`}
          >
            No
          </span>
        </button>
      </div>
    </div>
  );
}
