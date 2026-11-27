import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { app } from 'electron';
import { LocalDatabase } from '../db/database';

const gzipAsync = promisify(zlib.gzip);

const AUTO_BACKUP_PREFIX = 'TIGER_AUTO_BACKUP_';
export const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Every 24 hours
const MAX_AUTO_BACKUPS = 30;

export interface BackupEntry {
  filename: string;
  filePath: string;
  size: number;
  date: string;
  isAuto?: boolean;
}

export interface AutoBackupStatus {
  enabled: boolean;
  intervalHours: number;
  lastAutoBackupAt: string | null;
  lastAutoBackupSize: number | null;
  lastAutoBackupPath: string | null;
  autoBackupCount: number;
  backupDir: string;
}

export class BackupService {
  private autoBackupInFlight = false;

  constructor(private db: LocalDatabase, private customBackupDir?: string) {}

  public getDefaultBackupDir(): string {
    if (this.customBackupDir) {
      if (!fs.existsSync(this.customBackupDir)) {
        fs.mkdirSync(this.customBackupDir, { recursive: true });
      }
      return this.customBackupDir;
    }
    try {
      const baseDir = app ? path.join(app.getPath('userData'), 'backups') : path.join(process.cwd(), 'backups');
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      return baseDir;
    } catch {
      return process.cwd();
    }
  }

  private formatFileTimestamp(now: Date = new Date()): string {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  }

  public createBackup(destinationFolder?: string): { success: boolean; filePath: string; size: number } {
    const folder = destinationFolder || this.getDefaultBackupDir();
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const timestamp = this.formatFileTimestamp();
    const filename = `TIGER_POS_BACKUP_${timestamp}.sqlite`;
    const targetFilePath = path.join(folder, filename);

    const result = this.db.exportBackup(targetFilePath);
    return {
      success: true,
      filePath: targetFilePath,
      size: result.size
    };
  }

  private async getSortedAutoBackupsAsync(dir: string): Promise<{ name: string; full: string; mtimeMs: number; size: number }[]> {
    if (!fs.existsSync(dir)) return [];
    const files = await fs.promises.readdir(dir);
    const matches: { name: string; full: string; mtimeMs: number; size: number }[] = [];
    for (const f of files) {
      if (f.startsWith(AUTO_BACKUP_PREFIX) && (f.endsWith('.sqlite.gz') || f.endsWith('.sqlite'))) {
        try {
          const full = path.join(dir, f);
          const stat = await fs.promises.stat(full);
          matches.push({ name: f, full, mtimeMs: stat.mtimeMs, size: stat.size });
        } catch {}
      }
    }
    return matches.sort((a, b) => b.mtimeMs - a.mtimeMs);
  }

  /**
   * Non-blocking compressed emergency auto-backup executed once every 24 hours.
   * Uses async gzip compression on Node worker threads to avoid UI or main-thread lag.
   */
  public async createAutoBackupIfDue(force = false): Promise<{
    created: boolean;
    filePath?: string;
    size?: number;
    skippedReason?: string;
  }> {
    if (this.autoBackupInFlight) {
      return { created: false, skippedReason: 'in_progress' };
    }
    this.autoBackupInFlight = true;
    try {
      const dir = this.getDefaultBackupDir();
      const existing = await this.getSortedAutoBackupsAsync(dir);
      const latest = existing[0];

      if (!force && latest && Date.now() - latest.mtimeMs < AUTO_BACKUP_INTERVAL_MS) {
        return {
          created: false,
          filePath: latest.full,
          size: latest.size,
          skippedReason: 'within_24h'
        };
      }

      const rawBuffer = await this.db.getSnapshotBufferAsync();
      const compressed = await gzipAsync(rawBuffer, { level: 6 });

      const timestamp = this.formatFileTimestamp();
      const filename = `${AUTO_BACKUP_PREFIX}${timestamp}.sqlite.gz`;
      const targetFilePath = path.join(dir, filename);
      const tmpPath = `${targetFilePath}.tmp`;

      await fs.promises.writeFile(tmpPath, compressed);
      await fs.promises.rename(tmpPath, targetFilePath);

      // Retain at most MAX_AUTO_BACKUPS recent emergency snapshots
      const updatedList = await this.getSortedAutoBackupsAsync(dir);
      for (let i = MAX_AUTO_BACKUPS; i < updatedList.length; i++) {
        try {
          await fs.promises.unlink(updatedList[i].full);
        } catch {}
      }

      return {
        created: true,
        filePath: targetFilePath,
        size: compressed.length
      };
    } catch (err) {
      console.error('[BackupService] Auto-backup error:', err);
      return { created: false, skippedReason: 'error' };
    } finally {
      this.autoBackupInFlight = false;
    }
  }

  public async getAutoBackupStatus(): Promise<AutoBackupStatus> {
    const dir = this.getDefaultBackupDir();
    const autos = await this.getSortedAutoBackupsAsync(dir);
    const latest = autos[0] || null;
    return {
      enabled: true,
      intervalHours: 24,
      lastAutoBackupAt: latest ? new Date(latest.mtimeMs).toISOString() : null,
      lastAutoBackupSize: latest ? latest.size : null,
      lastAutoBackupPath: latest ? latest.full : null,
      autoBackupCount: autos.length,
      backupDir: dir
    };
  }

  public async listBackups(folder?: string): Promise<BackupEntry[]> {
    try {
      const dir = folder || this.getDefaultBackupDir();
      if (!fs.existsSync(dir)) return [];

      const files = await fs.promises.readdir(dir);
      const results: BackupEntry[] = [];

      for (const f of files) {
        if (f.endsWith('.sqlite') || f.endsWith('.db') || f.endsWith('.sqlite.gz')) {
          try {
            const full = path.join(dir, f);
            const stat = await fs.promises.stat(full);
            results.push({
              filename: f,
              filePath: full,
              size: stat.size,
              date: stat.mtime.toISOString(),
              isAuto: f.startsWith(AUTO_BACKUP_PREFIX)
            });
          } catch {}
        }
      }
      return results.sort((a, b) => b.date.localeCompare(a.date));
    } catch (err) {
      console.error('[BackupService] Error listing backups:', err);
      return [];
    }
  }

  public async restoreBackup(filePath: string): Promise<boolean> {
    return await this.db.restoreFromBackup(filePath);
  }
}
