import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';
import { LocalDatabase } from '../db/database';

export class BackupService {
  constructor(private db: LocalDatabase) {}

  public getDefaultBackupDir(): string {
    const documents = app ? app.getPath('documents') : process.cwd();
    const backupDir = path.join(documents, 'Tiger_Backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
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

  public listBackups(folder?: string): { filename: string; filePath: string; size: number; date: string }[] {
    const dir = folder || this.getDefaultBackupDir();
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir);
    return files
      .filter(f => f.endsWith('.sqlite') || f.endsWith('.db'))
      .map(f => {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        return {
          filename: f,
          filePath: full,
          size: stat.size,
          date: stat.mtime.toISOString()
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  public async restoreBackup(filePath: string): Promise<boolean> {
    return await this.db.restoreFromBackup(filePath);
  }
}
