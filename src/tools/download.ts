/**
 * Client-Side Privacy-First Download Handler
 * Initiates direct browser downloads via object URLs and guarantees resource cleanup.
 * Zero network traffic is generated.
 */

export function triggerDirectDownload(
  data: Blob | Uint8Array | ArrayBuffer,
  fileName: string,
  mimeType = 'application/octet-stream'
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Direct downloads can only be triggered in a browser environment.');
  }

  const blob = data instanceof Blob ? data : new Blob([data as any], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Guarantee object URL cleanup to release memory
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 10000);
}
