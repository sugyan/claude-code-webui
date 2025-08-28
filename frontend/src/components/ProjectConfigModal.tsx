import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  CodeBracketIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  CubeIcon,
  ServerIcon,
  BuildingLibraryIcon,
  CogIcon,
  TagIcon,
  UserGroupIcon,
  BeakerIcon,
  CloudIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { getApiUrl } from "../config/api";

interface ProjectConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workingDirectory?: string;
}

interface ProjectConfig {
  projectName: string;
  description: string;
  frontend: string;
  backend: string;
  architecture: string;
  database: string;
  deployment: string;
  testing: string;
  codeStyle: string;
  dependencies: string;
  team: string;
  version: string;
}

const defaultConfig: ProjectConfig = {
  projectName: "",
  description: "",
  frontend: "",
  backend: "",
  architecture: "",
  database: "",
  deployment: "",
  testing: "",
  codeStyle: "",
  dependencies: "",
  team: "",
  version: "1.0.0",
};

export function ProjectConfigModal({ isOpen, onClose, workingDirectory }: ProjectConfigModalProps) {
  const { token } = useAuth();
  const [config, setConfig] = useState<ProjectConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && workingDirectory) {
      loadProjectConfig();
    }
  }, [isOpen, workingDirectory]);

  useEffect(() => {
    // Clear messages after 3 seconds
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadProjectConfig = async () => {
    if (!workingDirectory) return;

    try {
      setIsLoading(true);
      setError(null);

      const claudeMdPath = `${workingDirectory}/CLAUDE.md`;
      const response = await fetch(getApiUrl('/api/files/read'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filePath: claudeMdPath 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          const parsedConfig = parseProjectConfig(data.content);
          setConfig({ ...defaultConfig, ...parsedConfig });
          setHasChanges(false);
        } else {
          // File doesn't exist or empty, use defaults
          setConfig(defaultConfig);
          setHasChanges(false);
        }
      } else if (response.status === 404) {
        // File doesn't exist, use defaults
        setConfig(defaultConfig);
        setHasChanges(false);
      } else {
        throw new Error(`Failed to load CLAUDE.md: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error loading project config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project configuration');
      // Use defaults on error
      setConfig(defaultConfig);
      setHasChanges(false);
    } finally {
      setIsLoading(false);
    }
  };

  const parseProjectConfig = (content: string): Partial<ProjectConfig> => {
    const config: Partial<ProjectConfig> = {};
    
    // Find the project description section
    const startMarker = '# Start Project Description';
    const endMarker = '# End Project Description';
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
      return config;
    }
    
    const section = content.slice(startIndex + startMarker.length, endIndex).trim();
    
    // Parse each field using regex
    const fields = {
      projectName: /\*\*Project Name\*\*:\s*(.+?)(?:\n|$)/,
      description: /\*\*Description\*\*:\s*([\s\S]*?)(?=\n\*\*|\n$|$)/,
      frontend: /\*\*Frontend\*\*:\s*(.+?)(?:\n|$)/,
      backend: /\*\*Backend\*\*:\s*(.+?)(?:\n|$)/,
      architecture: /\*\*Architecture\*\*:\s*(.+?)(?:\n|$)/,
      database: /\*\*Database\*\*:\s*(.+?)(?:\n|$)/,
      deployment: /\*\*Deployment\*\*:\s*(.+?)(?:\n|$)/,
      testing: /\*\*Testing\*\*:\s*(.+?)(?:\n|$)/,
      codeStyle: /\*\*Code Style\*\*:\s*([\s\S]*?)(?=\n\*\*|\n$|$)/,
      dependencies: /\*\*Dependencies\*\*:\s*([\s\S]*?)(?=\n\*\*|\n$|$)/,
      team: /\*\*Team\*\*:\s*(.+?)(?:\n|$)/,
      version: /\*\*Version\*\*:\s*(.+?)(?:\n|$)/,
    };

    for (const [key, regex] of Object.entries(fields)) {
      const match = section.match(regex);
      if (match && match[1]) {
        config[key as keyof ProjectConfig] = match[1].trim();
      }
    }

    return config;
  };

  const generateProjectConfigSection = (config: ProjectConfig): string => {
    return `# Start Project Description

**Project Name**: ${config.projectName}

**Description**: ${config.description}

**Frontend**: ${config.frontend}

**Backend**: ${config.backend}

**Architecture**: ${config.architecture}

**Database**: ${config.database}

**Deployment**: ${config.deployment}

**Testing**: ${config.testing}

**Code Style**: ${config.codeStyle}

**Dependencies**: ${config.dependencies}

**Team**: ${config.team}

**Version**: ${config.version}

# End Project Description`;
  };

  const saveProjectConfig = async () => {
    if (!workingDirectory || !hasChanges) return;

    try {
      setIsSaving(true);
      setError(null);

      const claudeMdPath = `${workingDirectory}/CLAUDE.md`;
      
      // First, read the existing content
      let existingContent = "";
      const readResponse = await fetch(getApiUrl('/api/files/read'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filePath: claudeMdPath 
        }),
      });

      if (readResponse.ok) {
        const readData = await readResponse.json();
        if (readData.success) {
          existingContent = readData.content || "";
        }
      }

      // Generate the new project config section
      const newConfigSection = generateProjectConfigSection(config);

      // Replace or insert the project description section
      const startMarker = '# Start Project Description';
      const endMarker = '# End Project Description';
      
      const startIndex = existingContent.indexOf(startMarker);
      const endIndex = existingContent.indexOf(endMarker);

      let newContent = "";
      
      if (startIndex !== -1 && endIndex !== -1) {
        // Replace existing section
        const beforeSection = existingContent.slice(0, startIndex);
        const afterSection = existingContent.slice(endIndex + endMarker.length);
        newContent = beforeSection + newConfigSection + afterSection;
      } else {
        // Insert new section at the beginning
        if (existingContent.trim()) {
          newContent = newConfigSection + "\n\n" + existingContent;
        } else {
          newContent = newConfigSection + "\n\n# Project Documentation\n\nAdd your project documentation here...\n";
        }
      }

      // Write the updated content back
      const writeResponse = await fetch(getApiUrl('/api/files/write'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filePath: claudeMdPath,
          content: newContent
        }),
      });

      if (writeResponse.ok) {
        const writeData = await writeResponse.json();
        if (writeData.success) {
          setSuccess('Project configuration saved to CLAUDE.md successfully!');
          setHasChanges(false);
        } else {
          throw new Error(writeData.error || 'Failed to save project configuration');
        }
      } else {
        throw new Error(`Failed to save project configuration: ${writeResponse.statusText}`);
      }
    } catch (err) {
      console.error('Error saving project config:', err);
      setError(err instanceof Error ? err.message : 'Failed to save project configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProjectConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    onClose();
  };

  const formFields = [
    { key: 'projectName', label: 'Project Name', icon: TagIcon, placeholder: 'Enter project name...', type: 'input' },
    { key: 'description', label: 'Description', icon: DocumentTextIcon, placeholder: 'Describe what this project does...', type: 'textarea' },
    { key: 'frontend', label: 'Frontend', icon: CubeIcon, placeholder: 'React, Vue, Angular, etc.', type: 'input' },
    { key: 'backend', label: 'Backend', icon: ServerIcon, placeholder: 'Node.js, Python, Go, etc.', type: 'input' },
    { key: 'architecture', label: 'Architecture', icon: BuildingLibraryIcon, placeholder: 'Microservices, Monolith, Serverless, etc.', type: 'input' },
    { key: 'database', label: 'Database', icon: CogIcon, placeholder: 'PostgreSQL, MongoDB, Redis, etc.', type: 'input' },
    { key: 'deployment', label: 'Deployment', icon: CloudIcon, placeholder: 'Docker, Kubernetes, AWS, etc.', type: 'input' },
    { key: 'testing', label: 'Testing', icon: BeakerIcon, placeholder: 'Jest, Cypress, Pytest, etc.', type: 'input' },
    { key: 'codeStyle', label: 'Code Style', icon: CodeBracketIcon, placeholder: 'Coding standards, linting rules, formatting guidelines...', type: 'textarea' },
    { key: 'dependencies', label: 'Dependencies', icon: CubeIcon, placeholder: 'Key libraries and frameworks used...', type: 'textarea' },
    { key: 'team', label: 'Team', icon: UserGroupIcon, placeholder: 'Team members and roles...', type: 'input' },
    { key: 'version', label: 'Version', icon: TagIcon, placeholder: '1.0.0', type: 'input' },
  ] as const;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[95vh] m-4 bg-base-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300/30 bg-gradient-to-r from-accent/10 to-secondary/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-accent to-secondary rounded-xl shadow-lg">
              <CodeBracketIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Project Configuration
              </h2>
              <p className="text-sm text-base-content/60 font-mono">
                {workingDirectory ? `Configure ${workingDirectory.split('/').pop()}` : 'No working directory'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Save Button */}
            <button
              onClick={saveProjectConfig}
              disabled={!hasChanges || isSaving}
              className="btn btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  <span>Save to CLAUDE.md</span>
                </>
              )}
            </button>
            
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-square"
              title="Close Configuration"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {(error || success) && (
          <div className="p-4 border-b border-base-300/30">
            {error && (
              <div className="alert alert-error mb-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success mb-2">
                <CheckIcon className="w-5 h-5" />
                <span>{success}</span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <span className="loading loading-spinner loading-lg text-accent"></span>
                <p className="text-sm text-base-content/60">Loading project configuration...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Form Header */}
              <div className="flex-shrink-0 p-4 border-b border-base-300/30 bg-base-200/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <InformationCircleIcon className="w-5 h-5 text-accent" />
                    <span className="text-sm font-medium text-base-content/80">
                      Configure your project details - saved to CLAUDE.md
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-base-content/60">
                    {hasChanges && (
                      <>
                        <div className="w-2 h-2 bg-warning rounded-full"></div>
                        <span>Unsaved changes</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {formFields.map((field) => {
                    const Icon = field.icon;
                    const isTextarea = field.type === 'textarea';
                    
                    return (
                      <div key={field.key} className={isTextarea ? 'lg:col-span-2' : ''}>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium flex items-center gap-2">
                              <Icon className="w-4 h-4 text-accent" />
                              {field.label}
                            </span>
                          </label>
                          {isTextarea ? (
                            <textarea
                              value={config[field.key]}
                              onChange={(e) => handleInputChange(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="textarea textarea-bordered textarea-lg resize-none h-24 bg-base-100 border-base-300/50 focus:border-accent/50 focus:bg-base-50 transition-all duration-300"
                              rows={3}
                            />
                          ) : (
                            <input
                              type="text"
                              value={config[field.key]}
                              onChange={(e) => handleInputChange(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="input input-bordered bg-base-100 border-base-300/50 focus:border-accent/50 focus:bg-base-50 transition-all duration-300"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Preview Section */}
                <div className="mt-8 p-6 bg-gradient-to-br from-base-200/30 to-base-300/20 rounded-xl border border-base-300/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-accent" />
                    Preview (How it will appear in CLAUDE.md)
                  </h3>
                  <div className="bg-base-100 p-4 rounded-lg border border-base-300/30 font-mono text-sm overflow-x-auto">
                    <pre className="whitespace-pre-wrap text-base-content/80">
                      {generateProjectConfigSection(config)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}