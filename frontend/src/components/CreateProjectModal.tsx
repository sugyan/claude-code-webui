import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  FolderIcon, 
  SparklesIcon, 
  DocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FolderPlusIcon
} from '@heroicons/react/24/outline';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
  userHomeDirectory: string;
}

export function CreateProjectModal({ isOpen, onClose, onProjectCreated, userHomeDirectory }: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [error, setError] = useState('');

  // Auto-generate project path when name changes
  useEffect(() => {
    if (projectName.trim()) {
      // Clean project name for use in path
      const cleanName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '');
      
      const suggestedPath = `${userHomeDirectory}/projects/${cleanName}`;
      setProjectPath(suggestedPath);
      
      // Auto-validate the path
      if (cleanName) {
        validatePath(suggestedPath);
      }
    } else {
      setProjectPath('');
      setValidationStatus('idle');
      setValidationMessage('');
    }
  }, [projectName, userHomeDirectory]);

  const validatePath = async (path: string) => {
    if (!path.trim()) {
      setValidationStatus('idle');
      setValidationMessage('');
      return;
    }

    setValidationStatus('validating');
    setValidationMessage('Checking path accessibility...');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/projects/validate-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ path }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.valid) {
          setValidationStatus('valid');
          setValidationMessage(result.exists ? 'Directory exists and is accessible' : 'Path is valid and accessible');
        } else {
          setValidationStatus('invalid');
          setValidationMessage(result.message || 'Path is not accessible');
        }
      } else {
        setValidationStatus('error');
        setValidationMessage(result.error || 'Failed to validate path');
      }
    } catch (error) {
      setValidationStatus('error');
      setValidationMessage('Network error while validating path');
    }
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPath = e.target.value;
    setProjectPath(newPath);
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      validatePath(newPath);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim() || !projectPath.trim()) {
      setError('Please provide both project name and path');
      return;
    }

    if (validationStatus !== 'valid') {
      setError('Please ensure the project path is valid and accessible');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: projectName.trim(),
          path: projectPath.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onProjectCreated();
        resetForm();
      } else {
        setError(result.error || result.message || 'Failed to create project');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Network error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setProjectName('');
    setProjectPath('');
    setValidationStatus('idle');
    setValidationMessage('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg">
        {/* Glassmorphism modal */}
        <div className="backdrop-blur-xl bg-base-100/90 border border-base-300/50 rounded-2xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur-sm opacity-60 animate-pulse" />
                <div className="relative bg-base-100 rounded-xl p-3 shadow-lg">
                  <FolderPlusIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Create New Project
                </h2>
                <p className="text-sm text-base-content/70">
                  Set up a new Claude Code project with CLAUDE.md
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-sm btn-circle hover:bg-base-300 transition-colors"
              disabled={isCreating}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Name */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4" />
                  Project Name
                </span>
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="input input-bordered bg-base-100/50 border-base-300/50 focus:border-primary/50 focus:bg-base-100/70 transition-all duration-300"
                placeholder="My Awesome Project"
                disabled={isCreating}
              />
            </div>

            {/* Project Path */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <FolderIcon className="w-4 h-4" />
                  Project Path
                  {validationStatus === 'validating' && (
                    <span className="loading loading-spinner loading-xs"></span>
                  )}
                </span>
              </label>
              <input
                type="text"
                value={projectPath}
                onChange={handlePathChange}
                className={`input input-bordered bg-base-100/50 border-base-300/50 focus:border-primary/50 focus:bg-base-100/70 transition-all duration-300 ${
                  validationStatus === 'valid' ? 'input-success' : 
                  validationStatus === 'invalid' || validationStatus === 'error' ? 'input-error' : ''
                }`}
                placeholder={`${userHomeDirectory}/projects/my-project`}
                disabled={isCreating}
              />
              
              {/* Validation Message */}
              {validationMessage && (
                <div className={`label ${
                  validationStatus === 'valid' ? 'text-success' : 
                  validationStatus === 'invalid' || validationStatus === 'error' ? 'text-error' : 
                  'text-base-content/70'
                }`}>
                  <span className="label-text-alt flex items-center gap-1">
                    {validationStatus === 'valid' && <CheckCircleIcon className="w-3 h-3" />}
                    {(validationStatus === 'invalid' || validationStatus === 'error') && <ExclamationTriangleIcon className="w-3 h-3" />}
                    {validationMessage}
                  </span>
                </div>
              )}
            </div>

            {/* Features info */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-4">
              <h4 className="font-medium text-info mb-2 flex items-center gap-2">
                <DocumentIcon className="w-4 h-4" />
                What will be created:
              </h4>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• Project directory at the specified path</li>
                <li>• CLAUDE.md file with project template</li>
                <li>• Proper permissions for your user account</li>
                <li>• Integration with Claude Code CLI</li>
              </ul>
            </div>

            {/* Error Message */}
            {error && (
              <div className="alert alert-error bg-error/10 border-error/20">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-ghost"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !projectName.trim() || !projectPath.trim() || validationStatus !== 'valid'}
                className="btn btn-primary relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-2">
                  {isCreating ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <FolderPlusIcon className="w-4 h-4" />
                      <span>Create Project</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}