import {
  SunIcon,
  MoonIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
import { useSettings } from "../../hooks/useSettings";

export function GeneralSettings() {
  const { theme, enterBehavior, toggleTheme, toggleEnterBehavior } =
    useSettings();

  return (
    <div className="space-y-6">
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" className="sr-only" id="settings-announcements">
        {theme === "light" ? "Light mode enabled" : "Dark mode enabled"}.{" "}
        {enterBehavior === "send"
          ? "Enter key sends messages"
          : "Enter key creates newlines"}
        .
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">
          General Settings
        </h3>

        {/* Theme Setting */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Theme
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-left flex-1"
                role="switch"
                aria-checked={theme === "dark"}
                aria-label={`Theme toggle. Currently set to ${theme} mode. Click to switch to ${theme === "light" ? "dark" : "light"} mode.`}
              >
                {theme === "light" ? (
                  <SunIcon className="w-5 h-5 text-yellow-500" />
                ) : (
                  <MoonIcon className="w-5 h-5 text-blue-400" />
                )}
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {theme === "light" ? "Light Mode" : "Dark Mode"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Click to switch to {theme === "light" ? "dark" : "light"}{" "}
                    mode
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Enter Behavior Setting */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Enter Key Behavior
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleEnterBehavior}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-left flex-1"
                role="switch"
                aria-checked={enterBehavior === "send"}
                aria-label={`Enter key behavior toggle. Currently set to ${enterBehavior === "send" ? "send message" : "newline"}. Click to switch behavior.`}
              >
                <CommandLineIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {enterBehavior === "send"
                      ? "Enter to Send"
                      : "Enter for Newline"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {enterBehavior === "send"
                      ? "Enter sends message, Shift+Enter for newline"
                      : "Enter adds newline, Shift+Enter sends message"}
                  </div>
                </div>
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Controls how the Enter key behaves when typing messages in the
              chat input.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
