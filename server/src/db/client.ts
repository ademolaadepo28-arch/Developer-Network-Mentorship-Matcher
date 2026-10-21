import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DbInterface {
  query: <T = any>(text: string, params?: any[]) => Promise<{ rows: T[]; rowCount: number }>;
  exec: (sql: string) => Promise<void>;
  close: () => Promise<void>;
  isPGlite: boolean;
}

let dbInstance: DbInterface | null = null;

export async function getDb(): Promise<DbInterface> {
  if (dbInstance) {
    return dbInstance;
  }

  if (ENV.DATABASE_URL) {
    try {
      console.log('Connecting to PostgreSQL database at:', ENV.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
      const pool = new pg.Pool({
        connectionString: ENV.DATABASE_URL,
        ssl: ENV.NODE_ENV === 'production' && !ENV.DATABASE_URL.includes('.internal') 
          ? { rejectUnauthorized: false } 
          : false,
      });

      // Test connection
      await pool.query('SELECT 1');
      console.log('Successfully connected to external PostgreSQL 16');

      dbInstance = {
        query: async (text: string, params?: any[]) => {
          const res = await pool.query(text, params);
          return { rows: res.rows, rowCount: res.rowCount || 0 };
        },
        exec: async (sql: string) => {
          await pool.query(sql);
        },
        close: async () => {
          await pool.end();
        },
        isPGlite: false,
      };
      return dbInstance;
    } catch (err) {
      console.warn('Failed to connect to external PostgreSQL, falling back to embedded Postgres 16 (PGlite):', (err as Error).message);
    }
  }

  // Fallback to embedded Postgres 16 (PGlite)
  const dataDir = path.resolve(__dirname, '../../../.pglite_data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('Initializing embedded Postgres 16 (PGlite) in:', dataDir);
  const pglite = new PGlite(dataDir);

  dbInstance = {
    query: async <T = any>(text: string, params?: any[]) => {
      const res = await pglite.query(text, params);
      return { rows: res.rows as T[], rowCount: res.rows.length };
    },
    exec: async (sql: string) => {
      await pglite.exec(sql);
    },
    close: async () => {
      await pglite.close();
    },
    isPGlite: true,
  };

  return dbInstance!;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  let schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../src/db/schema.sql');
  }
  let schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Replace uuid_generate_v4() with gen_random_uuid() for standard PG16 and PGlite compatibility
  schemaSql = schemaSql.replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()');
  // Strip CREATE EXTENSION if using PGlite
  if (db.isPGlite) {
    schemaSql = schemaSql.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '-- ext');
  }

  console.log('Running database schema migrations...');
  await db.exec(schemaSql);
  console.log('Database schema successfully initialized.');
}
