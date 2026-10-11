/**
 * Client-Side Browser Image Processing Engine
 * Operates strictly in the browser using HTML5 Canvas / OffscreenCanvas.
 * Zero files or buffers are transmitted to the server.
 */

export interface ImageProcessingResult {
  blob: Blob;
  width: number;
  height: number;
  size: number;
  format: string;
}

export type SupportedOutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * Loads an image from a Blob or ArrayBuffer safely
 */
export function loadImageElement(
  data: Blob | ArrayBuffer,
  mimeType = 'image/png'
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      return reject(new Error('Canvas image processing requires a browser environment.'));
    }

    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image data. File may be corrupted.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Formats a canvas output to a Blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: SupportedOutputFormat,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Failed to encode image to ${format}`));
        } else {
          resolve(blob);
        }
      },
      format,
      quality
    );
  });
}

/**
 * 1. Convert Image Format (JPG, PNG, WebP)
 */
export async function convertImage(
  data: Blob | ArrayBuffer,
  targetFormat: SupportedOutputFormat,
  quality = 0.92,
  sourceMime = 'image/png'
): Promise<ImageProcessingResult> {
  const img = await loadImageElement(data, sourceMime);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D rendering context.');

  // If converting to JPEG, render white background for alpha channels
  if (targetFormat === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

  const blob = await canvasToBlob(canvas, targetFormat, quality);
  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    size: blob.size,
    format: targetFormat,
  };
}

/**
 * 2. Compress Image (Adjust quality & max dimension)
 */
export async function compressImage(
  data: Blob | ArrayBuffer,
  quality = 0.75,
  maxDimension?: number,
  outputFormat: SupportedOutputFormat = 'image/jpeg',
  sourceMime = 'image/jpeg'
): Promise<ImageProcessingResult> {
  const img = await loadImageElement(data, sourceMime);
  let targetWidth = img.naturalWidth;
  let targetHeight = img.naturalHeight;

  if (maxDimension && (targetWidth > maxDimension || targetHeight > maxDimension)) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D context.');

  if (outputFormat === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const blob = await canvasToBlob(canvas, outputFormat, quality);
  return {
    blob,
    width: targetWidth,
    height: targetHeight,
    size: blob.size,
    format: outputFormat,
  };
}

/**
 * 3. Resize Image (Width, Height, Aspect Ratio)
 */
export async function resizeImage(
  data: Blob | ArrayBuffer,
  targetWidth: number,
  targetHeight: number,
  maintainAspectRatio = true,
  outputFormat: SupportedOutputFormat = 'image/png',
  quality = 0.92,
  sourceMime = 'image/png'
): Promise<ImageProcessingResult> {
  const img = await loadImageElement(data, sourceMime);
  let finalWidth = Math.max(1, Math.round(targetWidth));
  let finalHeight = Math.max(1, Math.round(targetHeight));

  if (maintainAspectRatio) {
    const origRatio = img.naturalWidth / img.naturalHeight;
    if (finalWidth / finalHeight > origRatio) {
      finalWidth = Math.round(finalHeight * origRatio);
    } else {
      finalHeight = Math.round(finalWidth / origRatio);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D context.');

  if (outputFormat === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

  const blob = await canvasToBlob(canvas, outputFormat, quality);
  return {
    blob,
    width: finalWidth,
    height: finalHeight,
    size: blob.size,
    format: outputFormat,
  };
}

/**
 * 4. Crop Image (Rectangle coordinates)
 */
export async function cropImage(
  data: Blob | ArrayBuffer,
  cropRect: { x: number; y: number; width: number; height: number },
  outputFormat: SupportedOutputFormat = 'image/png',
  quality = 0.92,
  sourceMime = 'image/png'
): Promise<ImageProcessingResult> {
  const img = await loadImageElement(data, sourceMime);

  // Clamp crop rectangle to image bounds
  const x = Math.max(0, Math.min(img.naturalWidth - 1, Math.round(cropRect.x)));
  const y = Math.max(0, Math.min(img.naturalHeight - 1, Math.round(cropRect.y)));
  const width = Math.max(1, Math.min(img.naturalWidth - x, Math.round(cropRect.width)));
  const height = Math.max(1, Math.min(img.naturalHeight - y, Math.round(cropRect.height)));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D context.');

  if (outputFormat === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, outputFormat, quality);
  return {
    blob,
    width,
    height,
    size: blob.size,
    format: outputFormat,
  };
}

/**
 * 5. Rotate & Flip Image (90, 180, 270 degrees, horizontal/vertical flip)
 */
export async function rotateImage(
  data: Blob | ArrayBuffer,
  rotationAngle: 0 | 90 | 180 | 270 = 90,
  flipHorizontal = false,
  flipVertical = false,
  outputFormat: SupportedOutputFormat = 'image/png',
  quality = 0.92,
  sourceMime = 'image/png'
): Promise<ImageProcessingResult> {
  const img = await loadImageElement(data, sourceMime);
  const isPerpendicular = rotationAngle === 90 || rotationAngle === 270;

  const canvas = document.createElement('canvas');
  canvas.width = isPerpendicular ? img.naturalHeight : img.naturalWidth;
  canvas.height = isPerpendicular ? img.naturalWidth : img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D context.');

  if (outputFormat === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Move origin to center of canvas for rotation
  ctx.translate(canvas.width / 2, canvas.height / 2);

  // Apply rotation
  if (rotationAngle !== 0) {
    ctx.rotate((rotationAngle * Math.PI) / 180);
  }

  // Apply flips
  const scaleX = flipHorizontal ? -1 : 1;
  const scaleY = flipVertical ? -1 : 1;
  if (flipHorizontal || flipVertical) {
    ctx.scale(scaleX, scaleY);
  }

  // Draw centered image
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  const blob = await canvasToBlob(canvas, outputFormat, quality);
  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    size: blob.size,
    format: outputFormat,
  };
}
