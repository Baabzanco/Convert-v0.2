import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import prisma from './prisma.js';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  checkRateLimit,
  sanitizeString,
  sanitizeContentData,
  stripSensitiveFields,
} from './security.js';
import { ensurePostgresRunning } from './standalone-pg.js';

let passedTests = 0;
let totalTests = 0;

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

export async function runSecurityVerificationSuite(): Promise<boolean> {
  console.log('\n=============================================================');
  console.log('🧪 Starting Security, Infrastructure & Database Verification');
  console.log('=============================================================\n');

  // -----------------------------------------------------------------
  // 1. Firebase Absence Verification
  // -----------------------------------------------------------------
  console.log('1. Checking Firebase Prohibition Compliance...');
  const pkgJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
  const allDeps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
  };

  const firebaseDeps = Object.keys(allDeps).filter(
    (k) => k.toLowerCase().includes('firebase') || k.toLowerCase().includes('firestore')
  );
  assert(firebaseDeps.length === 0, 'No Firebase or Firestore packages in dependencies', `Found: ${firebaseDeps.join(', ')}`);

  const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
  assert(!envFile.includes('FIREBASE'), 'No Firebase configuration in .env');

  // -----------------------------------------------------------------
  // 2. Standalone PostgreSQL & Prisma Connection
  // -----------------------------------------------------------------
  console.log('\n2. Testing Standalone PostgreSQL & Prisma Connection...');
  await ensurePostgresRunning();
  const versionQuery = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version();`;
  assert(
    Boolean(versionQuery[0]?.version && versionQuery[0].version.includes('PostgreSQL')),
    'Direct PostgreSQL connection verified',
    versionQuery[0]?.version
  );

  // -----------------------------------------------------------------
  // 3. Argon2id Password Hashing & Verification
  // -----------------------------------------------------------------
  console.log('\n3. Testing Argon2id Password Hashing & Verification...');
  const testPassword = 'CorrectHorseBatteryStaple!2026';
  const wrongPassword = 'WrongPasswordAttempt!';
  const hashedPassword = await hashPassword(testPassword);

  assert(hashedPassword.startsWith('$argon2id$'), 'Password hash uses Argon2id format');
  const validCheck = await verifyPassword(hashedPassword, testPassword);
  assert(validCheck === true, 'Argon2id correctly verifies matching password');
  const invalidCheck = await verifyPassword(hashedPassword, wrongPassword);
  assert(invalidCheck === false, 'Argon2id rejects incorrect password');

  // -----------------------------------------------------------------
  // 4. Rate Limiting Defense
  // -----------------------------------------------------------------
  console.log('\n4. Testing Rate Limiting Defense...');
  const testIp = '192.168.100.42';
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(`login-test:${testIp}`, 5, 10);
    assert(res.allowed === true, `Attempt #${i + 1} allowed within threshold`);
  }
  const blockedAttempt = checkRateLimit(`login-test:${testIp}`, 5, 10);
  assert(blockedAttempt.allowed === false, '6th attempt correctly blocked by rate limiter');
  assert(blockedAttempt.remaining === 0, 'Remaining attempts set to 0 when blocked');

  // -----------------------------------------------------------------
  // 5. Session Token Cryptographic Security
  // -----------------------------------------------------------------
  console.log('\n5. Testing Session Token Security...');
  const rawToken = generateSessionToken();
  const hashedToken = hashSessionToken(rawToken);
  assert(rawToken.length === 64, 'Raw session token is 256 bits (64 hex characters)');
  assert(hashedToken.length === 64, 'Hashed session token is SHA-256 (64 hex characters)');
  assert(rawToken !== hashedToken, 'Hashed token differs completely from raw token in transport');

  // -----------------------------------------------------------------
  // 6. XSS Sanitization
  // -----------------------------------------------------------------
  console.log('\n6. Testing Stored XSS Sanitization...');
  const dirtyHtml = '<script>alert("xss")</script><img src=x onerror=alert(1)>Hello <b>World</b>';
  const cleanHtml = sanitizeString(dirtyHtml);
  assert(!cleanHtml.includes('<script>'), 'Script tags stripped');
  assert(!cleanHtml.includes('onerror='), 'Unsafe event handlers stripped');

  const dirtyPayload = {
    title: '<script>evil()</script>Title',
    blocks: [{ content: '<script>alert(2)</script>Safe Text' }],
  };
  const cleanPayload = sanitizeContentData(dirtyPayload);
  assert(!cleanPayload.title.includes('<script>'), 'Nested JSON sanitized');
  assert(!cleanPayload.blocks[0].content.includes('<script>'), 'Array elements sanitized');

  // -----------------------------------------------------------------
  // 7. Security Audit Sensitive Data Stripping
  // -----------------------------------------------------------------
  console.log('\n7. Testing Audit Log Redaction...');
  const sensitiveEvent = {
    username: 'admin',
    password: 'SecretPassword123',
    sessionToken: 'abcd1234efgh5678',
    cookie: 'admin_session=test',
    action: 'LOGIN',
  };
  const redactedEvent = stripSensitiveFields(sensitiveEvent);
  assert(redactedEvent.password === '[REDACTED]', 'Password redacted from audit logs');
  assert(redactedEvent.sessionToken === '[REDACTED]', 'Session token redacted from audit logs');
  assert(redactedEvent.cookie === '[REDACTED]', 'Cookie redacted from audit logs');
  assert(redactedEvent.username === 'admin', 'Safe non-sensitive fields preserved');

  // -----------------------------------------------------------------
  // 8. SQL Injection Prevention
  // -----------------------------------------------------------------
  console.log('\n8. Testing SQL Injection Prevention via Prisma...');
  const maliciousUsername = "' OR 1=1 --";
  const injectionResult = await prisma.adminUser.findUnique({
    where: { username: maliciousUsername },
  });
  assert(injectionResult === null, 'Malicious SQL input safely handled as literal string without injection');

  // -----------------------------------------------------------------
  // 9. Database-Backed Session Lifecycle Test
  // -----------------------------------------------------------------
  console.log('\n9. Testing Database-Backed Admin Session Lifecycle...');
  const admin = await prisma.adminUser.findFirst({ where: { username: 'admin' } });
  assert(Boolean(admin), 'Admin user found in database');

  // Create temporary test session
  const testSessionRaw = generateSessionToken();
  const testSessionHash = hashSessionToken(testSessionRaw);
  const expiry = new Date(Date.now() + 60_000);

  const sessionRecord = await prisma.adminSession.create({
    data: {
      sessionToken: testSessionHash,
      adminUserId: admin!.id,
      ipAddress: '127.0.0.1',
      userAgent: 'Automated Test Suite',
      expiresAt: expiry,
    },
  });
  assert(Boolean(sessionRecord.id), 'Session created in PostgreSQL');

  const retrieved = await prisma.adminSession.findUnique({
    where: { sessionToken: testSessionHash },
    include: { adminUser: true },
  });
  assert(retrieved?.adminUser.id === admin!.id, 'Session successfully retrieved by hashed token');

  // Clean up test session
  await prisma.adminSession.delete({ where: { id: sessionRecord.id } });
  const deletedCheck = await prisma.adminSession.findUnique({
    where: { sessionToken: testSessionHash },
  });
  assert(deletedCheck === null, 'Session revoked and removed from PostgreSQL');

  console.log(`\n=============================================================`);
  console.log(`🎉 All ${passedTests}/${totalTests} Security & Verification Tests Passed Successfully!`);
  console.log(`=============================================================\n`);

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityVerificationSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Verification Suite] Error:', err);
      process.exit(1);
    });
}
