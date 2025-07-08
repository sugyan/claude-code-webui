import {
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface PermissionDialogProps {
  isOpen: boolean;
  toolName: string;
  pattern: string;
  onAllow: () => void;
  onAllowPermanent: () => void;
  onDeny: () => void;
  onClose: () => void;
  // Optional extension point for custom button styling (e.g., demo effects)
  getButtonClassName?: (
    buttonType: "allow" | "allowPermanent" | "deny",
    defaultClassName: string,
  ) => string;
}

export function PermissionDialog({
  isOpen,
  toolName,
  pattern,
  onAllow,
  onAllowPermanent,
  onDeny,
  onClose,
  getButtonClassName = (_, defaultClassName) => defaultClassName, // Default: no modification
}: PermissionDialogProps) {
  if (!isOpen) return null;

  const handleDeny = () => {
    onDeny();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Permission Required
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {(() => {
            // Parse patterns to detect multiple commands
            const patterns = pattern.includes(", ")
              ? pattern.split(", ")
              : [pattern];
            const isMultipleCommands = patterns.length > 1;

            if (isMultipleCommands) {
              // Extract command names from patterns like "Bash(ls:*)" -> "ls"
              const commandNames = patterns.map((p) => {
                const match = p.match(/Bash\(([^:]+):/);
                return match ? match[1] : p;
              });

              return (
                <>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    Claude wants to use the following commands:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
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
              return (
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Claude wants to use the{" "}
                  <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm">
                    {pattern}
                  </span>{" "}
                  tool.
                </p>
              );
            }
          })()}
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Do you want to proceed?
          </p>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={onAllow}
              className={getButtonClassName(
                "allow",
                "w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md",
              )}
            >
              Yes
            </button>
            <button
              onClick={onAllowPermanent}
              className={getButtonClassName(
                "allowPermanent",
                "w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md",
              )}
            >
              {(() => {
                const patterns = pattern.includes(", ")
                  ? pattern.split(", ")
                  : [pattern];
                const isMultipleCommands = patterns.length > 1;

                // Extract command names from patterns like "Bash(ls:*)" -> "ls"
                const commandNames = patterns
                  .map((p) => {
                    const match = p.match(/Bash\(([^:]+):/);
                    return match ? match[1] : null;
                  })
                  .filter(Boolean);

                if (commandNames.length > 0) {
                  // Use command names if available
                  if (isMultipleCommands) {
                    return `Yes, and don't ask again for ${commandNames.join(" and ")} commands`;
                  } else {
                    return `Yes, and don't ask again for ${commandNames[0]} command`;
                  }
                } else {
                  // Fallback to tool name for non-Bash tools
                  return `Yes, and don't ask again for ${toolName}`;
                }
              })()}
            </button>
            <button
              onClick={handleDeny}
              className={getButtonClassName(
                "deny",
                "w-full px-4 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors",
              )}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
