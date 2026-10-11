import { TOOL_REGISTRY, ToolDefinition } from '../tools/registry.js';
import prisma from '../db/prisma.js';

export interface PageMetadata {
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  jsonLd: any | null;
  prerenderedHtml: string;
  status: number;
}

/**
 * Escapes HTML characters to prevent XSS / attribute breakout
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safely serializes JSON-LD script content.
 * Escapes closing script tags and HTML character sequences to prevent script injection.
 */
export function safeJsonLdStringify(data: any): string {
  if (!data) return '';
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Resolve production origin safely. Never rely on untrusted Host headers.
 */
export function getTrustedOrigin(): string {
  const origin = process.env.APP_URL || 'https://example.com';
  return origin.replace(/\/+$/, '');
}

/**
 * Pre-renders semantic HTML for the home page so search engines have full content
 */
export function renderHomePageHtml(page: any, origin: string): string {
  const content = page?.structuredContent || {};
  const hero = content.hero || {
    headline: 'Secure Document & Image Converter Core',
    subheadline: 'Zero-cloud image and PDF utilities running entirely inside your client browser.',
    ctaText: 'Open Tool Studio',
  };
  const toolDesc = content.toolDescription || {
    name: 'Browser-Local File Processing Engine',
    description: 'All conversions happen strictly on your device.',
  };
  const sections = content.sections || [];
  const faq = content.faq || [];

  return `
    <header class="site-header">
      <nav aria-label="Main Navigation">
        <a href="/">CloudVault Core</a>
        <a href="#features">Features</a>
        <a href="#tools">Tools</a>
        <a href="#architecture">Security</a>
        <a href="#faq">FAQ</a>
      </nav>
    </header>
    <main id="main-content">
      <article>
        <section class="hero-section">
          <h1>${escapeHtml(hero.headline)}</h1>
          <p class="hero-subheadline">${escapeHtml(hero.subheadline)}</p>
        </section>

        <section id="features" class="tool-feature-section">
          <h2>${escapeHtml(toolDesc.name)}</h2>
          <p>${escapeHtml(toolDesc.description)}</p>
        </section>

        <section id="tools" class="tools-directory">
          <h2>Browser-Only Image &amp; PDF Processing Suite</h2>
          <p>100% Client-Side Engine &bull; Zero Server Uploads &bull; Direct in-browser memory execution</p>
          <ul class="tools-list">
            ${TOOL_REGISTRY.map(
              (t) => `
              <li>
                <article>
                  <h3><a href="${origin}${t.canonicalRoute}">${escapeHtml(t.name)}</a></h3>
                  <p>${escapeHtml(t.shortDescription)}</p>
                  <span>Category: ${escapeHtml(t.category)}</span> |
                  <span>Engine: ${escapeHtml(t.processingEngine)}</span> |
                  <span>Max file size: ${t.fileLimits.maxFileSizeMb}MB</span>
                </article>
              </li>`
            ).join('')}
          </ul>
        </section>

        <section id="architecture" class="architecture-section">
          <h2>Core Architectural Foundations</h2>
          ${sections
            .map(
              (s: any) => `
            <div class="architecture-card">
              <h3>${escapeHtml(s.title)}</h3>
              <p>${escapeHtml(s.content)}</p>
            </div>`
            )
            .join('')}
        </section>

        <section id="faq" class="faq-section">
          <h2>Frequently Asked Questions</h2>
          <dl>
            ${faq
              .map(
                (f: any) => `
              <dt><strong>${escapeHtml(f.question)}</strong></dt>
              <dd>${escapeHtml(f.answer)}</dd>`
              )
              .join('')}
          </dl>
        </section>
      </article>
    </main>
  `;
}

/**
 * Pre-renders semantic HTML for a specific tool page so search engines have full content
 */
export function renderToolPageHtml(tool: ToolDefinition, origin: string): string {
  return `
    <header class="site-header">
      <nav aria-label="Main Navigation">
        <a href="/">← Back to All Tools</a>
        <span>${escapeHtml(tool.name)}</span>
      </nav>
    </header>
    <main id="main-content">
      <article class="tool-page-article">
        <header>
          <div class="badge">${tool.category === 'image' ? 'Image Engine' : 'PDF Engine'} • 100% Client-Side</div>
          <h1>${escapeHtml(tool.name)}</h1>
          <p class="tool-summary">${escapeHtml(tool.shortDescription)}</p>
        </header>

        <section class="tool-instructions">
          <h2>About this Browser Tool</h2>
          <p>${escapeHtml(tool.fullDescription)}</p>
        </section>

        <section class="tool-specs">
          <h2>Technical Specifications</h2>
          <ul>
            <li><strong>Processing Engine:</strong> ${escapeHtml(tool.processingEngine)} (No cloud uploads)</li>
            <li><strong>Output Format:</strong> ${escapeHtml(tool.outputFormat)}</li>
            <li><strong>Accepted Formats:</strong> ${escapeHtml(tool.acceptedExtensions.join(', '))}</li>
            <li><strong>Maximum File Size:</strong> ${tool.fileLimits.maxFileSizeMb}MB per file</li>
            <li><strong>Maximum Batch Size:</strong> ${tool.fileLimits.maxBatchCount} files</li>
            ${tool.fileLimits.maxDimensions ? `<li><strong>Max Dimensions:</strong> ${escapeHtml(tool.fileLimits.maxDimensions)}</li>` : ''}
            <li><strong>Compatibility:</strong> ${escapeHtml(tool.browserCompatibility)}</li>
          </ul>
        </section>

        <section class="privacy-guarantee">
          <h2>Privacy &amp; Security Guarantee</h2>
          <p>
            All file processing is performed entirely within your local browser runtime. 
            Your documents and images are never uploaded to any remote server or third-party cloud.
          </p>
        </section>

        <div id="tool-workspace-mount" aria-live="polite">
          <noscript>
            <p><strong>Note:</strong> JavaScript is required to run the client-side processing engine interactively.</p>
          </noscript>
        </div>
      </article>
    </main>
  `;
}

/**
 * Pre-renders 404 Not Found page HTML
 */
export function renderNotFoundHtml(): string {
  return `
    <main id="main-content" style="text-align: center; padding: 4rem 1rem;">
      <article>
        <h1>404 - Page Not Found</h1>
        <p>The requested route does not exist on this privacy-first file conversion platform.</p>
        <p><a href="/" style="color: #38bdf8; text-decoration: underline;">Return to Homepage</a></p>
      </article>
    </main>
  `;
}

/**
 * Core Resolver: Returns complete SEO metadata, structured data, and crawlable HTML
 * for any given pathname.
 */
export async function resolveRouteSeo(pathname: string): Promise<PageMetadata> {
  const origin = getTrustedOrigin();
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  // 1. Homepage Route
  if (cleanPath === '/' || cleanPath === '/home') {
    const homePage = await prisma.page.findFirst({
      where: { slug: 'home', status: 'PUBLISHED' },
      include: { seoSettings: true },
    });

    const title = homePage?.seoSettings?.metaTitle || 'CloudVault Core | Free Client-Side Image & PDF Tools';
    const description =
      homePage?.seoSettings?.metaDescription ||
      'Free, privacy-first online image and PDF tools. Convert, compress, resize, merge, and split files 100% locally in your browser with zero server uploads.';
    const canonical = homePage?.seoSettings?.canonicalUrl || `${origin}/`;
    const robots = homePage?.seoSettings?.robots || 'index, follow';
    const ogTitle = homePage?.seoSettings?.ogTitle || title;
    const ogDescription = homePage?.seoSettings?.ogDescription || description;
    const ogImage = homePage?.seoSettings?.ogImage || `${origin}/og-image.png`;
    const twitterCard = homePage?.seoSettings?.twitterCard || 'summary_large_image';

    const jsonLd = homePage?.seoSettings?.structuredData || {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'CloudVault Core',
      url: `${origin}/`,
      description,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any modern web browser',
      browserRequirements: 'Requires JavaScript. Runs 100% client-side.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    };

    return {
      title,
      metaDescription: description,
      canonicalUrl: canonical,
      robots,
      ogTitle,
      ogDescription,
      ogImage,
      ogType: 'website',
      twitterCard,
      jsonLd,
      prerenderedHtml: renderHomePageHtml(homePage, origin),
      status: 200,
    };
  }

  // 2. Canonical Tool Routes: /tools/:slug
  const toolMatch = cleanPath.match(/^\/tools\/([a-zA-Z0-9_-]+)$/);
  if (toolMatch) {
    const slug = toolMatch[1];
    const tool = TOOL_REGISTRY.find((t) => t.slug === slug);

    if (tool) {
      const title = `${tool.name} - Free Browser-Only Tool | CloudVault Core`;
      const description = `${tool.shortDescription} 100% private in-browser processing with zero server uploads.`;
      const canonical = `${origin}${tool.canonicalRoute}`;
      const robots = 'index, follow';
      const ogTitle = `${tool.name} - 100% Local Browser Engine`;
      const ogDescription = tool.fullDescription;
      const ogImage = `${origin}/og-${tool.slug}.png`;
      const twitterCard = 'summary_large_image';

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: tool.name,
        url: canonical,
        description: tool.fullDescription,
        applicationCategory: tool.category === 'image' ? 'ImageEditingApplication' : 'DocumentApplication',
        operatingSystem: 'Any modern web browser',
        browserRequirements: tool.browserCompatibility,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      };

      return {
        title,
        metaDescription: description,
        canonicalUrl: canonical,
        robots,
        ogTitle,
        ogDescription,
        ogImage,
        ogType: 'article',
        twitterCard,
        jsonLd,
        prerenderedHtml: renderToolPageHtml(tool, origin),
        status: 200,
      };
    }
  }

  // 3. Published CMS Page Route (e.g. /privacy, /terms, etc.)
  const cmsSlug = cleanPath.replace(/^\//, '');
  const publishedPage = await prisma.page.findFirst({
    where: { slug: cmsSlug, status: 'PUBLISHED' },
    include: { seoSettings: true },
  });

  if (publishedPage) {
    const title = publishedPage.seoSettings?.metaTitle || `${publishedPage.title} | CloudVault Core`;
    const description =
      publishedPage.seoSettings?.metaDescription ||
      `Read ${publishedPage.title} on CloudVault Core - Private, browser-only file utilities.`;
    const canonical = publishedPage.seoSettings?.canonicalUrl || `${origin}/${publishedPage.slug}`;
    const robots = publishedPage.seoSettings?.robots || 'index, follow';
    const ogTitle = publishedPage.seoSettings?.ogTitle || title;
    const ogDescription = publishedPage.seoSettings?.ogDescription || description;
    const ogImage = publishedPage.seoSettings?.ogImage || `${origin}/og-image.png`;
    const twitterCard = publishedPage.seoSettings?.twitterCard || 'summary_large_image';

    const jsonLd = publishedPage.seoSettings?.structuredData || {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: publishedPage.title,
      url: canonical,
      description,
    };

    return {
      title,
      metaDescription: description,
      canonicalUrl: canonical,
      robots,
      ogTitle,
      ogDescription,
      ogImage,
      ogType: 'website',
      twitterCard,
      jsonLd,
      prerenderedHtml: `
        <header class="site-header"><nav><a href="/">← Home</a></nav></header>
        <main id="main-content">
          <article>
            <h1>${escapeHtml(publishedPage.title)}</h1>
            <div>${escapeHtml(JSON.stringify(publishedPage.structuredContent))}</div>
          </article>
        </main>`,
      status: 200,
    };
  }

  // 4. Route Not Found
  return {
    title: '404 Page Not Found | CloudVault Core',
    metaDescription: 'The page you requested does not exist.',
    canonicalUrl: `${origin}${cleanPath}`,
    robots: 'noindex, nofollow',
    ogTitle: '404 Page Not Found',
    ogDescription: 'The page you requested could not be found.',
    ogImage: `${origin}/og-image.png`,
    ogType: 'website',
    twitterCard: 'summary',
    jsonLd: null,
    prerenderedHtml: renderNotFoundHtml(),
    status: 404,
  };
}

/**
 * Injects complete server-side metadata and pre-rendered crawlable HTML into the template
 */
export function injectMetadataIntoHtml(templateHtml: string, metadata: PageMetadata): string {
  let html = templateHtml;

  // 1. Replace or insert <title>
  const safeTitle = escapeHtml(metadata.title);
  if (/<title>.*?<\/title>/is.test(html)) {
    html = html.replace(/<title>.*?<\/title>/is, `<title>${safeTitle}</title>`);
  } else {
    html = html.replace('</head>', `  <title>${safeTitle}</title>\n</head>`);
  }

  // 2. Remove any pre-existing meta description, robots, canonical, og, and twitter tags in template to prevent duplicates
  html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
  html = html.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '');
  html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
  html = html.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');

  // 3. Assemble clean metadata tags block
  const metaTags: string[] = [];
  metaTags.push(`  <meta name="description" content="${escapeHtml(metadata.metaDescription)}" />`);
  metaTags.push(`  <meta name="robots" content="${escapeHtml(metadata.robots)}" />`);
  metaTags.push(`  <link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" />`);

  // Open Graph
  metaTags.push(`  <meta property="og:type" content="${escapeHtml(metadata.ogType)}" />`);
  metaTags.push(`  <meta property="og:title" content="${escapeHtml(metadata.ogTitle)}" />`);
  metaTags.push(`  <meta property="og:description" content="${escapeHtml(metadata.ogDescription)}" />`);
  metaTags.push(`  <meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}" />`);
  if (metadata.ogImage) {
    metaTags.push(`  <meta property="og:image" content="${escapeHtml(metadata.ogImage)}" />`);
  }

  // Twitter Card
  metaTags.push(`  <meta name="twitter:card" content="${escapeHtml(metadata.twitterCard)}" />`);
  metaTags.push(`  <meta name="twitter:title" content="${escapeHtml(metadata.ogTitle)}" />`);
  metaTags.push(`  <meta name="twitter:description" content="${escapeHtml(metadata.ogDescription)}" />`);
  if (metadata.ogImage) {
    metaTags.push(`  <meta name="twitter:image" content="${escapeHtml(metadata.ogImage)}" />`);
  }

  // JSON-LD structured data
  if (metadata.jsonLd) {
    metaTags.push(
      `  <script type="application/ld+json">${safeJsonLdStringify(metadata.jsonLd)}</script>`
    );
  }

  // Insert assembled meta tags right before </head>
  html = html.replace('</head>', `${metaTags.join('\n')}\n</head>`);

  // 4. Inject pre-rendered crawlable HTML into <div id="root">
  if (html.includes('<div id="root"></div>')) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${metadata.prerenderedHtml}</div>`
    );
  } else if (html.includes('<div id="root">')) {
    html = html.replace(
      /<div id="root">[\s\S]*?<\/div>/,
      `<div id="root">${metadata.prerenderedHtml}</div>`
    );
  }

  return html;
}
