import React, { useRef, useEffect, useState } from "react";
import { StopIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { UI_CONSTANTS, KEYBOARD_SHORTCUTS } from "../../utils/constants";
import { useEnterBehavior } from "../../hooks/useSettings";
import { PermissionInputPanel } from "./PermissionInputPanel";
import { PlanPermissionInputPanel } from "./PlanPermissionInputPanel";
import type { PermissionMode } from "../../types";
import type { ImageData } from "../../../../shared/types";
import { 
  validateImageFiles, 
  fileToImageData, 
  formatFileSize,
  type ImageValidationError 
} from "../../utils/imageUtils";

interface PermissionData {
  patterns: string[];
  onAllow: () => void;
  onAllowPermanent: () => void;
  onDeny: () => void;
  getButtonClassName?: (
    buttonType: "allow" | "allowPermanent" | "deny",
    defaultClassName: string,
  ) => string;
  onSelectionChange?: (selection: "allow" | "allowPermanent" | "deny") => void;
  externalSelectedOption?: "allow" | "allowPermanent" | "deny" | null;
}

interface PlanPermissionData {
  onAcceptWithEdits: () => void;
  onAcceptDefault: () => void;
  onKeepPlanning: () => void;
  getButtonClassName?: (
    buttonType: "acceptWithEdits" | "acceptDefault" | "keepPlanning",
    defaultClassName: string,
  ) => string;
  onSelectionChange?: (
    selection: "acceptWithEdits" | "acceptDefault" | "keepPlanning",
  ) => void;
  externalSelectedOption?:
    | "acceptWithEdits"
    | "acceptDefault"
    | "keepPlanning"
    | null;
}

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  currentRequestId: string | null;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onAbort: () => void;
  // Permission mode props
  permissionMode: PermissionMode;
  onPermissionModeChange: (mode: PermissionMode) => void;
  showPermissions?: boolean;
  permissionData?: PermissionData;
  planPermissionData?: PlanPermissionData;
  // Image upload props
  images?: ImageData[];
  onImagesChange?: (images: ImageData[]) => void;
}

