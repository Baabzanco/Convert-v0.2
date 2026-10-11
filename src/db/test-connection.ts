import dotenv from 'dotenv';
dotenv.config();

import prisma from './prisma.js';
import { ensurePostgresRunning } from './standalone-pg.js';

export async function testDatabaseConnection(): Promise<{
  connected: boolean;
  version?: string;
  tableCounts?: Record<string, number>;
  latencyMs?: number;
  error?: string;
}> {
  console.log('[Connection Test] Initiating connection test to standalone PostgreSQL...');
  await ensurePostgresRunning();

  const startTime = Date.now();
  try {
    // 1. Raw query to check PostgreSQL version & operational state
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version();`;
    const latencyMs = Date.now() - startTime;
    const versionString = result[0]?.version || 'PostgreSQL (unknown version)';

    console.log(`[Connection Test] ✅ Successfully connected to PostgreSQL in ${latencyMs}ms`);
    console.log(`[Connection Test] Engine version: ${versionString}`);

    // 2. Query table counts across all required normalized schema entities
    const [adminCount, sessionCount, pageCount, seoCount, revisionCount, redirectCount, auditCount] =
      await Promise.all([
        prisma.adminUser.count(),
        prisma.adminSession.count(),
        prisma.page.count(),
        prisma.pageSeo.count(),
        prisma.contentRevision.count(),
        prisma.redirectRule.count(),
        prisma.securityAuditEvent.count(),
      ]);

    const tableCounts = {
      adminUsers: adminCount,
      adminSessions: sessionCount,
      pages: pageCount,
      pageSeo: seoCount,
      contentRevisions: revisionCount,
      redirectRules: redirectCount,
      securityAuditEvents: auditCount,
    };

    console.log('[Connection Test] Schema tables verified:');
    console.table(tableCounts);

    return {
      connected: true,
      version: versionString,
      tableCounts,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error(`[Connection Test] ❌ Failed to connect to PostgreSQL (${latencyMs}ms):`, err.message);
    return {
      connected: false,
      latencyMs,
      error: err.message,
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseConnection()
    .then((res) => {
      if (!res.connected) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Connection Test] Unexpected error:', err);
      process.exit(1);
    });
}
