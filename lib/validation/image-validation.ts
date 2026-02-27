/**
 * Image Validation Utilities
 *
 * Validates image URLs and files for security and compatibility
 */

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_BATCH = 100;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that a URL is a valid HTTPS image URL
 * Rejects local file paths, HTTP, localhost, etc.
 */
export function validateImageUrl(url: string | null | undefined): ImageValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = url.trim();

  // Reject empty or whitespace-only
  if (!trimmed) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Reject local file paths
  if (
    trimmed.startsWith('/Users/') ||
    trimmed.startsWith('/home/') ||
    trimmed.startsWith('C:\\') ||
    trimmed.startsWith('file:') ||
    trimmed.includes('\\')
  ) {
    return { valid: false, error: 'Local file paths are not allowed' };
  }

  // Must be HTTPS
  if (!trimmed.startsWith('https://')) {
    if (trimmed.startsWith('http://')) {
      return { valid: false, error: 'Only HTTPS URLs are allowed (not HTTP)' };
    }
    if (trimmed.startsWith('/logos/')) {
      // Allow relative paths for logos directory
      return { valid: true };
    }
    return { valid: false, error: 'URL must start with https://' };
  }

  // Reject localhost and private IPs
  if (
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1') ||
    trimmed.includes('192.168.') ||
    trimmed.includes('10.0.') ||
    trimmed.includes('172.16.')
  ) {
    return { valid: false, error: 'Localhost and private IPs are not allowed' };
  }

  // Basic URL validation
  try {
    new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  return { valid: true };
}

/**
 * Validate image file for upload
 */
export function validateImageFile(file: File): ImageValidationResult {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File too large: ${sizeMB}MB. Maximum: 5MB`,
    };
  }

  // Check filename
  if (!file.name) {
    return { valid: false, error: 'File must have a name' };
  }

  return { valid: true };
}

/**
 * Validate batch of files for upload
 */
export function validateImageBatch(files: File[]): {
  valid: boolean;
  errors: string[];
  validFiles: File[];
  invalidFiles: Array<{ file: File; error: string }>;
} {
  const errors: string[] = [];
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; error: string }> = [];

  if (files.length === 0) {
    errors.push('No files provided');
    return { valid: false, errors, validFiles, invalidFiles };
  }

  if (files.length > MAX_FILES_PER_BATCH) {
    errors.push(`Too many files: ${files.length}. Maximum: ${MAX_FILES_PER_BATCH}`);
    return { valid: false, errors, validFiles, invalidFiles };
  }

  for (const file of files) {
    const result = validateImageFile(file);
    if (result.valid) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, error: result.error || 'Unknown error' });
    }
  }

  if (validFiles.length === 0) {
    errors.push('No valid files found');
    return { valid: false, errors, validFiles, invalidFiles };
  }

  return { valid: true, errors, validFiles, invalidFiles };
}

/**
 * Extract SKU from filename
 * Removes extension and returns the base name
 */
export function extractSkuFromFilename(filename: string): string {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  return nameWithoutExt.trim();
}

/**
 * Check if image URL is safe for Next/Image
 * Returns true only for valid HTTPS URLs or allowed relative paths
 */
export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  const trimmed = url.trim();

  // Allow relative /logos/ paths
  if (trimmed.startsWith('/logos/')) return true;

  // Validate HTTPS URLs
  const validation = validateImageUrl(trimmed);
  return validation.valid;
}

/**
 * Get safe image URL or fallback
 * Returns the URL if valid, otherwise returns null
 */
export function getSafeImageUrl(url: string | null | undefined): string | null {
  if (!isSafeImageUrl(url)) return null;
  return url!.trim();
}
