import type { ImageData } from "../../../shared/types";

// Supported image formats based on Claude's vision capabilities
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for API
export const MAX_IMAGES_PER_MESSAGE = 20; // Claude.ai limit

export interface ImageValidationError {
  type: 'unsupported_format' | 'file_too_large' | 'too_many_images' | 'read_error';
  message: string;
  fileName?: string;
}

/**
 * Validates if a file is a supported image format and size
 */
export function validateImageFile(file: File): ImageValidationError | null {
  // Check file type
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      type: 'unsupported_format',
      message: `Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, GIF, WebP`,
      fileName: file.name
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024) * 100) / 100;
    return {
      type: 'file_too_large',
      message: `Image too large: ${sizeMB}MB. Maximum size: 5MB`,
      fileName: file.name
    };
  }

  return null;
}

/**
 * Converts a File to base64 encoded ImageData
 */
export function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 data
      const base64Data = result.split(',')[1];
      
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        data: base64Data
      });
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Validates multiple files and returns errors for any invalid ones
 */
export function validateImageFiles(files: File[], currentImageCount: number = 0): {
  validFiles: File[];
  errors: ImageValidationError[];
} {
  const validFiles: File[] = [];
  const errors: ImageValidationError[] = [];

  // Check total count
  if (currentImageCount + files.length > MAX_IMAGES_PER_MESSAGE) {
    errors.push({
      type: 'too_many_images',
      message: `Too many images. Maximum ${MAX_IMAGES_PER_MESSAGE} images per message.`
    });
    return { validFiles, errors };
  }

  for (const file of files) {
    const error = validateImageFile(file);
    if (error) {
      errors.push(error);
    } else {
      validFiles.push(file);
    }
  }

  return { validFiles, errors };
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}