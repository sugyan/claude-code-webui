import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../hooks/useTheme";
import { ThemeToggle } from "./chat/ThemeToggle";

export function HistoryPage() {
  const navigate = useNavigate();
  const { projectPath } = useParams<{ projectPath: string }>();
  const { theme, toggleTheme } = useTheme();

  const handleBack = () => {
    const normalizedPath = projectPath?.startsWith("/")
      ? projectPath
      : `/${projectPath}`;
    navigate(`/projects${normalizedPath}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-6 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
              aria-label="Back to chat"
            >
              <ChevronLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-bold tracking-tight">
                Conversation History
              </h1>
              {projectPath && (
                <p className="text-slate-600 dark:text-slate-400 text-sm font-mono mt-1">
                  {projectPath}
                </p>
              )}
            </div>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-400 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-slate-800 dark:text-slate-100 text-xl font-semibold mb-2">
              History Feature Coming Soon
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm">
              Conversation history listing and navigation functionality will be
              available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
