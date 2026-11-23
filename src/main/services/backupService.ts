import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';
import { LocalDatabase } from '../db/database';

export class BackupService {
  constructor(private db: LocalDatabase) {}

  public getDefaultBackupDir(): string {
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

  public createBackup(destinationFolder?: string): { success: boolean; filePath: string; size: number } {
    const folder = destinationFolder || this.getDefaultBackupDir();
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `TIGER_POS_BACKUP_${timestamp}.sqlite`;
    const targetFilePath = path.join(folder, filename);

    const result = this.db.exportBackup(targetFilePath);
    return {
      success: true,
      filePath: targetFilePath,
      size: result.size
    };
  }

  public async listBackups(folder?: string): Promise<{ filename: string; filePath: string; size: number; date: string }[]> {
    try {
      const dir = folder || this.getDefaultBackupDir();
      if (!fs.existsSync(dir)) return [];

      const files = await fs.promises.readdir(dir);
      const results: { filename: string; filePath: string; size: number; date: string }[] = [];

      for (const f of files) {
        if (f.endsWith('.sqlite') || f.endsWith('.db')) {
          try {
            const full = path.join(dir, f);
            const stat = await fs.promises.stat(full);
            results.push({
              filename: f,
              filePath: full,
              size: stat.size,
              date: stat.mtime.toISOString()
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

