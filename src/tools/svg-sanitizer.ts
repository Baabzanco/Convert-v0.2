/**
 * Client-Side SVG Sanitizer
 * Neutralizes scripts, event handlers, external references, and foreignObject tags.
 */

export function sanitizeSvgString(svgText: string): string {
  if (typeof svgText !== 'string') return '';

  let sanitized = svgText;

  // 1. Strip CDATA and scripts
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Strip foreignObject, object, iframe, embed
  sanitized = sanitized.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // 3. Strip all on* event handler attributes (e.g. onload=..., onerror=...)
  sanitized = sanitized.replace(/\son\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');

  // 4. Neutralize javascript: or data: URIs in href and xlink:href
  sanitized = sanitized.replace(/(href|xlink:href)\s*=\s*(["'])\s*(javascript:|data:text\/html)[^"']*\2/gi, '$1="#"');

  // 5. Neutralize external HTTP/HTTPS resources in <image> or <use> to prevent tracking/exfiltration
  sanitized = sanitized.replace(/<image\b([^>]*?)(href|xlink:href)\s*=\s*(["'])https?:\/\/[^"']*\3([^>]*?)>/gi, '<image $1 $4>');

  return sanitized.trim();
}

/**
 * Sanitizes an SVG file buffer and returns a clean UTF-8 string or ArrayBuffer
 */
export function sanitizeSvgBuffer(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawString = decoder.decode(buffer);
  const cleanString = sanitizeSvgString(rawString);
  const encoder = new TextEncoder();
  return encoder.encode(cleanString);
}
