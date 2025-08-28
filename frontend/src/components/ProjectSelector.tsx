import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderIcon, UserIcon, ArrowRightOnRectangleIcon, HomeIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { ProjectsResponse, ProjectInfo } from "../types";
import { getProjectsUrl } from "../config/api";
import { SettingsButton } from "./SettingsButton";
import { SettingsModal } from "./SettingsModal";
import { CreateProjectModal } from "./CreateProjectModal";
import { UserSwitcher } from "./UserSwitcher";
import { useAuth } from "../contexts/AuthContext";

export function ProjectSelector() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getProjectsUrl(), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
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

  const handleLogout = async () => {
    try {
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      // Force logout even if API call fails
      logout();
      navigate('/login');
    }
  };

  const handleProjectSelect = (projectPath: string) => {
    const normalizedPath = projectPath.startsWith("/")
      ? projectPath
      : `/${projectPath}`;
    navigate(`/projects${normalizedPath}`);
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleCreateProject = () => {
    setIsCreateProjectOpen(true);
  };

  const handleCreateProjectClose = () => {
    setIsCreateProjectOpen(false);
  };

  const handleProjectCreated = () => {
    // Reload projects after successful creation
    loadProjects();
    setIsCreateProjectOpen(false);
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
    <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300 relative">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-6">
        {/* Header with User Info */}
        <div className="backdrop-blur-xl bg-base-100/80 border border-base-300/50 rounded-2xl shadow-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur-sm opacity-60 animate-pulse" />
                <div className="relative bg-base-100 rounded-xl p-3 shadow-lg">
                  <UserIcon className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Welcome, {user?.username}
                </h1>
                <p className="text-base-content/70 text-sm flex items-center gap-2">
                  <HomeIcon className="w-4 h-4" />
                  {user?.homeDirectory}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateProject}
                className="btn btn-primary btn-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                title="Create New Project"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">New Project</span>
                </div>
              </button>
              <UserSwitcher onUserSwitch={(targetUser) => {
                console.log(`User switch requested: ${targetUser}`);
                // You could implement actual user switching logic here
              }} />
              <SettingsButton onClick={handleSettingsClick} />
              <button
                onClick={handleLogout}
                className="btn btn-ghost btn-sm flex items-center gap-2 hover:bg-error/10 hover:text-error transition-all duration-300"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Projects Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-base-content mb-2">
            Select a Project
          </h2>
          <p className="text-base-content/70">
            Choose from your available projects in <span className="font-mono text-sm">{user?.projectsPath}</span>
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.length > 0 ? (
            projects.map((project, index) => (
              <div
                key={project.path}
                className="group backdrop-blur-xl bg-base-100/60 border border-base-300/30 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => handleProjectSelect(project.path)}
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animation: 'fadeInUp 0.6s ease-out forwards',
                  opacity: 0,
                }}
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity" />
                      <div className="relative bg-base-100/80 rounded-lg p-2">
                        <FolderIcon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base-content truncate group-hover:text-primary transition-colors">
                        {project.path.split('/').pop() || project.path}
                      </h3>
                      <p className="text-xs text-base-content/60 font-mono truncate">
                        {project.path}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-base-content/50 space-y-1">
                    <div className="flex justify-between">
                      <span>Type</span>
                      <span className="font-medium">Project</span>
                    </div>
                    <div className="flex justify-between">
                      <span>User</span>
                      <span className="font-medium">{user?.username}</span>
                    </div>
                  </div>
                  
                  {/* Hover effect gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <div className="backdrop-blur-xl bg-base-100/60 border border-base-300/30 rounded-xl shadow-lg p-8 text-center">
                <FolderIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-base-content mb-2">
                  No Projects Found
                </h3>
                <p className="text-base-content/70 mb-4">
                  No projects found in your directory. Create a new project or check your permissions.
                </p>
                <button
                  onClick={loadProjects}
                  className="btn btn-primary btn-sm"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings Modal */}
        <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />
        
        {/* Create Project Modal */}
        <CreateProjectModal 
          isOpen={isCreateProjectOpen} 
          onClose={handleCreateProjectClose}
          onProjectCreated={handleProjectCreated}
          userHomeDirectory={user?.homeDirectory || ''}
        />
      </div>
    </div>
  );
}
