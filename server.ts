import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './src/db/prisma.js';
import { Prisma } from '@prisma/client';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  checkRateLimit,
  sanitizeContentData,
  sanitizeString,
  validateAndSanitizeUrl,
  logSecurityAuditEvent,
  AdminLoginSchema,
  PageInputSchema,
  PageDraftSaveSchema,
  PagePublishSchema,
  PageSeoUpdateSchema,
  RevisionRestoreSchema,
  RedirectRuleSchema,
} from './src/db/security.js';
import { ensurePostgresRunning } from './src/db/standalone-pg.js';
import { requireAdminAuth, requireAdminRole, AuthenticatedAdminRequest } from './src/server/auth-middleware.js';
import { resolveRouteSeo, injectMetadataIntoHtml } from './src/server/seo.js';
import { generateSitemapXml, generateRobotsTxt } from './src/server/sitemap-generator.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  // 1. Ensure standalone PostgreSQL instance is initialized & active
  try {
    await ensurePostgresRunning();
  } catch (dbErr: any) {
    console.error('[Server] Critical: Failed to ensure PostgreSQL running:', dbErr.message);
  }

  const app = express();

  // -------------------------------------------------------------
  // Security Headers & Defense Controls
  // -------------------------------------------------------------
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  // Limit JSON body size to prevent DoS attacks
  app.use(express.json({ limit: '512kb' }));
  app.use(cookieParser());

  // -------------------------------------------------------------
  // Health & Verification Endpoint
  // -------------------------------------------------------------
  app.get('/api/health', async (_req, res) => {
    const startTime = Date.now();
    try {
      const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version();`;
      const latencyMs = Date.now() - startTime;
      const [adminCount, pageCount, sessionCount, auditCount] = await Promise.all([
        prisma.adminUser.count(),
        prisma.page.count(),
        prisma.adminSession.count(),
        prisma.securityAuditEvent.count(),
      ]);

      res.json({
        status: 'healthy',
        database: 'PostgreSQL (Standalone)',
        connected: true,
        latencyMs,
        engineVersion: result[0]?.version || 'PostgreSQL 18',
        tables: {
          adminUsers: adminCount,
          pages: pageCount,
          activeSessions: sessionCount,
          auditEvents: auditCount,
        },
        security: {
          firebaseDisabled: true,
          passwordHashing: 'Argon2id',
          sessionTransport: 'HTTP-only SameSite cookie',
          rateLimiting: 'Enabled',
          userFileUploads: 'Prohibited (Browser-local processing only)',
        },
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'unhealthy',
        database: 'PostgreSQL',
        connected: false,
        error: err.message,
      });
    }
  });

  // -------------------------------------------------------------
  // Admin Authentication API
  // -------------------------------------------------------------

  // POST /api/admin/auth/login
  app.post('/api/admin/auth/login', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 1. Rate Limiting Check (5 attempts per minute per IP)
    const rateCheck = checkRateLimit(`login:${clientIp}`, 5, 60);
    if (!rateCheck.allowed) {
      await logSecurityAuditEvent({
        action: 'AUTH_RATE_LIMIT_EXCEEDED',
        ipAddress: clientIp,
        userAgent,
        status: 'WARN',
        details: { resetInSeconds: rateCheck.resetInSeconds },
      });

      return res.status(429).json({
        error: `Too many login attempts. Please wait ${rateCheck.resetInSeconds} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    // 2. Strict Input Validation
    const parsed = AdminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid input format',
        details: parsed.error.format(),
      });
    }

    const { username, password } = parsed.data;

    try {
      // 3. Retrieve user from PostgreSQL using Prisma safe query
      const user = await prisma.adminUser.findUnique({
        where: { username },
      });

      if (!user) {
        // Uniform delay to resist timing attacks
        await new Promise((r) => setTimeout(r, 150));
        await logSecurityAuditEvent({
          action: 'AUTH_LOGIN_FAILED_NONEXISTENT_USER',
          ipAddress: clientIp,
          userAgent,
          status: 'FAILURE',
          details: { attemptedUsername: username },
        });

        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        return res.status(423).json({
          error: `Account temporarily locked due to excessive failed attempts. Try again in ${remainingMinutes} minute(s).`,
          code: 'ACCOUNT_LOCKED',
        });
      }

      // 4. Verify password with Argon2id
      const isValidPassword = await verifyPassword(user.passwordHash, password);

      if (!isValidPassword) {
        const attempts = user.failedLoginAttempts + 1;
        const lockAccount = attempts >= 5;
        const lockedUntil = lockAccount ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 mins

        await prisma.adminUser.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: lockAccount ? 0 : attempts,
            lockedUntil,
          },
        });

        await logSecurityAuditEvent({
          action: 'AUTH_LOGIN_FAILED_WRONG_PASSWORD',
          adminUserId: user.id,
          ipAddress: clientIp,
          userAgent,
          status: 'FAILURE',
          details: { failedAttempts: attempts, accountLocked: lockAccount },
        });

        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          error: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED',
        });
      }

      // 5. Success: Reset failed attempts & update last login
      await prisma.adminUser.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });

      // 6. Generate cryptographically random session token (256-bit)
      const rawSessionToken = generateSessionToken();
      const hashedToken = hashSessionToken(rawSessionToken);
      const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.adminSession.create({
        data: {
          sessionToken: hashedToken,
          adminUserId: user.id,
          ipAddress: clientIp,
          userAgent: userAgent.slice(0, 500),
          expiresAt: sessionExpiry,
        },
      });

      // 7. Set secure HTTP-only SameSite cookie
      res.cookie('admin_session', rawSessionToken, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'lax',
        path: '/',
        expires: sessionExpiry,
      });

      await logSecurityAuditEvent({
        action: 'AUTH_LOGIN_SUCCESS',
        adminUserId: user.id,
        ipAddress: clientIp,
        userAgent,
        status: 'SUCCESS',
        details: { role: user.role },
      });

      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      return res.status(500).json({ error: 'Authentication service error' });
    }
  });

  // POST /api/admin/auth/logout
  app.post('/api/admin/auth/logout', async (req, res) => {
    const sessionToken = req.cookies?.admin_session;
    if (sessionToken && typeof sessionToken === 'string') {
      try {
        const hashedToken = hashSessionToken(sessionToken);
        const session = await prisma.adminSession.findUnique({
          where: { sessionToken: hashedToken },
        });

        if (session) {
          await prisma.adminSession.delete({ where: { id: session.id } });
          await logSecurityAuditEvent({
            action: 'AUTH_LOGOUT',
            adminUserId: session.adminUserId,
            status: 'SUCCESS',
          });
        }
      } catch (err) {
        // ignore delete failure on logout
      }
    }

    res.clearCookie('admin_session', { path: '/' });
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // GET /api/admin/auth/me
  app.get('/api/admin/auth/me', requireAdminAuth, (req: AuthenticatedAdminRequest, res) => {
    res.json({
      authenticated: true,
      user: req.adminUser,
    });
  });

  // -------------------------------------------------------------
  // Public Content Delivery (Published Pages & Public SEO Only)
  // -------------------------------------------------------------

  // GET /api/public/pages/:slug
  // Strictly returns PUBLISHED content and published SEO only.
  // Never leaks drafts, unpublished revisions, or admin metadata to anonymous visitors.
  app.get('/api/public/pages/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const cleanSlug = sanitizeString(slug);

      // Check for active redirect rules first
      const redirect = await prisma.redirectRule.findFirst({
        where: { sourcePath: `/${cleanSlug}`, isActive: true },
      });

      if (redirect) {
        // Track hit counter asynchronously
        void prisma.redirectRule.update({
          where: { id: redirect.id },
          data: { hitCount: { increment: 1 }, lastHitAt: new Date() },
        }).catch(() => {});

        return res.status(redirect.statusCode).json({
          redirect: true,
          targetPath: redirect.targetPath,
          statusCode: redirect.statusCode,
        });
      }

      const page = await prisma.page.findFirst({
        where: {
          slug: cleanSlug,
          status: 'PUBLISHED',
        },
        include: {
          seoSettings: true,
        },
      });

      if (!page) {
        return res.status(404).json({
          error: 'Page not found or unpublished',
          code: 'PAGE_NOT_FOUND',
        });
      }

      // Safe canonical URL generation using configured origin (never untrusted host header)
      const siteOrigin = process.env.APP_URL || 'https://example.com';
      const canonicalUrl =
        page.seoSettings?.canonicalUrl ||
        `${siteOrigin.replace(/\/$/, '')}/${page.slug === 'home' ? '' : page.slug}`;

      // Emit strictly published attributes
      return res.json({
        page: {
          id: page.id,
          slug: page.slug,
          title: page.title,
          status: page.status,
          publishedAt: page.publishedAt,
          structuredContent: page.structuredContent,
          seoSettings: page.seoSettings
            ? {
                metaTitle: page.seoSettings.metaTitle || page.title,
                metaDescription: page.seoSettings.metaDescription || '',
                canonicalUrl,
                robots: page.seoSettings.robots || 'index, follow',
                preferredH1: page.seoSettings.preferredH1 || page.title,
                ogTitle: page.seoSettings.ogTitle || page.seoSettings.metaTitle || page.title,
                ogDescription: page.seoSettings.ogDescription || page.seoSettings.metaDescription || '',
                ogImage: page.seoSettings.ogImage || '',
                twitterCard: page.seoSettings.twitterCard || 'summary_large_image',
                structuredData: page.seoSettings.structuredData || null,
              }
            : null,
        },
      });
    } catch (err: any) {
      console.error('[Public API] Error retrieving page:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve page content' });
    }
  });

  // -------------------------------------------------------------
  // Admin Content Management APIs (Protected by requireAdminAuth)
  // -------------------------------------------------------------

  // GET /api/admin/pages
  app.get('/api/admin/pages', requireAdminAuth, async (_req, res) => {
    try {
      const pages = await prisma.page.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          seoSettings: true,
          _count: {
            select: { revisions: true },
          },
        },
      });
      res.json({ pages });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch pages' });
    }
  });

  // GET /api/admin/pages/:id/preview (Authorized Preview of Draft & Published Content)
  app.get('/api/admin/pages/:id/preview', requireAdminAuth, async (req, res) => {
    try {
      const page = await prisma.page.findUnique({
        where: { id: req.params.id },
        include: {
          seoSettings: true,
          revisions: {
            orderBy: { revisionNumber: 'desc' },
            take: 10,
            include: { author: { select: { id: true, username: true } } },
          },
        },
      });

      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      return res.json({ page });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to retrieve page preview' });
    }
  });

  // PUT /api/admin/pages/:id/draft (Save Work-in-Progress Draft with Optimistic Concurrency)
  app.put('/api/admin/pages/:id/draft', requireAdminAuth, async (req: AuthenticatedAdminRequest, res) => {
    const parse = PageDraftSaveSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.format() });
    }

    const { version, draftContent, changeSummary } = parse.data;
    const cleanDraftContent = sanitizeContentData(draftContent);

    try {
      const currentPage = await prisma.page.findUnique({
        where: { id: req.params.id },
      });

      if (!currentPage) {
        return res.status(404).json({ error: 'Page not found' });
      }

      // Optimistic concurrency check: Reject if version does not match
      if (currentPage.version !== version) {
        return res.status(409).json({
          error: 'Conflict: This page was modified by another editing session.',
          code: 'CONCURRENCY_CONFLICT',
          currentVersion: currentPage.version,
          currentUpdatedAt: currentPage.updatedAt,
        });
      }

      const updatedPage = await prisma.page.update({
        where: { id: req.params.id },
        data: {
          draftContent: cleanDraftContent,
          hasUnpublishedChanges: true,
          lastUpdatedById: req.adminUser!.id,
          version: { increment: 1 },
        },
        include: { seoSettings: true },
      });

      await logSecurityAuditEvent({
        action: 'PAGE_DRAFT_SAVED',
        adminUserId: req.adminUser!.id,
        resourceType: 'PAGE',
        resourceId: updatedPage.id,
        status: 'SUCCESS',
        details: {
          slug: updatedPage.slug,
          version: updatedPage.version,
          changeSummary: changeSummary ? sanitizeString(changeSummary) : 'Draft saved via inline editor',
        },
      });

      return res.json({ success: true, page: updatedPage });
    } catch (err: any) {
      console.error('[Pages] Draft save error:', err);
      return res.status(500).json({ error: 'Failed to save draft' });
    }
  });

  // POST /api/admin/pages/:id/publish (Atomically Publish Content, Commit Revision, Clear Draft)
  app.post('/api/admin/pages/:id/publish', requireAdminAuth, async (req: AuthenticatedAdminRequest, res) => {
    const parse = PagePublishSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.format() });
    }

    const { version, content, changeSummary } = parse.data;

    try {
      const currentPage = await prisma.page.findUnique({
        where: { id: req.params.id },
        include: {
          seoSettings: true,
          revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 },
        },
      });

      if (!currentPage) {
        return res.status(404).json({ error: 'Page not found' });
      }

      // Optimistic concurrency check
      if (currentPage.version !== version) {
        return res.status(409).json({
          error: 'Conflict: This page was modified by another editing session.',
          code: 'CONCURRENCY_CONFLICT',
          currentVersion: currentPage.version,
          currentUpdatedAt: currentPage.updatedAt,
        });
      }

      // Content to publish: explicit body content, or existing draftContent, or current structuredContent
      const contentToPublish = content || currentPage.draftContent || currentPage.structuredContent;
      const cleanContent = sanitizeContentData(contentToPublish);
      const nextRevisionNumber = (currentPage.revisions[0]?.revisionNumber || 0) + 1;

      // Atomic database transaction
      const updatedPage = await prisma.$transaction(async (tx) => {
        // 1. Record new content revision
        await tx.contentRevision.create({
          data: {
            pageId: currentPage.id,
            revisionNumber: nextRevisionNumber,
            authorId: req.adminUser!.id,
            title: currentPage.title,
            structuredContent: cleanContent,
            changeSummary: changeSummary ? sanitizeString(changeSummary) : `Published revision #${nextRevisionNumber}`,
          },
        });

        // 2. Promote draft SEO to published SEO if draftSeo was set
        if (currentPage.seoSettings?.draftSeo && typeof currentPage.seoSettings.draftSeo === 'object') {
          const draftSeoObj = currentPage.seoSettings.draftSeo as Record<string, any>;
          await tx.pageSeo.update({
            where: { pageId: currentPage.id },
            data: {
              metaTitle: draftSeoObj.metaTitle ? sanitizeString(draftSeoObj.metaTitle) : undefined,
              metaDescription: draftSeoObj.metaDescription ? sanitizeString(draftSeoObj.metaDescription) : undefined,
              canonicalUrl: draftSeoObj.canonicalUrl ? validateAndSanitizeUrl(draftSeoObj.canonicalUrl) || undefined : undefined,
              robots: draftSeoObj.robots ? sanitizeString(draftSeoObj.robots) : undefined,
              preferredH1: draftSeoObj.preferredH1 ? sanitizeString(draftSeoObj.preferredH1) : undefined,
              ogTitle: draftSeoObj.ogTitle ? sanitizeString(draftSeoObj.ogTitle) : undefined,
              ogDescription: draftSeoObj.ogDescription ? sanitizeString(draftSeoObj.ogDescription) : undefined,
              ogImage: draftSeoObj.ogImage ? validateAndSanitizeUrl(draftSeoObj.ogImage) || undefined : undefined,
              twitterCard: draftSeoObj.twitterCard || undefined,
              structuredData: draftSeoObj.structuredData ? sanitizeContentData(draftSeoObj.structuredData) : undefined,
              draftSeo: Prisma.DbNull,
            },
          });
        }

        // 3. Update Page model
        return tx.page.update({
          where: { id: currentPage.id },
          data: {
            structuredContent: cleanContent,
            draftContent: Prisma.DbNull,
            hasUnpublishedChanges: false,
            status: 'PUBLISHED',
            publishedAt: currentPage.publishedAt || new Date(),
            lastUpdatedById: req.adminUser!.id,
            version: { increment: 1 },
          },
          include: { seoSettings: true },
        });
      });

      await logSecurityAuditEvent({
        action: 'PAGE_PUBLISHED',
        adminUserId: req.adminUser!.id,
        resourceType: 'PAGE',
        resourceId: updatedPage.id,
        status: 'SUCCESS',
        details: {
          slug: updatedPage.slug,
          revisionNumber: nextRevisionNumber,
          version: updatedPage.version,
        },
      });

      return res.json({ success: true, page: updatedPage, revisionNumber: nextRevisionNumber });
    } catch (err: any) {
      console.error('[Pages] Publish error:', err);
      return res.status(500).json({ error: 'Failed to publish page content' });
    }
  });

  // POST /api/admin/pages/:id/revert-draft (Discard Pending Draft Changes)
  app.post('/api/admin/pages/:id/revert-draft', requireAdminAuth, async (req: AuthenticatedAdminRequest, res) => {
    try {
      const page = await prisma.page.update({
        where: { id: req.params.id },
        data: {
          draftContent: Prisma.DbNull,
          hasUnpublishedChanges: false,
          version: { increment: 1 },
        },
        include: { seoSettings: true },
      });

      await logSecurityAuditEvent({
        action: 'PAGE_DRAFT_REVERTED',
        adminUserId: req.adminUser!.id,
        resourceType: 'PAGE',
        resourceId: page.id,
        status: 'SUCCESS',
        details: { slug: page.slug, version: page.version },
      });

      return res.json({ success: true, page });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to revert draft' });
    }
  });

  // POST /api/admin/pages/:id/revisions/:revisionId/restore (Restore Past Content Revision)
  app.post(
    '/api/admin/pages/:id/revisions/:revisionId/restore',
    requireAdminAuth,
    async (req: AuthenticatedAdminRequest, res) => {
      const parse = RevisionRestoreSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ error: 'Validation failed', details: parse.error.format() });
      }

      const { expectedPageVersion, changeSummary } = parse.data;

      try {
        const currentPage = await prisma.page.findUnique({
          where: { id: req.params.id },
          include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } },
        });

        if (!currentPage) {
          return res.status(404).json({ error: 'Page not found' });
        }

        if (currentPage.version !== expectedPageVersion) {
          return res.status(409).json({
            error: 'Conflict: Page version changed since request was initiated.',
            code: 'CONCURRENCY_CONFLICT',
            currentVersion: currentPage.version,
          });
        }

        const targetRevision = await prisma.contentRevision.findFirst({
          where: {
            id: req.params.revisionId,
            pageId: currentPage.id,
          },
        });

        if (!targetRevision) {
          return res.status(404).json({ error: 'Specified revision not found for this page' });
        }

        const nextRevisionNumber = (currentPage.revisions[0]?.revisionNumber || 0) + 1;

        // Atomic transaction: restore content and create a forward audit revision
        const restoredPage = await prisma.$transaction(async (tx) => {
          await tx.contentRevision.create({
            data: {
              pageId: currentPage.id,
              revisionNumber: nextRevisionNumber,
              authorId: req.adminUser!.id,
              title: currentPage.title,
              structuredContent: targetRevision.structuredContent as Prisma.InputJsonValue,
              changeSummary:
                changeSummary || `Restored from revision #${targetRevision.revisionNumber}`,
            },
          });

          return tx.page.update({
            where: { id: currentPage.id },
            data: {
              structuredContent: targetRevision.structuredContent as Prisma.InputJsonValue,
              draftContent: Prisma.DbNull,
              hasUnpublishedChanges: false,
              lastUpdatedById: req.adminUser!.id,
              version: { increment: 1 },
            },
            include: { seoSettings: true },
          });
        });

        await logSecurityAuditEvent({
          action: 'PAGE_REVISION_RESTORED',
          adminUserId: req.adminUser!.id,
          resourceType: 'PAGE',
          resourceId: restoredPage.id,
          status: 'SUCCESS',
          details: {
            restoredFromRevision: targetRevision.revisionNumber,
            newRevisionNumber: nextRevisionNumber,
            slug: restoredPage.slug,
          },
        });

        return res.json({
          success: true,
          restoredFromRevision: targetRevision.revisionNumber,
          newRevisionNumber: nextRevisionNumber,
          page: restoredPage,
        });
      } catch (err: any) {
        console.error('[Pages] Revision restore error:', err);
        return res.status(500).json({ error: 'Failed to restore revision' });
      }
    }
  );

  // PUT /api/admin/pages/:id/seo (Update Per-Page SEO Settings with URL Sanitization)
  app.put('/api/admin/pages/:id/seo', requireAdminAuth, async (req: AuthenticatedAdminRequest, res) => {
    const parse = PageSeoUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.format() });
    }

    const {
      metaTitle,
      metaDescription,
      canonicalUrl,
      robots,
      preferredH1,
      ogTitle,
      ogDescription,
      ogImage,
      twitterCard,
      structuredData,
    } = parse.data;

    try {
      const page = await prisma.page.findUnique({
        where: { id: req.params.id },
      });

      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      // Sanitize fields
      const cleanCanonical = canonicalUrl ? validateAndSanitizeUrl(canonicalUrl, false) || undefined : undefined;
      const cleanOgImage = ogImage ? validateAndSanitizeUrl(ogImage, true) || undefined : undefined;
      const cleanStructuredData = structuredData ? sanitizeContentData(structuredData) : undefined;

      const updatedSeo = await prisma.pageSeo.upsert({
        where: { pageId: page.id },
        create: {
          pageId: page.id,
          metaTitle: metaTitle ? sanitizeString(metaTitle) : undefined,
          metaDescription: metaDescription ? sanitizeString(metaDescription) : undefined,
          canonicalUrl: cleanCanonical,
          robots: robots ? sanitizeString(robots) : 'index, follow',
          preferredH1: preferredH1 ? sanitizeString(preferredH1) : undefined,
          ogTitle: ogTitle ? sanitizeString(ogTitle) : undefined,
          ogDescription: ogDescription ? sanitizeString(ogDescription) : undefined,
          ogImage: cleanOgImage,
          twitterCard: twitterCard || 'summary_large_image',
          structuredData: cleanStructuredData,
        },
        update: {
          metaTitle: metaTitle !== undefined ? sanitizeString(metaTitle) : undefined,
          metaDescription: metaDescription !== undefined ? sanitizeString(metaDescription) : undefined,
          canonicalUrl: cleanCanonical,
          robots: robots !== undefined ? sanitizeString(robots) : undefined,
          preferredH1: preferredH1 !== undefined ? sanitizeString(preferredH1) : undefined,
          ogTitle: ogTitle !== undefined ? sanitizeString(ogTitle) : undefined,
          ogDescription: ogDescription !== undefined ? sanitizeString(ogDescription) : undefined,
          ogImage: cleanOgImage,
          twitterCard: twitterCard !== undefined ? twitterCard : undefined,
          structuredData: cleanStructuredData,
        },
      });

      await logSecurityAuditEvent({
        action: 'PAGE_SEO_UPDATED',
        adminUserId: req.adminUser!.id,
        resourceType: 'PAGE_SEO',
        resourceId: updatedSeo.id,
        status: 'SUCCESS',
        details: { pageId: page.id, slug: page.slug },
      });

      return res.json({ success: true, seoSettings: updatedSeo });
    } catch (err: any) {
      console.error('[SEO] Update error:', err);
      return res.status(500).json({ error: 'Failed to update SEO settings' });
    }
  });

  // POST /api/admin/pages
  app.post('/api/admin/pages', requireAdminAuth, async (req: AuthenticatedAdminRequest, res) => {
    const parse = PageInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.format() });
    }

    const { slug, title, status, structuredContent, seo } = parse.data;

    // Sanitize inputs to prevent stored XSS
    const cleanTitle = sanitizeString(title);
    const cleanContent = sanitizeContentData(structuredContent);

    try {
      const existing = await prisma.page.findUnique({ where: { slug } });
      if (existing) {
        return res.status(409).json({ error: 'A page with this slug already exists' });
      }

      const page = await prisma.page.create({
        data: {
          slug,
          title: cleanTitle,
          status,
          publishedAt: status === 'PUBLISHED' ? new Date() : null,
          structuredContent: cleanContent,
          seoSettings: seo
            ? {
                create: {
                  metaTitle: seo.metaTitle ? sanitizeString(seo.metaTitle) : undefined,
                  metaDescription: seo.metaDescription ? sanitizeString(seo.metaDescription) : undefined,
                  canonicalUrl: seo.canonicalUrl,
                  ogTitle: seo.ogTitle ? sanitizeString(seo.ogTitle) : undefined,
                  ogDescription: seo.ogDescription ? sanitizeString(seo.ogDescription) : undefined,
                  ogImage: seo.ogImage,
                  twitterCard: seo.twitterCard || 'summary_large_image',
                  robots: seo.robots || 'index, follow',
                  structuredData: seo.structuredData ? sanitizeContentData(seo.structuredData) : undefined,
                },
              }
            : undefined,
          revisions: {
            create: {
              revisionNumber: 1,
              authorId: req.adminUser!.id,
              title: cleanTitle,
              structuredContent: cleanContent,
              changeSummary: 'Initial page creation',
            },
          },
        },
        include: { seoSettings: true, revisions: true },
      });

      await logSecurityAuditEvent({
        action: 'PAGE_CREATED',
        adminUserId: req.adminUser!.id,
        resourceType: 'PAGE',
        resourceId: page.id,
        status: 'SUCCESS',
        details: { slug: page.slug, title: page.title },
      });

      return res.status(201).json({ page });
    } catch (err: any) {
      console.error('[Pages] Create error:', err);
      return res.status(500).json({ error: 'Failed to create page' });
    }
  });

  // GET /api/admin/pages/:id
  app.get('/api/admin/pages/:id', requireAdminAuth, async (req, res) => {
    try {
      const page = await prisma.page.findUnique({
        where: { id: req.params.id },
        include: {
          seoSettings: true,
          revisions: {
            orderBy: { revisionNumber: 'desc' },
            include: {
              author: { select: { id: true, username: true } },
            },
          },
        },
      });

      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      return res.json({ page });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to retrieve page' });
    }
  });

  // PUT /api/admin/pages/:id
  app.put('/api/admin/pages/:id', requireAdminAuth, async (req: AuthenticatedAdminRequest, res) => {
    const parse = PageInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.format() });
    }

    const { title, status, structuredContent, seo } = parse.data;
    const cleanTitle = sanitizeString(title);
    const cleanContent = sanitizeContentData(structuredContent);

    try {
      const currentPage = await prisma.page.findUnique({
        where: { id: req.params.id },
        include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } },
      });

      if (!currentPage) {
        return res.status(404).json({ error: 'Page not found' });
      }

      const nextRevisionNumber = (currentPage.revisions[0]?.revisionNumber || 0) + 1;

      const updatedPage = await prisma.page.update({
        where: { id: req.params.id },
        data: {
          title: cleanTitle,
          status,
          publishedAt: status === 'PUBLISHED' && !currentPage.publishedAt ? new Date() : currentPage.publishedAt,
          structuredContent: cleanContent,
          seoSettings: seo
            ? {
                upsert: {
                  create: {
                    metaTitle: seo.metaTitle ? sanitizeString(seo.metaTitle) : undefined,
                    metaDescription: seo.metaDescription ? sanitizeString(seo.metaDescription) : undefined,
                    canonicalUrl: seo.canonicalUrl,
                    ogTitle: seo.ogTitle ? sanitizeString(seo.ogTitle) : undefined,
                    ogDescription: seo.ogDescription ? sanitizeString(seo.ogDescription) : undefined,
                    ogImage: seo.ogImage,
                    twitterCard: seo.twitterCard,
                    robots: seo.robots,
                    structuredData: seo.structuredData ? sanitizeContentData(seo.structuredData) : undefined,
                  },
                  update: {
                    metaTitle: seo.metaTitle ? sanitizeString(seo.metaTitle) : undefined,
                    metaDescription: seo.metaDescription ? sanitizeString(seo.metaDescription) : undefined,
                    canonicalUrl: seo.canonicalUrl,
                    ogTitle: seo.ogTitle ? sanitizeString(seo.ogTitle) : undefined,
                    ogDescription: seo.ogDescription ? sanitizeString(seo.ogDescription) : undefined,
                    ogImage: seo.ogImage,
                    twitterCard: seo.twitterCard,
                    robots: seo.robots,
                    structuredData: seo.structuredData ? sanitizeContentData(seo.structuredData) : undefined,
                  },
                },
              }
            : undefined,
          revisions: {
            create: {
              revisionNumber: nextRevisionNumber,
              authorId: req.adminUser!.id,
              title: cleanTitle,
              structuredContent: cleanContent,
              changeSummary: (req.body.changeSummary && sanitizeString(req.body.changeSummary)) || `Revision #${nextRevisionNumber}`,
            },
          },
        },
        include: { seoSettings: true, revisions: { take: 5, orderBy: { revisionNumber: 'desc' } } },
      });

      await logSecurityAuditEvent({
        action: 'PAGE_UPDATED',
        adminUserId: req.adminUser!.id,
        resourceType: 'PAGE',
        resourceId: updatedPage.id,
        status: 'SUCCESS',
        details: { revisionNumber: nextRevisionNumber, slug: updatedPage.slug },
      });

      return res.json({ page: updatedPage });
    } catch (err: any) {
      console.error('[Pages] Update error:', err);
      return res.status(500).json({ error: 'Failed to update page' });
    }
  });

  // DELETE /api/admin/pages/:id
  app.delete('/api/admin/pages/:id', requireAdminAuth, requireAdminRole(['SUPER_ADMIN']), async (req: AuthenticatedAdminRequest, res) => {
    try {
      const page = await prisma.page.delete({
        where: { id: req.params.id },
      });

      await logSecurityAuditEvent({
        action: 'PAGE_DELETED',
        adminUserId: req.adminUser!.id,
        resourceType: 'PAGE',
        resourceId: page.id,
        status: 'SUCCESS',
        details: { slug: page.slug, title: page.title },
      });

      return res.json({ success: true, message: 'Page deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete page' });
    }
  });

  // -------------------------------------------------------------
  // Redirect Rules APIs
  // -------------------------------------------------------------

  app.get('/api/admin/redirects', requireAdminAuth, async (_req, res) => {
    try {
      const redirects = await prisma.redirectRule.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json({ redirects });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load redirects' });
    }
  });

  app.post('/api/admin/redirects', requireAdminAuth, async (req: AuthenticatedAdminRequest, res) => {
    const parse = RedirectRuleSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.format() });
    }

    try {
      const rule = await prisma.redirectRule.create({
        data: {
          sourcePath: sanitizeString(parse.data.sourcePath),
          targetPath: sanitizeString(parse.data.targetPath),
          statusCode: parse.data.statusCode,
          isActive: parse.data.isActive,
          description: parse.data.description ? sanitizeString(parse.data.description) : undefined,
        },
      });

      await logSecurityAuditEvent({
        action: 'REDIRECT_RULE_CREATED',
        adminUserId: req.adminUser!.id,
        resourceType: 'REDIRECT',
        resourceId: rule.id,
        status: 'SUCCESS',
        details: { source: rule.sourcePath, target: rule.targetPath },
      });

      return res.status(201).json({ redirect: rule });
    } catch (err: any) {
      return res.status(409).json({ error: 'Redirect for this source path already exists' });
    }
  });

  // -------------------------------------------------------------
  // Security Audit Logs API
  // -------------------------------------------------------------

  app.get('/api/admin/audit-logs', requireAdminAuth, async (req, res) => {
    try {
      const limit = Math.min(100, parseInt((req.query.limit as string) || '50', 10));
      const logs = await prisma.securityAuditEvent.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: {
            select: { id: true, username: true, email: true },
          },
        },
      });
      res.json({ logs });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve audit logs' });
    }
  });

  // -------------------------------------------------------------
  // SEO Infrastructure: Dynamic XML Sitemap & Robots.txt
  // -------------------------------------------------------------

  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const xml = await generateSitemapXml();
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(xml);
    } catch (err: any) {
      console.error('[SEO] Sitemap generation error:', err.message);
      return res.status(500).send('Error generating sitemap');
    }
  });

  app.get('/robots.txt', (_req, res) => {
    const robots = generateRobotsTxt();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(robots);
  });

  // -------------------------------------------------------------
  // Client Frontend Serving (Vite with SSR Metadata Injection)
  // -------------------------------------------------------------
  let viteInstance: any = null;
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(viteInstance.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist'), { index: false }));
  }

  // Universal HTML handler with Server-Side Metadata & Prerendered HTML Injection
  app.get('*', async (req, res, next) => {
    const url = req.originalUrl || req.url;

    // Skip API routes and static asset requests (e.g. .js, .css, .png)
    if (url.startsWith('/api/') || /\.[a-zA-Z0-9]+$/.test(req.path)) {
      return next();
    }

    try {
      // 1. Check for Active Redirect Rules
      const cleanPath = req.path.replace(/\/+$/, '') || '/';
      const redirect = await prisma.redirectRule.findFirst({
        where: { sourcePath: cleanPath, isActive: true },
      });

      if (redirect) {
        void prisma.redirectRule.update({
          where: { id: redirect.id },
          data: { hitCount: { increment: 1 }, lastHitAt: new Date() },
        }).catch(() => {});

        return res.redirect(redirect.statusCode, redirect.targetPath);
      }

      // 2. Resolve Server-Side Metadata and Crawlable Semantic HTML
      const routeSeo = await resolveRouteSeo(cleanPath);

      // 3. Read index.html template (via Vite transformIndexHtml in dev, or from dist in prod)
      let templateHtml = '';
      if (!IS_PROD && viteInstance) {
        const rawTemplate = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        templateHtml = await viteInstance.transformIndexHtml(url, rawTemplate);
      } else {
        templateHtml = fs.readFileSync(path.resolve(__dirname, 'dist', 'index.html'), 'utf-8');
      }

      // 4. Inject server-side metadata tags and pre-rendered crawlable content
      const renderedHtml = injectMetadataIntoHtml(templateHtml, routeSeo);

      res.status(routeSeo.status);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(renderedHtml);
    } catch (err: any) {
      console.error('[SSR] Error rendering HTML page:', err);
      return next(err);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Admin & CMS API Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal server startup error:', err);
  process.exit(1);
});
