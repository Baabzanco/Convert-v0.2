import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import prisma from '../db/prisma.js';
import { ensurePostgresRunning } from '../db/standalone-pg.js';
import { TOOL_REGISTRY } from '../tools/registry.js';
import { safeJsonLdStringify, escapeHtml, getTrustedOrigin } from '../server/seo.js';

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
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready within timeout`);
}

export async function runPhase36TestSuite(): Promise<boolean> {
  console.log('\n=============================================================');
  console.log('🧪 Starting Phase 3.6: SEO Infrastructure & Crawlability Suite');
  console.log('=============================================================\n');

  await ensurePostgresRunning();
  const PORT = process.env.APP_PORT || '3000';
  const BASE_URL = `http://127.0.0.1:${PORT}`;
  await waitForServer(BASE_URL);

  const trustedOrigin = getTrustedOrigin();

  // -----------------------------------------------------------------
  // 1. Direct Route Resolution for All 9 Tools
  // -----------------------------------------------------------------
  console.log('1. Testing Direct HTTP Resolution for all 9 Tool Routes...');
  for (const tool of TOOL_REGISTRY) {
    const res = await fetch(`${BASE_URL}${tool.canonicalRoute}`);
    assert(res.status === 200, `Direct navigation to ${tool.canonicalRoute} returns 200 OK`);

    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('text/html'), `${tool.canonicalRoute} returns text/html content-type`);

    const html = await res.text();

    // Verify Title
    assert(
      html.includes(`<title>${escapeHtml(tool.name)} - Free Browser-Only Tool | CloudVault Core</title>`),
      `${tool.slug} emits correct page-specific <title>`
    );

    // Verify Meta Description
    assert(
      html.includes(`name="description" content="${escapeHtml(tool.shortDescription)} 100% private in-browser processing with zero server uploads."`),
      `${tool.slug} emits correct page-specific meta description`
    );

    // Verify Canonical Link
    assert(
      html.includes(`<link rel="canonical" href="${trustedOrigin}${tool.canonicalRoute}" />`),
      `${tool.slug} emits trusted canonical URL`
    );

    // Verify OpenGraph & Twitter
    assert(html.includes(`property="og:title"`), `${tool.slug} emits og:title`);
    assert(html.includes(`name="twitter:card"`), `${tool.slug} emits twitter:card`);

    // Verify Crawlable Prerendered HTML Content in #root
    assert(
      html.includes(`<h1>${escapeHtml(tool.name)}</h1>`),
      `${tool.slug} includes crawlable h1 heading inside response HTML`
    );
    assert(
      html.includes(escapeHtml(tool.fullDescription)),
      `${tool.slug} includes crawlable fullDescription in response HTML`
    );
    assert(
      html.includes(escapeHtml(tool.processingEngine)),
      `${tool.slug} includes crawlable processingEngine specification`
    );

    // Verify JSON-LD Structured Data
    assert(
      html.includes('<script type="application/ld+json">') && html.includes(escapeHtml(tool.name)),
      `${tool.slug} includes safe JSON-LD structured data`
    );
  }

  // -----------------------------------------------------------------
  // 2. Direct Navigation to Homepage & Crawlable Content
  // -----------------------------------------------------------------
  console.log('\n2. Testing Homepage SEO Metadata & Crawlable Content...');
  const homeRes = await fetch(`${BASE_URL}/`);
  assert(homeRes.status === 200, 'Homepage returns 200 OK');
  const homeHtml = await homeRes.text();
  assert(homeHtml.includes('<title>'), 'Homepage includes <title>');
  assert(homeHtml.includes('name="description"'), 'Homepage includes meta description');
  assert(homeHtml.includes(`rel="canonical"`), 'Homepage includes canonical link');
  assert(homeHtml.includes('id="root"'), 'Homepage contains #root container');
  assert(homeHtml.includes('Browser-Only Image &amp; PDF Processing Suite'), 'Homepage contains crawlable tools directory in HTML');

  // -----------------------------------------------------------------
  // 3. 404 Response for Unknown Routes
  // -----------------------------------------------------------------
  console.log('\n3. Testing 404 Response for Unknown Routes...');
  const notFoundRes = await fetch(`${BASE_URL}/unknown-random-route-999`);
  assert(notFoundRes.status === 404, 'Unknown route returns 404 Not Found HTTP status');
  const notFoundHtml = await notFoundRes.text();
  assert(notFoundHtml.includes('404 - Page Not Found'), 'Unknown route returns 404 HTML body');
  assert(notFoundHtml.includes('name="robots" content="noindex, nofollow"'), 'Unknown route sets noindex, nofollow robots directive');

  // -----------------------------------------------------------------
  // 4. XML Sitemap Dynamic Generation
  // -----------------------------------------------------------------
  console.log('\n4. Testing Dynamic XML Sitemap...');
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  assert(sitemapRes.status === 200, 'Sitemap endpoint returns 200 OK');
  assert(
    (sitemapRes.headers.get('content-type') || '').includes('application/xml'),
    'Sitemap returns application/xml'
  );
  const sitemapXml = await sitemapRes.text();
  assert(sitemapXml.includes('<urlset'), 'Sitemap is valid XML urlset');
  assert(sitemapXml.includes(`${trustedOrigin}/`), 'Sitemap includes homepage');
  for (const tool of TOOL_REGISTRY) {
    assert(
      sitemapXml.includes(`${trustedOrigin}${tool.canonicalRoute}`),
      `Sitemap includes canonical tool route ${tool.canonicalRoute}`
    );
  }

  // -----------------------------------------------------------------
  // 5. Robots.txt Generation
  // -----------------------------------------------------------------
  console.log('\n5. Testing Robots.txt Directives...');
  const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
  assert(robotsRes.status === 200, 'Robots.txt returns 200 OK');
  assert(
    (robotsRes.headers.get('content-type') || '').includes('text/plain'),
    'Robots.txt returns text/plain'
  );
  const robotsTxt = await robotsRes.text();
  assert(robotsTxt.includes('User-agent: *'), 'Robots.txt has User-agent directive');
  assert(robotsTxt.includes('Disallow: /api/admin/'), 'Robots.txt disallows admin API');
  assert(robotsTxt.includes(`Sitemap: ${trustedOrigin}/sitemap.xml`), 'Robots.txt references dynamic sitemap');

  // -----------------------------------------------------------------
  // 6. Configured 301 Redirect Rules
  // -----------------------------------------------------------------
  console.log('\n6. Testing Configured 301 Redirect Rules...');
  const redirectRes = await fetch(`${BASE_URL}/legacy-home`, { redirect: 'manual' });
  assert(redirectRes.status === 301, 'Configured legacy route returns 301 Moved Permanently');
  assert(redirectRes.headers.get('location') === '/home', 'Redirect location header points to /home');

  // -----------------------------------------------------------------
  // 7. Safe JSON-LD Serialization & XSS Prevention
  // -----------------------------------------------------------------
  console.log('\n7. Testing Safe JSON-LD Serialization & HTML Escaping...');
  const maliciousObject = {
    '@context': 'https://schema.org',
    name: '</script><script>alert("xss")</script>',
    description: 'Safe & secure "test" with <tags>',
  };
  const safeSerialized = safeJsonLdStringify(maliciousObject);
  assert(!safeSerialized.includes('</script>'), 'safeJsonLdStringify neutralizes </script> tags');
  assert(safeSerialized.includes('\\u003c/script\\u003e'), 'Script tags encoded to unicode escapes');

  const escaped = escapeHtml('<img src=x onerror=alert(1)>');
  assert(!escaped.includes('<img'), 'escapeHtml escapes < and > brackets');

  console.log(`\n=============================================================`);
  console.log(`🎉 All ${passedTests}/${totalTests} Phase 3.6 SEO & Routing Tests Passed Successfully!`);
  console.log(`=============================================================\n`);

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase36TestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Phase 3.6 Test Suite] Error:', err);
      process.exit(1);
    });
}
