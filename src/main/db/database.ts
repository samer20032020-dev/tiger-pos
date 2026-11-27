import initSqlJs, { Database, SqlValue } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { app } from 'electron';
import { CREATE_TABLES_SQL } from './schema';

const gunzipAsync = promisify(zlib.gunzip);

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

    // Migrate customers table: allow non-unique or empty phone numbers
    try {
      const custTableInfo = this.queryOne<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'customers'");
      if (custTableInfo && (custTableInfo.sql.includes('phone TEXT UNIQUE') || custTableInfo.sql.includes('phone TEXT NOT NULL'))) {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS customers_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            id_number TEXT,
            balance REAL NOT NULL DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL
          );
          INSERT OR IGNORE INTO customers_new SELECT id, name, phone, id_number, balance, notes, created_at FROM customers;
          DROP TABLE customers;
          ALTER TABLE customers_new RENAME TO customers;
        `);
        this.isDirty = true;
      }
    } catch {
      // Table already migrated
    }

    // Automatically reconcile and link any past unlinked debt invoices to their customers
    try {
      const unlinked = this.query<any>(`
        SELECT id, customer_name, customer_phone, remaining_amount, created_at 
        FROM invoices 
        WHERE (customer_id IS NULL OR customer_id = '') 
          AND remaining_amount > 0 
          AND customer_name IS NOT NULL 
          AND customer_name != 'زبون نقدي' 
          AND status != 'refunded'
      `);

      for (const inv of unlinked) {
        const name = (inv.customer_name || '').trim();
        if (!name) continue;

        let cust = this.queryOne<any>('SELECT * FROM customers WHERE LOWER(TRIM(name)) = LOWER(?)', [name]);
        if (!cust) {
          const custId = `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          this.run(`
            INSERT INTO customers (id, name, phone, balance, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [custId, name, inv.customer_phone || '', inv.remaining_amount || 0, 'ذمة مؤجلة: مستحقة من فاتورة سابقة', inv.created_at || new Date().toISOString()]);
          this.run('UPDATE invoices SET customer_id = ? WHERE id = ?', [custId, inv.id]);
        } else {
          this.run('UPDATE invoices SET customer_id = ? WHERE id = ?', [cust.id, inv.id]);
          this.run('UPDATE customers SET balance = balance + ? WHERE id = ?', [inv.remaining_amount, cust.id]);
        }
        this.isDirty = true;
      }
    } catch (e) {
      console.warn('[Database] Customer reconciliation warning:', e);
    }

    // Cleanup old non-service placeholder 'acc-1795435646203-78' and ensure open services exist
    try {
      this.run("DELETE FROM accessories WHERE id = 'acc-1795435646203-78' OR (name LIKE '%صافي الصيانه%' AND is_unlimited = 0)");
      const nowIso = new Date().toISOString();
      this.run(`
        INSERT OR IGNORE INTO accessories (id, barcode, sku, name, category, cost_price, retail_price, wholesale_price, current_stock, min_stock_alert, is_unlimited, description, created_at)
        VALUES ('srv-transfers', 'SRV-001', 'SRV-TRF', 'الحوالات', 'حوالات وخدمات مفتوحة', 0, 0, 0, 999999, 0, 1, 'خدمة حوالات مالية - التكلفة 0 والكمية لا نهائية مع سعر حر', ?)
      `, [nowIso]);
      this.run(`
        INSERT OR IGNORE INTO accessories (id, barcode, sku, name, category, cost_price, retail_price, wholesale_price, current_stock, min_stock_alert, is_unlimited, description, created_at)
        VALUES ('srv-net-repair', 'SRV-002', 'SRV-REP', 'صافي الصيانة', 'حوالات وخدمات مفتوحة', 0, 0, 0, 999999, 0, 1, 'صافي الصيانة - التكلفة 0 والكمية لا نهائية مع سعر حر', ?)
      `, [nowIso]);
      this.run(`
        UPDATE accessories
        SET category = 'حوالات وخدمات مفتوحة',
            is_unlimited = 1,
            current_stock = CASE WHEN current_stock < 999999 THEN 999999 ELSE current_stock END
        WHERE id = 'srv-net-repair'
      `);
      this.isDirty = true;
    } catch {
      // Ignore if already seeded
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

  /**
   * Returns a clean DB snapshot Buffer without unnecessary double SQLite exports when disk copy is already synced.
   */
  public async getSnapshotBufferAsync(): Promise<Buffer> {
    if (!this.db) throw new Error('Database not initialized');
    if (this.isDirty || !fs.existsSync(this.dbPath)) {
      this.saveToDiskSync();
    }
    try {
      return await fs.promises.readFile(this.dbPath);
    } catch {
      return Buffer.from(this.db.export());
    }
  }

  public async restoreFromBackup(backupPath: string): Promise<boolean> {
    if (!fs.existsSync(backupPath)) {
      throw new Error('ملف النسخة الاحتياطية غير موجود!');
    }
    let fileBuffer: Buffer = await fs.promises.readFile(backupPath);
    if (backupPath.toLowerCase().endsWith('.gz')) {
      fileBuffer = await gunzipAsync(fileBuffer);
    }
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
