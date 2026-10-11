/**
 * Client-Side File Signature & Resource Boundary Validator
 * Enforces privacy, prevents memory exhaustion, and verifies true file signatures (magic bytes).
 */

export interface ValidationLimits {
  maxFileSize: number; // in bytes (default 50MB)
  maxBatchCount: number; // default 20 files
  maxBatchTotalSize: number; // default 200MB
  maxImageWidth: number; // default 8000px
  maxImageHeight: number; // default 8000px
  maxPixels: number; // default 64MP
}

export const DEFAULT_LIMITS: ValidationLimits = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxBatchCount: 20,
  maxBatchTotalSize: 200 * 1024 * 1024, // 200MB
  maxImageWidth: 8000,
  maxImageHeight: 8000,
  maxPixels: 64 * 1000 * 1000, // 64 MegaPixels
};

export type DetectedFormat =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'
  | 'image/bmp'
  | 'image/svg+xml'
  | 'application/pdf'
  | 'unknown';

export interface ValidationResult {
  isValid: boolean;
  detectedFormat: DetectedFormat;
  fileSize: number;
  fileName: string;
  error?: string;
  dimensions?: { width: number; height: number };
}

/**
 * Inspects leading magic bytes to identify true file format.
 * Never trusts filename extensions or user-provided MIME types alone.
 */
export function detectMagicBytes(header: Uint8Array): DetectedFormat {
  if (header.length < 4) return 'unknown';

  // 1. JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return 'image/jpeg';
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return 'image/png';
  }

  // 3. WebP: 'RIFF' .... 'WEBP'
  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return 'image/webp';
  }

  // 4. PDF: '%PDF-' (25 50 44 46 2D)
  if (
    header.length >= 5 &&
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  ) {
    return 'application/pdf';
  }

  // 5. GIF: 'GIF87a' or 'GIF89a' (47 49 46 38)
  if (
    header.length >= 6 &&
    header[0] === 0x47 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x38 &&
    (header[4] === 0x37 || header[4] === 0x39) &&
    header[5] === 0x61
  ) {
    return 'image/gif';
  }

  // 6. BMP: 'BM' (42 4D)
  if (header[0] === 0x42 && header[1] === 0x4d) {
    return 'image/bmp';
  }

  // 7. SVG: Check for '<svg' or '<?xml' within first 512 bytes
  const textSample = new TextDecoder('utf-8', { fatal: false })
    .decode(header.slice(0, 512))
    .trim()
    .toLowerCase();
  if (textSample.includes('<svg') || (textSample.includes('<?xml') && textSample.includes('svg'))) {
    return 'image/svg+xml';
  }

  return 'unknown';
}

/**
 * Validates a single file against signatures and resource limits.
 */
export async function validateFile(
  file: File | { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
  allowedFormats: DetectedFormat[],
  limits: ValidationLimits = DEFAULT_LIMITS
): Promise<ValidationResult> {
  const fileName = file.name || 'unnamed_file';
  const fileSize = file.size || 0;

  // 1. File size check
  if (fileSize === 0) {
    return {
      isValid: false,
      detectedFormat: 'unknown',
      fileSize,
      fileName,
      error: 'File is empty (0 bytes).',
    };
  }

  if (fileSize > limits.maxFileSize) {
    const maxMb = Math.round(limits.maxFileSize / (1024 * 1024));
    return {
      isValid: false,
      detectedFormat: 'unknown',
      fileSize,
      fileName,
      error: `File size exceeds the maximum limit of ${maxMb}MB.`,
    };
  }

  // 2. Read first 512 bytes for magic bytes header inspection
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (err: any) {
    return {
      isValid: false,
      detectedFormat: 'unknown',
      fileSize,
      fileName,
      error: 'Could not read file data.',
    };
  }

  const header = new Uint8Array(buffer.slice(0, Math.min(512, buffer.byteLength)));
  const detectedFormat = detectMagicBytes(header);

  // 3. Format compatibility check
  if (detectedFormat === 'unknown') {
    return {
      isValid: false,
      detectedFormat,
      fileSize,
      fileName,
      error: 'Unsupported or unidentifiable file signature.',
    };
  }

  if (!allowedFormats.includes(detectedFormat)) {
    return {
      isValid: false,
      detectedFormat,
      fileSize,
      fileName,
      error: `File format (${detectedFormat}) is not supported for this tool.`,
    };
  }

  // 4. Image dimension validation (if running in browser environment)
  let dimensions: { width: number; height: number } | undefined;
  if (
    typeof window !== 'undefined' &&
    typeof Image !== 'undefined' &&
    detectedFormat.startsWith('image/')
  ) {
    try {
      dimensions = await getImageDimensions(buffer, detectedFormat);
      if (dimensions) {
        if (dimensions.width > limits.maxImageWidth || dimensions.height > limits.maxImageHeight) {
          return {
            isValid: false,
            detectedFormat,
            fileSize,
            fileName,
            error: `Image dimensions (${dimensions.width}x${dimensions.height}) exceed maximum allowed (${limits.maxImageWidth}x${limits.maxImageHeight}).`,
            dimensions,
          };
        }

        const totalPixels = dimensions.width * dimensions.height;
        if (totalPixels > limits.maxPixels) {
          return {
            isValid: false,
            detectedFormat,
            fileSize,
            fileName,
            error: `Image resolution exceeds maximum allowed memory safety limit.`,
            dimensions,
          };
        }
      }
    } catch {
      // Corrupt image payload
      return {
        isValid: false,
        detectedFormat,
        fileSize,
        fileName,
        error: 'Image data is corrupt or cannot be decoded.',
      };
    }
  }

  return {
    isValid: true,
    detectedFormat,
    fileSize,
    fileName,
    dimensions,
  };
}

/**
 * Validates a batch of files against batch size and count limits.
 */
export function validateBatchLimits(
  files: Array<{ size: number }>,
  limits: ValidationLimits = DEFAULT_LIMITS
): { isValid: boolean; error?: string } {
  if (files.length === 0) {
    return { isValid: false, error: 'No files provided.' };
  }

  if (files.length > limits.maxBatchCount) {
    return {
      isValid: false,
      error: `Batch contains ${files.length} files. Maximum allowed is ${limits.maxBatchCount}.`,
    };
  }

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  if (totalBytes > limits.maxBatchTotalSize) {
    const maxMb = Math.round(limits.maxBatchTotalSize / (1024 * 1024));
    return {
      isValid: false,
      error: `Total batch size exceeds maximum limit of ${maxMb}MB.`,
    };
  }

  return { isValid: true };
}

/**
 * Extracts width and height from browser image element
 */
function getImageDimensions(
  buffer: ArrayBuffer,
  format: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: format });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const res = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(res);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Corrupt or malformed image data'));
    };

    img.src = url;
  });
}
