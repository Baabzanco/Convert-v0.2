import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import prisma from './prisma.js';
import {
  hashPassword,
  verifyPassword,
  validateAndSanitizeUrl,
  sanitizeString,
  sanitizeContentData,
} from './security.js';
import { ensurePostgresRunning } from './standalone-pg.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function waitForServer(url: string, maxAttempts = 15): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready within timeout`);
}

export async function runPhase2TestSuite(): Promise<boolean> {
  console.log('\n=============================================================');
  console.log('🧪 Starting Phase 2: Secure Inline CMS & Page Content Tests');
  console.log('=============================================================\n');

  await ensurePostgresRunning();
  const PORT = process.env.APP_PORT || '3000';
  const BASE_URL = `http://127.0.0.1:${PORT}`;
  await waitForServer(BASE_URL);

  // -----------------------------------------------------------------
  // 1. Firebase Prohibition Verification
  // -----------------------------------------------------------------
  console.log('1. Verifying Zero Firebase Dependencies...');
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const fbMatches = Object.keys(allDeps).filter((k) => k.toLowerCase().includes('firebase'));
  assert(fbMatches.length === 0, 'No Firebase packages in package.json', fbMatches.join(', '));

  // -----------------------------------------------------------------
  // 2. Media Upload & File Storage Absence Verification
  // -----------------------------------------------------------------
  console.log('\n2. Verifying No Server-Side User Media Upload / Storage...');
  const serverSource = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf-8');
  assert(!serverSource.includes('multer'), 'No multer file upload middleware');
  assert(!serverSource.includes('formidable'), 'No formidable upload middleware');
  assert(!serverSource.includes('express-fileupload'), 'No express-fileupload middleware');
  assert(!serverSource.includes('busboy'), 'No busboy upload middleware');

  // Verify Prisma schema has no file storage / media tables
  const schemaSource = fs.readFileSync(path.resolve(process.cwd(), 'prisma/schema.prisma'), 'utf-8');
  assert(!schemaSource.includes('model Media') && !schemaSource.includes('model Upload'), 'No media/upload tables in Prisma schema');

  // -----------------------------------------------------------------
  // 3. Anonymous Access to Protected Routes is Denied (401)
  // -----------------------------------------------------------------
  console.log('\n3. Testing Anonymous Access Rejection on Protected CMS Routes...');
  const anonPagesRes = await fetch(`${BASE_URL}/api/admin/pages`);
  assert(anonPagesRes.status === 401, 'GET /api/admin/pages returns 401 for anonymous visitor');

  const anonAuditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`);
  assert(anonAuditRes.status === 401, 'GET /api/admin/audit-logs returns 401 for anonymous visitor');

  const anonDraftRes = await fetch(`${BASE_URL}/api/admin/pages/some-id/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 1, draftContent: {} }),
  });
  assert(anonDraftRes.status === 401, 'PUT /api/admin/pages/:id/draft returns 401 for anonymous visitor');

  const anonPublishRes = await fetch(`${BASE_URL}/api/admin/pages/some-id/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 1 }),
  });
  assert(anonPublishRes.status === 401, 'POST /api/admin/pages/:id/publish returns 401 for anonymous visitor');

  // -----------------------------------------------------------------
  // 4. Administrator Authentication & Session Lifecycle (Login / Cookie / Logout)
  // -----------------------------------------------------------------
  console.log('\n4. Testing Administrator Authentication & Session Transport...');
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: process.env.ADMIN_INITIAL_PASSWORD || 'SecureAdminPassword2026!',
    }),
  });

  assert(loginRes.status === 200, 'Admin login succeeds with valid credentials');
  const cookieHeader = loginRes.headers.get('set-cookie');
  assert(Boolean(cookieHeader && cookieHeader.includes('admin_session=')), 'HTTP-only session cookie returned on login');

  // Extract raw cookie value for subsequent authenticated calls
  const sessionCookie = cookieHeader!.split(';')[0];

  // Verify /api/admin/auth/me with session cookie
  const meRes = await fetch(`${BASE_URL}/api/admin/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  const meData = await meRes.json();
  assert(meRes.status === 200 && meData.user.username === 'admin', 'GET /api/admin/auth/me authenticates admin session');

  // -----------------------------------------------------------------
  // 5. Draft Content Isolation (Draft is NEVER leaked to public)
  // -----------------------------------------------------------------
  console.log('\n5. Testing Draft Content Isolation from Anonymous Visitors...');
  // Fetch existing Home page
  const homePage = await prisma.page.findUnique({
    where: { slug: 'home' },
  });
  assert(Boolean(homePage), 'Home page found in database');

  const secretDraftHeading = `Secret Unpublished Draft Headline - Test ${Date.now()}`;
  const modifiedContent = {
    ...((homePage!.structuredContent as any) || {}),
    hero: {
      ...((homePage!.structuredContent as any)?.hero || {}),
      headline: secretDraftHeading,
    },
  };

  // Save as draft using authenticated session
  const saveDraftRes = await fetch(`${BASE_URL}/api/admin/pages/${homePage!.id}/draft`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      version: homePage!.version,
      draftContent: modifiedContent,
      changeSummary: 'Test draft saving isolation',
    }),
  });

  const saveDraftData = await saveDraftRes.json();
  assert(saveDraftRes.status === 200 && saveDraftData.success === true, 'Draft saved successfully by authenticated admin');
  const updatedVersion = saveDraftData.page.version;

  // Now query as an anonymous public visitor: MUST NOT contain the secret draft headline!
  const publicRes = await fetch(`${BASE_URL}/api/public/pages/home`);
  assert(publicRes.status === 200, 'Public page endpoint responds with 200');
  const publicData = await publicRes.json();
  assert(
    !JSON.stringify(publicData).includes(secretDraftHeading),
    'Anonymous public response strictly isolates draft content (no secret draft leaked)'
  );
  assert(
    publicData.page.draftContent === undefined,
    'Anonymous public response strictly omits draftContent field entirely'
  );

  // -----------------------------------------------------------------
  // 6. Publishing Updates Public Content & Revisions Atomically
  // -----------------------------------------------------------------
  console.log('\n6. Testing Publishing Atomicity & Revision Creation...');
  const publishedHeadline = `Verified Published Headline - ${Date.now()}`;
  const publishPayload = {
    ...modifiedContent,
    hero: {
      ...modifiedContent.hero,
      headline: publishedHeadline,
    },
  };

  const publishRes = await fetch(`${BASE_URL}/api/admin/pages/${homePage!.id}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      version: updatedVersion,
      content: publishPayload,
      changeSummary: 'Official test publication',
    }),
  });

  const publishData = await publishRes.json();
  assert(publishRes.status === 200 && publishData.success === true, 'Publish succeeds atomically');
  const postPublishVersion = publishData.page.version;

  // Verify public response now contains the published headline
  const publicAfterPublishRes = await fetch(`${BASE_URL}/api/public/pages/home`);
  const publicAfterPublishData = await publicAfterPublishRes.json();
  assert(
    publicAfterPublishData.page.structuredContent.hero.headline === publishedHeadline,
    'Public page immediately delivers the newly published content'
  );

  // -----------------------------------------------------------------
  // 7. Optimistic Concurrency Control (Prevents Overwrites)
  // -----------------------------------------------------------------
  console.log('\n7. Testing Optimistic Concurrency Conflict Rejection (409 Conflict)...');
  // Attempt to save draft with an outdated / stale version (e.g. version 1 instead of postPublishVersion)
  const staleVersion = postPublishVersion - 1;
  const staleConflictRes = await fetch(`${BASE_URL}/api/admin/pages/${homePage!.id}/draft`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      version: staleVersion,
      draftContent: { test: 'stale overwrite attempt' },
    }),
  });

  const staleConflictData = await staleConflictRes.json();
  assert(
    staleConflictRes.status === 409 && staleConflictData.code === 'CONCURRENCY_CONFLICT',
    'Outdated editing session rejected with HTTP 409 CONCURRENCY_CONFLICT'
  );

  // -----------------------------------------------------------------
  // 8. Revision History & Safe Revision Restoration
  // -----------------------------------------------------------------
  console.log('\n8. Testing Revision History & Revision Restoration...');
  const revisionsRes = await fetch(`${BASE_URL}/api/admin/pages/${homePage!.id}/preview`, {
    headers: { Cookie: sessionCookie },
  });
  const previewData = await revisionsRes.json();
  assert(previewData.page.revisions.length >= 2, 'Revision history recorded in database');

  const earliestRevision = previewData.page.revisions[previewData.page.revisions.length - 1];
  const restoreRes = await fetch(
    `${BASE_URL}/api/admin/pages/${homePage!.id}/revisions/${earliestRevision.id}/restore`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        expectedPageVersion: postPublishVersion,
        changeSummary: 'Restoring earliest revision in test',
      }),
    }
  );

  const restoreData = await restoreRes.json();
  assert(restoreRes.status === 200 && restoreData.success === true, 'Previous revision restored safely');

  // Verify that an audit revision was appended to history
  const updatedRevs = await prisma.contentRevision.findMany({
    where: { pageId: homePage!.id },
    orderBy: { revisionNumber: 'desc' },
  });
  assert(
    updatedRevs[0].changeSummary?.includes('Restoring earliest revision') === true,
    'Forward revision record created for the restore action (history preserved)'
  );

  // -----------------------------------------------------------------
  // 9. Stored XSS Payload Sanitization
  // -----------------------------------------------------------------
  console.log('\n9. Testing Stored XSS Payload Neutralization...');
  const maliciousXssHeading = '<script>alert("XSS")</script><img src=x onerror=alert(1)>Sanitized Heading';
  const cleanString = sanitizeString(maliciousXssHeading);
  assert(!cleanString.includes('<script>'), 'Script tags stripped by sanitizer');
  assert(!cleanString.includes('onerror='), 'Malicious event handlers stripped by sanitizer');

  const dirtyPayload = {
    title: '<script>evil()</script>Test',
    nested: { paragraph: '<img src=x onerror=stealCookies()>Clean text' },
  };
  const cleanPayload = sanitizeContentData(dirtyPayload);
  assert(!cleanPayload.title.includes('<script>'), 'Nested object XSS sanitized');
  assert(!cleanPayload.nested.paragraph.includes('onerror='), 'Nested attribute XSS sanitized');

  // -----------------------------------------------------------------
  // 10. URL Scheme Validation & Phishing Rejection
  // -----------------------------------------------------------------
  console.log('\n10. Testing URL Scheme Validation & Rejection of Malicious URIs...');
  assert(validateAndSanitizeUrl('javascript:alert(1)') === null, 'javascript: URI rejected');
  assert(validateAndSanitizeUrl('data:text/html,<script>alert(1)</script>') === null, 'data: URI rejected');
  assert(validateAndSanitizeUrl('vbscript:msgbox(1)') === null, 'vbscript: URI rejected');
  assert(validateAndSanitizeUrl('//attacker.com/phish') === null, 'Protocol-relative // URL rejected');
  assert(validateAndSanitizeUrl('/features') === '/features', 'Safe relative URL permitted');
  assert(validateAndSanitizeUrl('https://example.com/docs') === 'https://example.com/docs', 'Safe https URL permitted');

  // -----------------------------------------------------------------
  // 11. Per-Page SEO Settings & Public Metadata Generation
  // -----------------------------------------------------------------
  console.log('\n11. Testing Per-Page SEO Settings Update & Public Metadata Delivery...');
  const seoUpdateRes = await fetch(`${BASE_URL}/api/admin/pages/${homePage!.id}/seo`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      metaTitle: 'CloudVault Core | Secure File Operations',
      metaDescription: 'Zero-upload client-side file conversions backed by standalone PostgreSQL.',
      canonicalUrl: 'https://example.com/home',
      robots: 'index, follow',
      preferredH1: 'CloudVault Primary Heading',
      ogTitle: 'CloudVault OG Title',
      ogDescription: 'CloudVault OG Description',
      twitterCard: 'summary_large_image',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'CloudVault Core',
      },
    }),
  });

  const seoData = await seoUpdateRes.json();
  assert(seoUpdateRes.status === 200 && seoData.success === true, 'SEO settings updated by authorized admin');

  // Verify public delivery reflects updated SEO metadata
  const publicSeoRes = await fetch(`${BASE_URL}/api/public/pages/home`);
  const publicSeoData = await publicSeoRes.json();
  assert(
    publicSeoData.page.seoSettings.metaTitle === 'CloudVault Core | Secure File Operations',
    'Public metadata correctly emits updated SEO title'
  );
  assert(
    publicSeoData.page.seoSettings.structuredData['@type'] === 'WebApplication',
    'Public metadata safely emits validated structured JSON-LD schema'
  );

  // -----------------------------------------------------------------
  // 12. Public Redirect Rules
  // -----------------------------------------------------------------
  console.log('\n12. Testing Public Redirect Rules...');
  const redirectRes = await fetch(`${BASE_URL}/api/public/pages/legacy-home`);
  const redirectData = await redirectRes.json();
  assert(
    redirectRes.status === 301 && redirectData.redirect === true && redirectData.targetPath === '/home',
    'Configured 301 redirect rule executes properly on public route'
  );

  // -----------------------------------------------------------------
  // 13. Admin Session Invalidation on Logout
  // -----------------------------------------------------------------
  console.log('\n13. Testing Admin Logout & Session Invalidation...');
  const logoutRes = await fetch(`${BASE_URL}/api/admin/auth/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie },
  });
  assert(logoutRes.status === 200, 'Logout succeeds');

  // Subsequent call with previous cookie MUST be rejected
  const postLogoutMe = await fetch(`${BASE_URL}/api/admin/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  assert(postLogoutMe.status === 401, 'Subsequent request with revoked session cookie rejected with 401');

  console.log(`\n=============================================================`);
  console.log(`🎉 All ${passedTests}/${totalTests} Phase 2 CMS & Security Tests Passed Successfully!`);
  console.log(`=============================================================\n`);

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase2TestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Phase 2 Test Suite] Error:', err);
      process.exit(1);
    });
}
