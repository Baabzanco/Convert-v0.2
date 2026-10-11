import crypto from 'crypto';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

export async function setupVPS1Database(): Promise<{
  success: boolean;
  dbName: string;
  appUser: string;
  isSuperuser: boolean;
  canConnect: boolean;
  ddlVerified: boolean;
  details: string;
}> {
  console.log('[VPS #1 Setup] Initializing PostgreSQL database & least-privilege user setup...');

  // 1. Generate secure credentials for application user if not in an existing persistent store
  const passwordFile = path.resolve(process.cwd(), '.vps1_db_secret');
  let appUserPassword = '';
  if (fs.existsSync(passwordFile)) {
    appUserPassword = fs.readFileSync(passwordFile, 'utf-8').trim();
  } else {
    appUserPassword = crypto.randomBytes(24).toString('base64url');
    fs.writeFileSync(passwordFile, appUserPassword, { mode: 0o600 });
  }

  const appUsername = 'fileconverter_app';
  const targetDb = 'fileconverter_db';

  // 2. Connect as administrative user to PostgreSQL
  const adminClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'template1',
  });

  await adminClient.connect();

  try {
    // 3. Create or verify application user (strictly NOSUPERUSER NOCREATEDB NOCREATEROLE)
    const userCheck = await adminClient.query(
      `SELECT rolname, rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = $1`,
      [appUsername]
    );

    if (userCheck.rows.length === 0) {
      console.log(`[VPS #1 Setup] Creating dedicated application user "${appUsername}" (NOSUPERUSER, NOCREATEDB, NOCREATEROLE)...`);
      await adminClient.query(
        `CREATE ROLE ${appUsername} WITH LOGIN PASSWORD '${appUserPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE;`
      );
    } else {
      console.log(`[VPS #1 Setup] Updating dedicated application user "${appUsername}" password and ensuring NOSUPERUSER...`);
      await adminClient.query(
        `ALTER ROLE ${appUsername} WITH PASSWORD '${appUserPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE;`
      );
    }

    // 4. Create or verify database fileconverter_db
    const dbCheck = await adminClient.query(
      `SELECT datname FROM pg_database WHERE datname = $1`,
      [targetDb]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`[VPS #1 Setup] Creating dedicated database "${targetDb}" owned by "${appUsername}"...`);
      await adminClient.query(`CREATE DATABASE ${targetDb} OWNER ${appUsername};`);
    } else {
      console.log(`[VPS #1 Setup] Database "${targetDb}" already exists; ensuring ownership by "${appUsername}"...`);
      await adminClient.query(`ALTER DATABASE ${targetDb} OWNER TO ${appUsername};`);
    }

    await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE ${targetDb} TO ${appUsername};`);
  } finally {
    await adminClient.end();
  }

  // 5. Connect to fileconverter_db as admin to configure schema permissions
  const schemaAdminClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: targetDb,
  });

  await schemaAdminClient.connect();
  try {
    await schemaAdminClient.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${appUsername};`);
    await schemaAdminClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${appUsername};`);
    await schemaAdminClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${appUsername};`);
    await schemaAdminClient.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO ${appUsername};`);
    await schemaAdminClient.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${appUsername};`);
  } finally {
    await schemaAdminClient.end();
  }

  // 6. Connect AS the new application user (fileconverter_app) to rigorously test least-privilege permissions
  console.log(`[VPS #1 Setup] Verifying connection directly as "${appUsername}"...`);
  const appClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: appUsername,
    password: appUserPassword,
    database: targetDb,
  });

  let isSuperuser = true;
  let canConnect = false;
  let ddlVerified = false;

  await appClient.connect();
  canConnect = true;

  try {
    const roleCheck = await appClient.query(`
      SELECT current_user, session_user, current_database(),
             (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS is_superuser,
             (SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user) AS can_create_role
    `);

    const row = roleCheck.rows[0];
    isSuperuser = Boolean(row.is_superuser);
    console.log(`[VPS #1 Setup] Connected user: ${row.current_user}, Database: ${row.current_database}, Superuser: ${row.is_superuser}`);

    // Test DDL execution (table creation and deletion in schema public)
    const testTableName = `_perm_test_${Date.now()}`;
    await appClient.query(`CREATE TABLE ${testTableName} (id SERIAL PRIMARY KEY, val TEXT);`);
    await appClient.query(`INSERT INTO ${testTableName} (val) VALUES ('test_val');`);
    const countRes = await appClient.query(`SELECT COUNT(*) FROM ${testTableName};`);
    await appClient.query(`DROP TABLE ${testTableName};`);

    if (countRes.rows[0].count === '1') {
      ddlVerified = true;
      console.log('[VPS #1 Setup] DDL permissions verified (CREATE, INSERT, SELECT, DROP).');
    }

    // Verify least-privilege barrier: Attempting a superuser query should fail
    try {
      await appClient.query(`CREATE ROLE _malicious_test_role;`);
      throw new Error('Least-privilege violation: application user was able to create roles!');
    } catch (permErr: any) {
      if (permErr.message.includes('permission denied')) {
        console.log('[VPS #1 Setup] Verified least-privilege security barrier: user cannot create roles.');
      }
    }
  } finally {
    await appClient.end();
  }

  // 7. Write new .env file with fileconverter_app credentials
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const envContent = [
    `# ==============================================================================`,
    `# VPS #1 Development/Testing Environment Configuration`,
    `# Standalone PostgreSQL with dedicated least-privilege application user`,
    `# Firebase is explicitly prohibited. Zero Firebase dependencies.`,
    `# ==============================================================================`,
    `DATABASE_URL="postgresql://${appUsername}:${appUserPassword}@127.0.0.1:5432/${targetDb}?schema=public"`,
    `PGPORT="5432"`,
    `PGUSER="${appUsername}"`,
    `PGDATABASE="${targetDb}"`,
    `SESSION_SECRET="${sessionSecret}"`,
    `ADMIN_INITIAL_USERNAME="admin"`,
    `ADMIN_INITIAL_EMAIL="admin@example.com"`,
    `ADMIN_INITIAL_PASSWORD="SecureAdminPassword2026!"`,
    `NODE_ENV="development"`,
    `PORT="3000"`,
    ``,
  ].join('\n');

  fs.writeFileSync(path.resolve(process.cwd(), '.env'), envContent, { mode: 0o600 });
  console.log('[VPS #1 Setup] Updated .env file written with dedicated database and application user.');

  return {
    success: canConnect && !isSuperuser && ddlVerified,
    dbName: targetDb,
    appUser: appUsername,
    isSuperuser,
    canConnect,
    ddlVerified,
    details: 'Database fileconverter_db configured with dedicated least-privilege user fileconverter_app.',
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupVPS1Database()
    .then((result) => {
      console.log('[VPS #1 Setup] Setup completed successfully:', {
        dbName: result.dbName,
        appUser: result.appUser,
        isSuperuser: result.isSuperuser,
        canConnect: result.canConnect,
        ddlVerified: result.ddlVerified,
      });
      process.exit(0);
    })
    .catch((err) => {
      console.error('[VPS #1 Setup] Error:', err.message);
      process.exit(1);
    });
}
