import prisma from '../db/prisma.js';
import { TOOL_REGISTRY } from '../tools/registry.js';
import { getTrustedOrigin } from './seo.js';

/**
 * Generates standards-compliant XML sitemap based strictly on published content and tools.
 */
export async function generateSitemapXml(): Promise<string> {
  const origin = getTrustedOrigin();

  // 1. Fetch strictly PUBLISHED CMS pages with their SEO settings
  const publishedPages = await prisma.page.findMany({
    where: { status: 'PUBLISHED' },
    include: { seoSettings: true },
  });

  const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [];

  // Home Page
  const homePage = publishedPages.find((p) => p.slug === 'home');
  const homeLastMod = (homePage?.updatedAt || new Date()).toISOString().split('T')[0];
  urls.push({
    loc: `${origin}/`,
    lastmod: homeLastMod,
    changefreq: 'daily',
    priority: '1.0',
  });

  // 2. All 9 Canonical Tool Routes
  for (const tool of TOOL_REGISTRY) {
    urls.push({
      loc: `${origin}${tool.canonicalRoute}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.9',
    });
  }

  // 3. Other Published CMS Pages (e.g. /privacy, /terms) excluding home
  for (const page of publishedPages) {
    if (page.slug === 'home') continue;
    // Do not include if robots directive contains noindex
    if (page.seoSettings?.robots?.toLowerCase().includes('noindex')) continue;

    urls.push({
      loc: `${origin}/${page.slug}`,
      lastmod: page.updatedAt.toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.7',
    });
  }

  const xmlEntries = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
}

/**
 * Generates standards-compliant robots.txt.
 * Disallows admin and private API paths, references the dynamic XML sitemap.
 */
export function generateRobotsTxt(): string {
  const origin = getTrustedOrigin();
  return `# CloudVault Core Robots Directives
User-agent: *
Disallow: /api/admin/
Disallow: /api/auth/
Disallow: /admin

# Canonical XML Sitemap
Sitemap: ${origin}/sitemap.xml
`;
}
