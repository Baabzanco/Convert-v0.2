import EmbeddedPostgres from 'embedded-postgres';
import net from 'net';
import path from 'path';
import fs from 'fs';

const DB_PORT = parseInt(process.env.PGPORT || '5432', 10);
const DB_USER = process.env.PGUSER || 'postgres';
const DB_PASSWORD = process.env.PGPASSWORD || 'postgres';
const DB_NAME = process.env.PGDATABASE || 'cms_admin';
const DATA_DIR = path.resolve(process.cwd(), 'data/postgres');

let pgInstance: any = null;

export function isPortActive(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function ensurePostgresRunning(): Promise<void> {
  const active = await isPortActive(DB_PORT);
  if (active) {
    console.log(`[PostgreSQL] Standalone PostgreSQL server already listening on port ${DB_PORT}`);
    return;
  }

  console.log(`[PostgreSQL] Starting standalone PostgreSQL instance on port ${DB_PORT}...`);
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Handle default or named export
  const PGClass = (EmbeddedPostgres as any).default || EmbeddedPostgres;
  pgInstance = new PGClass({
    port: DB_PORT,
    databaseDir: DATA_DIR,
    user: DB_USER,
    password: DB_PASSWORD,
    initialDatabase: DB_NAME,
    persistent: true,
    createPostgresUser: true, // required when running under root container
  });

  try {
    await pgInstance.initialise();
  } catch (err: any) {
    // Already initialised is ok
    if (!err?.message?.includes('already exists') && !err?.message?.includes('directory not empty')) {
      console.warn(`[PostgreSQL] Cluster initialization note:`, err.message);
    }
  }

  await pgInstance.start();
  console.log(`[PostgreSQL] Standalone PostgreSQL started successfully on port ${DB_PORT}`);

  const shutdownHandler = async () => {
    if (pgInstance) {
      console.log(`[PostgreSQL] Stopping standalone PostgreSQL...`);
      try {
        await pgInstance.stop();
      } catch (e) {
        // ignore on exit
      }
    }
  };

  process.once('SIGINT', shutdownHandler);
  process.once('SIGTERM', shutdownHandler);
}

// Allow direct execution via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  ensurePostgresRunning()
    .then(() => {
      console.log(`[PostgreSQL] Database daemon ready.`);
    })
    .catch((err) => {
      console.error(`[PostgreSQL] Failed to start database:`, err);
      process.exit(1);
    });
}
