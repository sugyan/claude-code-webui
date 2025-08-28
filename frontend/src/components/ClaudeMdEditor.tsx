import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  DocumentTextIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { getApiUrl } from "../config/api";

interface ClaudeMdEditorProps {
  isOpen: boolean;
  onClose: () => void;
  workingDirectory?: string;
}

export function ClaudeMdEditor({ isOpen, onClose, workingDirectory }: ClaudeMdEditorProps) {
  const { token } = useAuth();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && workingDirectory) {
      loadClaudeMd();
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

  const loadClaudeMd = async () => {
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
        if (data.success) {
          setContent(data.content || "");
          setHasChanges(false);
        } else {
          // File doesn't exist, start with empty content
          setContent("");
          setHasChanges(false);
        }
      } else if (response.status === 404) {
        // File doesn't exist, start with empty content
        setContent("");
        setHasChanges(false);
      } else {
        throw new Error(`Failed to load CLAUDE.md: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error loading CLAUDE.md:', err);
      setError(err instanceof Error ? err.message : 'Failed to load CLAUDE.md');
      // Start with empty content if loading fails
      setContent("");
      setHasChanges(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveClaudeMd = async () => {
    if (!workingDirectory || !hasChanges) return;

    try {
      setIsSaving(true);
      setError(null);

      const claudeMdPath = `${workingDirectory}/CLAUDE.md`;
      const response = await fetch(getApiUrl('/api/files/write'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filePath: claudeMdPath,
          content: content
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess('CLAUDE.md saved successfully!');
          setHasChanges(false);
        } else {
          throw new Error(data.error || 'Failed to save CLAUDE.md');
        }
      } else {
        throw new Error(`Failed to save CLAUDE.md: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error saving CLAUDE.md:', err);
      setError(err instanceof Error ? err.message : 'Failed to save CLAUDE.md');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(true);
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-base-100 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300/30 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-base-content">CLAUDE.md Editor</h2>
              <p className="text-sm text-base-content/60 font-mono">
                {workingDirectory ? `${workingDirectory}/CLAUDE.md` : 'No working directory'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Save Button */}
            <button
              onClick={saveClaudeMd}
              disabled={!hasChanges || isSaving}
              className="btn btn-primary btn-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
            
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-sm btn-square"
              title="Close Editor"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {(error || success) && (
          <div className="p-3 border-b border-base-300/30">
            {error && (
              <div className="alert alert-error alert-sm">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success alert-sm">
                <CheckIcon className="w-4 h-4" />
                <span className="text-sm">{success}</span>
              </div>
            )}
          </div>
        )}

        {/* Editor Content */}
        <div className="flex-1 h-full overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-sm text-base-content/60">Loading CLAUDE.md...</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Editor Toolbar */}
              <div className="p-3 border-b border-base-300/30 bg-base-200/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-base-content/60">
                    <InformationCircleIcon className="w-4 h-4" />
                    <span>Markdown Editor - Write documentation for your Claude Code project</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-base-content/60">
                    {hasChanges && (
                      <>
                        <div className="w-2 h-2 bg-warning rounded-full"></div>
                        <span>Unsaved changes</span>
                      </>
                    )}
                    <span>{content.length} characters</span>
                  </div>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 flex">
                <div className="flex-1 flex flex-col">
                  <div className="p-2 border-b border-base-300/30 bg-base-200/50">
                    <span className="text-xs font-medium text-base-content/70">Editor</span>
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="# Your Project Documentation

Welcome to your Claude Code project! Document your project here...

## Features

## Setup

## Usage

## Contributing
"
                    className="flex-1 w-full p-4 bg-base-100 border-none outline-none resize-none font-mono text-sm leading-relaxed"
                    style={{ minHeight: 'calc(100vh - 300px)' }}
                  />
                </div>

                {/* Live Preview */}
                <div className="flex-1 border-l border-base-300/30">
                  <div className="p-2 border-b border-base-300/30 bg-base-200/50">
                    <span className="text-xs font-medium text-base-content/70">Preview</span>
                  </div>
                  <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ 
                        __html: content
                          .replace(/^# (.*)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
                          .replace(/^## (.*)/gm, '<h2 class="text-xl font-semibold mb-3 mt-6">$1</h2>')
                          .replace(/^### (.*)/gm, '<h3 class="text-lg font-medium mb-2 mt-4">$1</h3>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/`([^`]+)`/g, '<code class="bg-base-200 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
                          .replace(/^- (.*)/gm, '<li class="ml-4">$1</li>')
                          .replace(/\n\n/g, '</p><p class="mb-3">')
                          .replace(/^(.*)$/gm, (match) => {
                            if (match.startsWith('<h') || match.startsWith('<li') || match.trim() === '') {
                              return match;
                            }
                            return `<p class="mb-3">${match}</p>`;
                          })
                      }}
                    />
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