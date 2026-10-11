import dotenv from 'dotenv';
dotenv.config();

import prisma from './prisma.js';
import { hashPassword, logSecurityAuditEvent } from './security.js';
import { ensurePostgresRunning } from './standalone-pg.js';

export async function runDatabaseSeed(): Promise<void> {
  console.log('[Seed] Ensuring standalone PostgreSQL database is active...');
  await ensurePostgresRunning();

  console.log('[Seed] Seeding initial administrator account...');

  const initialUsername = process.env.ADMIN_INITIAL_USERNAME || 'admin';
  const initialEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@example.com';
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'SecureAdminPassword2026!';

  // Check if admin user already exists
  let admin = await prisma.adminUser.findFirst({
    where: {
      OR: [{ username: initialUsername }, { email: initialEmail }],
    },
  });

  if (!admin) {
    const passwordHash = await hashPassword(initialPassword);
    admin = await prisma.adminUser.create({
      data: {
        username: initialUsername,
        email: initialEmail,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log(`[Seed] Initial admin user created: "${admin.username}" (${admin.email})`);

    await logSecurityAuditEvent({
      action: 'ADMIN_BOOTSTRAP_CREATED',
      adminUserId: admin.id,
      resourceType: 'ADMIN_USER',
      resourceId: admin.id,
      ipAddress: '127.0.0.1',
      userAgent: 'CLI Seed Runner',
      status: 'SUCCESS',
      details: {
        username: admin.username,
        role: admin.role,
        note: 'Initial administrator user bootstrapped with Argon2id hash',
      },
    });
  } else {
    console.log(`[Seed] Administrator account already exists: "${admin.username}"`);
  }

  // Seed sample initial CMS page
  const homeSlug = 'home';
  const existingPage = await prisma.page.findUnique({
    where: { slug: homeSlug },
  });

  if (!existingPage) {
    const sampleStructuredContent = {
      hero: {
        headline: 'Next-Generation Content Platform',
        subheadline: 'Engineered with standalone PostgreSQL, Prisma ORM, and enterprise-grade security.',
        ctaText: 'Explore Features',
        ctaLink: '/features',
      },
      sections: [
        {
          id: 'sec-architecture',
          title: 'Infrastructure Overview',
          content: 'Direct PostgreSQL connectivity without third-party vendor lock-in or Firebase dependencies.',
        },
        {
          id: 'sec-security',
          title: 'Defense in Depth',
          content: 'Argon2id password hashing, HTTP-only SameSite cookies, audit logs, and SQL injection prevention.',
        },
      ],
    };

    const newPage = await prisma.page.create({
      data: {
        slug: homeSlug,
        title: 'Home',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        structuredContent: sampleStructuredContent,
        seoSettings: {
          create: {
            metaTitle: 'Home | Standalone CMS',
            metaDescription: 'High performance content management backed by standalone PostgreSQL.',
            canonicalUrl: 'https://example.com/',
            ogTitle: 'Home | Standalone CMS',
            ogDescription: 'Direct PostgreSQL connectivity and hardened security.',
            twitterCard: 'summary_large_image',
            robots: 'index, follow',
            structuredData: {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Admin & Content Management System',
              url: 'https://example.com',
            },
          },
        },
        revisions: {
          create: {
            revisionNumber: 1,
            authorId: admin.id,
            title: 'Initial Home Page Content',
            structuredContent: sampleStructuredContent,
            changeSummary: 'Bootstrap initial page content',
          },
        },
      },
    });
    console.log(`[Seed] Seeded initial page "${newPage.title}" (${newPage.slug}) with SEO and revision #1`);
  }

  // Seed sample redirect rule
  const existingRedirect = await prisma.redirectRule.findUnique({
    where: { sourcePath: '/legacy-home' },
  });

  if (!existingRedirect) {
    await prisma.redirectRule.create({
      data: {
        sourcePath: '/legacy-home',
        targetPath: '/home',
        statusCode: 301,
        isActive: true,
        description: 'Permanent redirect from legacy home URL',
      },
    });
    console.log('[Seed] Seeded initial 301 redirect rule: /legacy-home -> /home');
  }

  console.log('[Seed] Database seeding completed successfully.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDatabaseSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Database seed failed:', err);
      process.exit(1);
    });
}
