import { CommandLineIcon } from "@heroicons/react/24/outline";
import { useEnterBehavior } from "../../hooks/useEnterBehavior";

export function EnterBehaviorToggle() {
  const { enterBehavior, toggleEnterBehavior } = useEnterBehavior();

  return (
    <button
      onClick={toggleEnterBehavior}
      className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
      title={`Currently: ${enterBehavior === "send" ? "Enter to send, Shift+Enter for newline" : "Enter for newline, Shift+Enter to send"}`}
    >
      <CommandLineIcon className="w-4 h-4" />
      <span className="text-sm font-medium">
        {enterBehavior === "send" ? "Enter: Send" : "Enter: Newline"}
      </span>
    </button>
  );
}
