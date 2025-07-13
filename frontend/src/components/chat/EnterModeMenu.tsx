import { useState, useRef, useEffect } from "react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/solid";
import { useEnterBehavior } from "../../hooks/useEnterBehavior";

export function EnterModeMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { enterBehavior, toggleEnterBehavior } = useEnterBehavior();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleToggle = () => {
    toggleEnterBehavior();
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        title="Enter key behavior settings"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <EllipsisHorizontalIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={handleToggle}
            className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full text-left whitespace-nowrap"
          >
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {enterBehavior === "send" ? "Enter: Send" : "Enter: Newline"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              (click to toggle)
            </span>
          </button>
          <div className="px-4 py-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
            {enterBehavior === "send"
              ? "Shift+Enter for newline"
              : "Shift+Enter to send"}
          </div>
        </div>
      )}
    </div>
  );
}
