import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';

let sqlInstance: SqlJsStatic | null = null;
let dbInstance: Database | null = null;
const DB_PATH = path.resolve(process.cwd(), 'database/autogestion.sqlite');
const SCHEMA_PATH = path.resolve(process.cwd(), 'database/schema.sql');
const SEED_PATH = path.resolve(process.cwd(), 'database/seed.sql');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!sqlInstance) {
    sqlInstance = await initSqlJs();
  }

  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new sqlInstance.Database(fileBuffer);
  } else {
    dbInstance = new sqlInstance.Database();
    // Initialize schema and seed
    if (fs.existsSync(SCHEMA_PATH)) {
      const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      dbInstance.run(schemaSql);
    }
    if (fs.existsSync(SEED_PATH)) {
      const seedSql = fs.readFileSync(SEED_PATH, 'utf-8');
      dbInstance.run(seedSql);
    }
    // Update passwords with verified bcryptjs hashes
    const bcrypt = await import('bcryptjs');
    const adminHash = bcrypt.default.hashSync('admin123', 10);
    const mecanicoHash = bcrypt.default.hashSync('mecanico123', 10);
    const recepHash = bcrypt.default.hashSync('recep123', 10);
    dbInstance.run(`UPDATE usuarios SET password_hash = '${adminHash}' WHERE email = 'admin@autogestion.com';`);
    dbInstance.run(`UPDATE usuarios SET password_hash = '${mecanicoHash}' WHERE rol = 'tecnico';`);
    dbInstance.run(`UPDATE usuarios SET password_hash = '${recepHash}' WHERE email = 'ana.recepcion@autogestion.com';`);
    saveDb();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
  const db = await getDb();
  if (params && params.length > 0) {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
  } else {
    db.run(sql);
  }

  const res = db.exec("SELECT last_insert_rowid() AS id, changes() AS changes;");
  let lastInsertRowid = 0;
  let changes = 0;
  if (res.length > 0 && res[0].values.length > 0) {
    lastInsertRowid = Number(res[0].values[0][0]) || 0;
    changes = Number(res[0].values[0][1]) || 0;
  }

  saveDb();
  return { lastInsertRowid, changes };
}

export async function transaction<T>(callback: () => Promise<T>): Promise<T> {
  const db = await getDb();
  db.run('BEGIN TRANSACTION;');
  try {
    const result = await callback();
    db.run('COMMIT;');
    saveDb();
    return result;
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }
}
