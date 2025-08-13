import { useState, useEffect, useCallback } from "react";

interface PlanPermissionInputPanelProps {
  onAcceptWithEdits: () => void;
  onAcceptDefault: () => void;
  onKeepPlanning: () => void;
  // Optional extension point for custom button styling (e.g., demo effects)
  getButtonClassName?: (
    buttonType: "acceptWithEdits" | "acceptDefault" | "keepPlanning",
    defaultClassName: string,
  ) => string;
  // Optional callback for demo automation to control selection state
  onSelectionChange?: (
    selection: "acceptWithEdits" | "acceptDefault" | "keepPlanning",
  ) => void;
  // Optional external control for demo automation (overrides internal state)
  externalSelectedOption?:
    | "acceptWithEdits"
    | "acceptDefault"
    | "keepPlanning"
    | null;
}

export function PlanPermissionInputPanel({
  onAcceptWithEdits,
  onAcceptDefault,
  onKeepPlanning,
  getButtonClassName = (_, defaultClassName) => defaultClassName, // Default: no modification
  onSelectionChange, // Optional callback for demo automation
  externalSelectedOption, // Optional external control for demo automation
}: PlanPermissionInputPanelProps) {
  const [selectedOption, setSelectedOption] = useState<
    "acceptWithEdits" | "acceptDefault" | "keepPlanning" | null
  >("acceptWithEdits");

  // Check if component is externally controlled (for demo mode)
  const isExternallyControlled = externalSelectedOption !== undefined;

  // Use external selection if provided (for demo), otherwise use internal state
  const effectiveSelectedOption = externalSelectedOption ?? selectedOption;

  // Update selection state based on external changes (for demo automation)
  const updateSelectedOption = useCallback(
    (option: "acceptWithEdits" | "acceptDefault" | "keepPlanning") => {
      // Only update internal state if not controlled externally
      if (externalSelectedOption === undefined) {
        setSelectedOption(option);
      }
      onSelectionChange?.(option);
    },
    [onSelectionChange, externalSelectedOption],
  );

  // Handle keyboard navigation
  useEffect(() => {
    // Skip keyboard navigation if controlled externally (demo mode)
    if (externalSelectedOption !== undefined) return;

    // Define options array inside useEffect to avoid unnecessary re-renders
    const options = [
      "acceptWithEdits",
      "acceptDefault",
      "keepPlanning",
    ] as const;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = options.indexOf(effectiveSelectedOption!);
        const nextIndex = (currentIndex + 1) % options.length;
        updateSelectedOption(options[nextIndex]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = options.indexOf(effectiveSelectedOption!);
        const prevIndex = (currentIndex - 1 + options.length) % options.length;
        updateSelectedOption(options[prevIndex]);
      } else if (e.key === "Enter" && effectiveSelectedOption) {
        e.preventDefault();
        // Execute the currently selected option
        if (effectiveSelectedOption === "acceptWithEdits") {
          onAcceptWithEdits();
        } else if (effectiveSelectedOption === "acceptDefault") {
          onAcceptDefault();
        } else if (effectiveSelectedOption === "keepPlanning") {
          onKeepPlanning();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onKeepPlanning(); // "Keep planning" option when ESC is pressed
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    effectiveSelectedOption,
    onAcceptDefault,
    onAcceptWithEdits,
    onKeepPlanning,
    updateSelectedOption,
    externalSelectedOption,
  ]);

  return (
    <div className="flex-shrink-0 px-4 py-4 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl backdrop-blur-sm shadow-sm">
      {/* Content */}
      <div className="mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose how to proceed (Press ESC to keep planning)
        </p>
      </div>

      {/* Permission options with selection state */}
      <div className="space-y-2">
        <button
          onClick={() => {
            updateSelectedOption("acceptWithEdits");
            onAcceptWithEdits();
          }}
          onFocus={() => updateSelectedOption("acceptWithEdits")}
          onBlur={() => {
            if (!isExternallyControlled) {
              setSelectedOption(null);
            }
          }}
          onMouseEnter={() => updateSelectedOption("acceptWithEdits")}
          onMouseLeave={() => {
            if (!isExternallyControlled) {
              setSelectedOption(null);
            }
          }}
          className={getButtonClassName(
            "acceptWithEdits",
            `w-full p-3 rounded-lg cursor-pointer transition-all duration-200 text-left focus:outline-none ${
              effectiveSelectedOption === "acceptWithEdits"
                ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400 shadow-sm"
                : "border-2 border-transparent"
            }`,
          )}
        >
          <span
            className={`text-sm font-medium ${
              effectiveSelectedOption === "acceptWithEdits"
                ? "text-green-700 dark:text-green-300"
                : "text-slate-700 dark:text-slate-300"
            }`}
          >
            Yes, and auto-accept edits
          </span>
        </button>

        <button
          onClick={() => {
            updateSelectedOption("acceptDefault");
            onAcceptDefault();
          }}
          onFocus={() => updateSelectedOption("acceptDefault")}
          onBlur={() => {
            if (!isExternallyControlled) {
              setSelectedOption(null);
            }
          }}
          onMouseEnter={() => updateSelectedOption("acceptDefault")}
          onMouseLeave={() => {
            if (!isExternallyControlled) {
              setSelectedOption(null);
            }
          }}
          className={getButtonClassName(
            "acceptDefault",
            `w-full p-3 rounded-lg cursor-pointer transition-all duration-200 text-left focus:outline-none ${
              effectiveSelectedOption === "acceptDefault"
                ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400 shadow-sm"
                : "border-2 border-transparent"
            }`,
          )}
        >
          <span
            className={`text-sm font-medium ${
              effectiveSelectedOption === "acceptDefault"
                ? "text-blue-700 dark:text-blue-300"
                : "text-slate-700 dark:text-slate-300"
            }`}
          >
            Yes, and manually approve edits
          </span>
        </button>

        <button
          onClick={() => {
            updateSelectedOption("keepPlanning");
            onKeepPlanning();
          }}
          onFocus={() => updateSelectedOption("keepPlanning")}
          onBlur={() => {
            if (!isExternallyControlled) {
              setSelectedOption(null);
            }
          }}
          onMouseEnter={() => updateSelectedOption("keepPlanning")}
          onMouseLeave={() => {
            if (!isExternallyControlled) {
              setSelectedOption(null);
            }
          }}
          className={getButtonClassName(
            "keepPlanning",
            `w-full p-3 rounded-lg cursor-pointer transition-all duration-200 text-left focus:outline-none ${
              effectiveSelectedOption === "keepPlanning"
                ? "bg-slate-50 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-500 shadow-sm"
                : "border-2 border-transparent"
            }`,
          )}
        >
          <span
            className={`text-sm font-medium ${
              effectiveSelectedOption === "keepPlanning"
                ? "text-slate-800 dark:text-slate-200"
                : "text-slate-700 dark:text-slate-300"
            }`}
          >
            No, keep planning
          </span>
        </button>
      </div>
    </div>
  );
}
