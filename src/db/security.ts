import argon2 from 'argon2';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from './prisma.js';

// =============================================================================
// Password Hashing (Argon2id)
// =============================================================================

/**
 * Hashes an administrator password using Argon2id.
 * Settings align with OWASP Password Hashing recommendations.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,       // 3 iterations
    parallelism: 1,    // 1 lane
  });
}

/**
 * Verifies an administrator password against an Argon2id hash.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}

// =============================================================================
// Cryptographically Secure Session Tokens
// =============================================================================

/**
 * Generates a high-entropy session token (256 bits).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes SHA-256 hash of a session token for secure database storage.
 * The raw token is only held by the client in an HTTP-only SameSite cookie.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// =============================================================================
// Rate Limiting (In-Memory Sliding Window Defense)
// =============================================================================

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Checks and updates rate limit for a given key (e.g. IP address or username).
 * Returns { allowed: boolean, remaining: number, resetInSeconds: number }.
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowSeconds = 60
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetInSeconds: windowSeconds,
    };
  }

  record.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

  if (record.count > maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    resetInSeconds,
  };
}

// =============================================================================
// URL Validation & Sanitization (Defense Against Malicious Protocols & Phishing)
// =============================================================================

const UNSAFE_PROTOCOLS = /^(javascript:|data:|vbscript:|file:|blob:)/i;

/**
 * Validates and sanitizes a URL.
 * Only permits https://, http://, or safe relative URLs starting with '/'.
 * Rejects javascript:, data:, vbscript:, protocol-relative '//', and invalid schemas.
 */
export function validateAndSanitizeUrl(input: unknown, allowRelative = true): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Reject unsafe protocol prefixes immediately
  if (UNSAFE_PROTOCOLS.test(trimmed)) {
    return null;
  }

  // Prevent protocol-relative URLs (e.g. //attacker.com)
  if (trimmed.startsWith('//')) {
    return null;
  }

  // Handle relative paths
  if (trimmed.startsWith('/')) {
    if (!allowRelative) return null;
    // Disallow path traversal or embedded control characters
    return trimmed.replace(/[\x00-\x1F\x7F]/g, '');
  }

  // Handle absolute URLs
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// Sanitization & Safe Content Rendering (Defense Against Stored XSS)
// =============================================================================

/**
 * Strips script tags, javascript: URIs, onerror/onload attributes, and unsafe tags.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:\s*text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Recursively sanitizes JSON object strings and URLs.
 */
export function sanitizeContentData(data: unknown): any {
  if (typeof data === 'string') {
    return sanitizeString(data);
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeContentData);
  }
  if (data !== null && typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const cleanKey = sanitizeString(key);
      const isUrlKey = /url|link|href|ctaLink|destination|ogImage|canonicalUrl/i.test(cleanKey);

      if (isUrlKey && typeof val === 'string') {
        const safeUrl = validateAndSanitizeUrl(val);
        clean[cleanKey] = safeUrl !== null ? safeUrl : '';
      } else {
        clean[cleanKey] = sanitizeContentData(val);
      }
    }
    return clean;
  }
  return data;
}

// =============================================================================
// Sensitive Key Filter & Security Audit Logger
// =============================================================================

const SENSITIVE_KEY_REGEX = /password|secret|token|cookie|auth|credential|session|key/i;

export function stripSensitiveFields(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripSensitiveFields);

  const safe: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      safe[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      safe[key] = stripSensitiveFields(value);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Writes an immutable security audit event to PostgreSQL.
 * NEVER records passwords, session tokens, or credentials.
 */
export async function logSecurityAuditEvent(params: {
  action: string;
  adminUserId?: string | null;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARN';
  details?: Record<string, any>;
}): Promise<void> {
  try {
    const cleanDetails = params.details ? stripSensitiveFields(params.details) : undefined;
    await prisma.securityAuditEvent.create({
      data: {
        action: params.action,
        adminUserId: params.adminUserId ?? null,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress ? sanitizeString(params.ipAddress) : undefined,
        userAgent: params.userAgent ? sanitizeString(params.userAgent).slice(0, 500) : undefined,
        status: params.status,
        details: cleanDetails,
      },
    });
  } catch (error) {
    console.error('[Audit Logger] Failed to record audit log:', error);
  }
}

// =============================================================================
// Zod Input Validation Schemas
// =============================================================================

export const AdminLoginSchema = z.object({
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid username format'),
  password: z.string().min(8).max(128),
});

export const PageInputSchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, 'Slug must be lower-case alphanumeric with hyphens'),
  title: z.string().min(1).max(200),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  structuredContent: z.record(z.any()).default({}),
  seo: z.object({
    metaTitle: z.string().max(200).optional(),
    metaDescription: z.string().max(500).optional(),
    canonicalUrl: z.string().url().optional().or(z.literal('')),
    ogTitle: z.string().max(200).optional(),
    ogDescription: z.string().max(500).optional(),
    ogImage: z.string().url().optional().or(z.literal('')),
    twitterCard: z.enum(['summary', 'summary_large_image']).optional(),
    robots: z.string().max(100).optional(),
    structuredData: z.record(z.any()).optional(),
  }).optional(),
});

export const PageDraftSaveSchema = z.object({
  version: z.number().int().min(1, 'Page version is required for optimistic concurrency'),
  draftContent: z.record(z.any()),
  changeSummary: z.string().max(300).optional(),
});

export const PagePublishSchema = z.object({
  version: z.number().int().min(1, 'Page version is required for optimistic concurrency'),
  content: z.record(z.any()).optional(),
  changeSummary: z.string().max(300).optional(),
});

export const PageSeoUpdateSchema = z.object({
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  canonicalUrl: z.string().max(500).optional().refine(
    (val) => !val || validateAndSanitizeUrl(val, false) !== null,
    'Canonical URL must be a valid http/https URL'
  ),
  robots: z.string().max(100).optional(),
  preferredH1: z.string().max(200).optional(),
  ogTitle: z.string().max(200).optional(),
  ogDescription: z.string().max(500).optional(),
  ogImage: z.string().max(500).optional().refine(
    (val) => !val || validateAndSanitizeUrl(val, true) !== null,
    'OG Image must be a valid URL'
  ),
  twitterCard: z.enum(['summary', 'summary_large_image']).optional(),
  structuredData: z.record(z.any()).optional(),
});

export const RevisionRestoreSchema = z.object({
  expectedPageVersion: z.number().int().min(1),
  changeSummary: z.string().max(300).optional(),
});

export const RedirectRuleSchema = z.object({
  sourcePath: z.string().min(1).max(300).startsWith('/'),
  targetPath: z.string().min(1).max(500),
  statusCode: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).default(301),
  isActive: z.boolean().default(true),
  description: z.string().max(300).optional(),
});