export function ChatInput({
  input,
  isLoading,
  currentRequestId,
  onInputChange,
  onSubmit,
  onAbort,
  permissionMode,
  onPermissionModeChange,
  showPermissions = false,
  permissionData,
  planPermissionData,
  images = [],
  onImagesChange,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<ImageValidationError[]>([]);
  const { enterBehavior } = useEnterBehavior();

  // Focus input when not loading and not in permission mode
  useEffect(() => {
    if (!isLoading && !showPermissions && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, showPermissions]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const computedStyle = getComputedStyle(textarea);
      const maxHeight =
        parseInt(computedStyle.maxHeight, 10) ||
        UI_CONSTANTS.TEXTAREA_MAX_HEIGHT;
      const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Permission mode toggle: Ctrl+Shift+M (all platforms)
    if (
      e.key === KEYBOARD_SHORTCUTS.PERMISSION_MODE_TOGGLE &&
      e.shiftKey &&
      e.ctrlKey &&
      !e.metaKey && // Avoid conflicts with browser shortcuts on macOS
      !isComposing
    ) {
      e.preventDefault();
      onPermissionModeChange(getNextPermissionMode(permissionMode));
      return;
    }

    if (e.key === KEYBOARD_SHORTCUTS.SUBMIT && !isComposing) {
      if (enterBehavior === "newline") {
        handleNewlineModeKeyDown(e);
      } else {
        handleSendModeKeyDown(e);
      }
    }
  };

  const handleNewlineModeKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    // Newline mode: Enter adds newline, Shift+Enter sends
    if (e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
    // Enter is handled naturally by textarea (adds newline)
  };

  const handleSendModeKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    // Send mode: Enter sends, Shift+Enter adds newline
    if (!e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
    // Shift+Enter is handled naturally by textarea (adds newline)
  };
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    // Add small delay to handle race condition between composition and keydown events
    setTimeout(() => setIsComposing(false), 0);
  };

  // Image handling functions
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || !onImagesChange) return;
    
    const fileArray = Array.from(files);
    const { validFiles, errors } = validateImageFiles(fileArray, images.length);
    
    setUploadErrors(errors);
    
    if (validFiles.length > 0) {
      try {
        const imageDataPromises = validFiles.map(fileToImageData);
        const newImageData = await Promise.all(imageDataPromises);
        onImagesChange([...images, ...newImageData]);
      } catch (error) {
        console.error('Error processing images:', error);
        setUploadErrors(prev => [...prev, {
          type: 'read_error',
          message: 'Failed to process one or more images'
        }]);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(e.target.files);
    // Reset input so same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the component entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleFilesSelected(files);
  };

  const removeImage = (imageId: string) => {
    if (onImagesChange) {
      onImagesChange(images.filter(img => img.id !== imageId));
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Get permission mode status indicator (CLI-style)
  const getPermissionModeIndicator = (mode: PermissionMode): string => {
    switch (mode) {
      case "default":
        return "🔧 normal mode";
      case "plan":
        return "⏸ plan mode";
      case "acceptEdits":
        return "⏵⏵ accept edits";
    }
  };

  // Get clean permission mode name (without emoji)
  const getPermissionModeName = (mode: PermissionMode): string => {
    switch (mode) {
      case "default":
        return "normal mode";
      case "plan":
        return "plan mode";
      case "acceptEdits":
        return "accept edits";
    }
  };

  // Get next permission mode for cycling
  const getNextPermissionMode = (current: PermissionMode): PermissionMode => {
    const modes: PermissionMode[] = ["default", "plan", "acceptEdits"];
    const currentIndex = modes.indexOf(current);
    return modes[(currentIndex + 1) % modes.length];
  };

  // If we're in plan permission mode, show the plan permission panel instead
  if (showPermissions && planPermissionData) {
    return (
      <PlanPermissionInputPanel
        onAcceptWithEdits={planPermissionData.onAcceptWithEdits}
        onAcceptDefault={planPermissionData.onAcceptDefault}
        onKeepPlanning={planPermissionData.onKeepPlanning}
        getButtonClassName={planPermissionData.getButtonClassName}
        onSelectionChange={planPermissionData.onSelectionChange}
        externalSelectedOption={planPermissionData.externalSelectedOption}
      />
    );
  }

  // If we're in regular permission mode, show the permission panel instead
  if (showPermissions && permissionData) {
    return (
      <PermissionInputPanel
        patterns={permissionData.patterns}
        onAllow={permissionData.onAllow}
        onAllowPermanent={permissionData.onAllowPermanent}
        onDeny={permissionData.onDeny}
        getButtonClassName={permissionData.getButtonClassName}
        onSelectionChange={permissionData.onSelectionChange}
        externalSelectedOption={permissionData.externalSelectedOption}
      />
    );
  }

  return (
    <div className="flex-shrink-0">
      {/* Image previews */}
      {images.length > 0 && (
        <div className="mb-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <PhotoIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {images.length} image{images.length > 1 ? 's' : ''} attached
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={`data:${image.type};base64,${image.data}`}
                  alt={image.name}
                  className="w-full aspect-square object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg truncate">
                  {image.name} ({formatFileSize(image.size)})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload errors */}
      {uploadErrors.length > 0 && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            Upload errors:
          </div>
          {uploadErrors.map((error, index) => (
            <div key={index} className="text-sm text-red-700 dark:text-red-300">
              {error.fileName && `${error.fileName}: `}{error.message}
            </div>
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl border-2 border-dashed border-blue-500 text-center">
            <PhotoIcon className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <div className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Drop images here
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Supports JPEG, PNG, GIF, WebP (max 5MB each)
            </div>
          </div>
        </div>
      )}

      <form 
        onSubmit={handleSubmit} 
        className="relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={
            isLoading && currentRequestId ? "Processing..." : "Type message..."
          }
          rows={1}
          className={`w-full px-4 py-3 pr-${onImagesChange ? '32' : '20'} bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm shadow-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none overflow-hidden min-h-[48px] max-h-[${UI_CONSTANTS.TEXTAREA_MAX_HEIGHT}px]`}
          disabled={isLoading}
        />
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="absolute right-2 bottom-3 flex gap-2">
          {isLoading && currentRequestId && (
            <button
              type="button"
              onClick={onAbort}
              className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
              title="Stop (ESC)"
            >
              <StopIcon className="w-4 h-4" />
            </button>
          )}
          {onImagesChange && (
            <button
              type="button"
              onClick={openFileDialog}
              disabled={isLoading}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              title="Add images"
            >
              <PhotoIcon className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={(!input.trim() && images.length === 0) || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 text-sm"
          >
            {isLoading ? "..." : permissionMode === "plan" ? "Plan" : "Send"}
          </button>
        </div>
      </form>

      {/* Permission mode status bar */}
      <button
        type="button"
        onClick={() =>
          onPermissionModeChange(getNextPermissionMode(permissionMode))
        }
        className="w-full px-4 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-mono text-left transition-colors cursor-pointer"
        title={`Current: ${getPermissionModeName(permissionMode)} - Click to cycle (Ctrl+Shift+M)`}
      >
        {getPermissionModeIndicator(permissionMode)}
        <span className="ml-2 text-slate-400 dark:text-slate-500 text-[10px]">
          - Click to cycle (Ctrl+Shift+M)
        </span>
      </button>
    </div>
  );
}
