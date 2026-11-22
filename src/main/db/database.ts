import initSqlJs, { Database, SqlValue } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { CREATE_TABLES_SQL } from './schema';

export class LocalDatabase {
  private db: Database | null = null;
  private dbPath: string;
  private isDirty = false;
  private saveTimeout: NodeJS.Timeout | null = null;
  private inTransaction = false;

  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      const userDataDir = app ? app.getPath('userData') : process.cwd();
      this.dbPath = path.join(userDataDir, 'tiger_pos.db');
    }
  }

  public async initialize(): Promise<void> {
    const SQL = await initSqlJs();

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
        console.log(`[Database] Loaded existing database from ${this.dbPath}`);
      } catch (err) {
        console.error(`[Database] Failed to read ${this.dbPath}, creating new one`, err);
        this.db = new SQL.Database();
      }
    } else {
      console.log(`[Database] Creating fresh database at ${this.dbPath}`);
      this.db = new SQL.Database();
    }

    // Enable PRAGMAs
    this.db.run('PRAGMA foreign_keys = ON;');
    
    // Run schema migrations
    this.db.run(CREATE_TABLES_SQL);

    // Run safe column migrations for existing databases
    const { SAFE_MIGRATIONS_SQL } = require('./schema');
    for (const migration of SAFE_MIGRATIONS_SQL) {
      try {
        this.db.run(migration);
      } catch (e) {
        // Column already exists or table updated
      }
    }

    this.saveToDiskSync();
  }

  public getDbPath(): string {
    return this.dbPath;
  }

  public query<T = any>(sql: string, params: SqlValue[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  public queryOne<T = any>(sql: string, params: SqlValue[] = []): T | null {
    const rows = this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  public run(sql: string, params: SqlValue[] = []): { changes: number } {
    if (!this.db) throw new Error('Database not initialized');
    if (params.length > 0) {
      this.db.run(sql, params);
    } else {
      this.db.run(sql);
    }
    const changes = this.db.getRowsModified();
    this.scheduleSave();
    return { changes };
  }

  public transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error('Database not initialized');
    if (this.inTransaction) {
      return fn();
    }
    this.inTransaction = true;
    this.db.run('BEGIN TRANSACTION;');
    try {
      const result = fn();
      this.db.run('COMMIT;');
      this.inTransaction = false;
      this.saveToDiskSync();
      return result;
    } catch (error) {
      this.db.run('ROLLBACK;');
      this.inTransaction = false;
      throw error;
    }
  }

  private scheduleSave() {
    this.isDirty = true;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToDiskSync();
    }, 500);
  }

  public saveToDiskSync(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tempPath = `${this.dbPath}.tmp`;
      fs.writeFileSync(tempPath, buffer);
      fs.renameSync(tempPath, this.dbPath);
      this.isDirty = false;
      // console.log(`[Database] Synced ${buffer.length} bytes to ${this.dbPath}`);
    } catch (err) {
      console.error('[Database] Failed to write to disk:', err);
    }
  }

  public exportBackup(targetPath: string): { success: boolean; path: string; size: number } {
    if (!this.db) throw new Error('Database not initialized');
    this.saveToDiskSync();
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(targetPath, buffer);
    return {
      success: true,
      path: targetPath,
      size: buffer.length
    };
  }

  public async restoreFromBackup(backupPath: string): Promise<boolean> {
    if (!fs.existsSync(backupPath)) {
      throw new Error('ملف النسخة الاحتياطية غير موجود!');
    }
    const fileBuffer = fs.readFileSync(backupPath);
    const SQL = await initSqlJs();
    const newDb = new SQL.Database(fileBuffer);
    
    // Quick integrity check
    const check = newDb.exec('PRAGMA quick_check;');
    if (check.length === 0 || check[0].values[0][0] !== 'ok') {
      throw new Error('ملف النسخة الاحتياطية تالف أو غير صالح!');
    }
    
    if (this.db) {
      this.db.close();
    }
    this.db = newDb;
    this.saveToDiskSync();
    return true;
  }
}

// Singleton database instance for main process
export let dbInstance: LocalDatabase | null = null;

export async function getDatabase(customPath?: string): Promise<LocalDatabase> {
  if (!dbInstance) {
    dbInstance = new LocalDatabase(customPath);
    await dbInstance.initialize();
  }
  return dbInstance;
}
