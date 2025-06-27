import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { ProjectsResponse, ProjectInfo } from "../types";
import { getProjectsUrl } from "../config/api";

export function ProjectSelector() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(getProjectsUrl());
      if (!response.ok) {
        throw new Error(`Failed to load projects: ${response.statusText}`);
      }
      const data: ProjectsResponse = await response.json();
      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (projectPath: string) => {
    const normalizedPath = projectPath.startsWith("/")
      ? projectPath
      : `/${projectPath}`;
    navigate(`/projects${normalizedPath}`);
  };

  const handleNewDirectory = async () => {
    if (!window.showDirectoryPicker) {
      alert("Directory picker not supported in this browser");
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker();
      // Construct path from directory handle
      // Note: The actual path reconstruction might need adjustment based on browser capabilities
      const path = await getPathFromHandle(dirHandle);
      navigate(`/projects${path}`);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Failed to select directory:", err);
      }
    }
  };

  // Helper function to reconstruct path from directory handle
  // This is a simplified version - actual implementation may vary by browser
  const getPathFromHandle = async (
    handle: FileSystemDirectoryHandle,
  ): Promise<string> => {
    // For now, we'll use the handle name as the directory name
    // In a real implementation, you might need to reconstruct the full path
    // This is a browser limitation - full paths are not always available for security reasons
    const parts: string[] = [];
    const currentHandle: FileSystemDirectoryHandle | undefined = handle;

    while (currentHandle) {
      parts.unshift(currentHandle.name);
      // Note: This is a simplified approach
      // Getting parent directory is not directly supported in all browsers
      break;
    }

    // For local development, we'll prompt user to enter the full path
    const fullPath = prompt(
      `Please enter the full path for the selected directory "${handle.name}":`,
      `/Users/yo-sugi/dev/${handle.name}`,
    );

    return fullPath || `/${handle.name}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600 dark:text-slate-400">
          Loading projects...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-bold tracking-tight mb-8">
          Select a Project
        </h1>

        <div className="space-y-3">
          {projects.length > 0 && (
            <>
              <h2 className="text-slate-700 dark:text-slate-300 text-lg font-medium mb-4">
                Recent Projects
              </h2>
              {projects.map((project) => (
                <button
                  key={project.path}
                  onClick={() => handleProjectSelect(project.path)}
                  className="w-full flex items-center gap-3 p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-left"
                >
                  <FolderIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                  <span className="text-slate-800 dark:text-slate-200 font-mono text-sm">
                    {project.path}
                  </span>
                </button>
              ))}
              <div className="my-6 border-t border-slate-200 dark:border-slate-700" />
            </>
          )}

          <button
            onClick={handleNewDirectory}
            className="w-full flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors text-left"
          >
            <PlusIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              Select New Directory
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
