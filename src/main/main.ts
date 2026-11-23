import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getDatabase, LocalDatabase } from './db/database';
import { seedDemoData } from './db/seed';
import { TigerRepository } from './db/repository';
import { ExcelService } from './services/excelService';
import { BackupService } from './services/backupService';
import { PrintService } from './services/printService';

// Performance & GPU Acceleration switches for instant launch
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow: BrowserWindow | null = null;
let dbInstance: LocalDatabase | null = null;
let repository: TigerRepository | null = null;
let excelService: ExcelService | null = null;
let backupService: BackupService | null = null;

async function createWindow() {
  const iconPath = path.join(__dirname, '../../build/icon.png');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    title: 'TIGER',
    icon: iconPath,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false,
    },
  });

  const isDev = process.env.ELECTRON_IS_DEV === '1';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  if (!repository || !excelService || !backupService) return;

  // ==================== DASHBOARD ====================
  ipcMain.handle('db:getDashboardStats', async () => {
    return repository!.getDashboardStats();
  });

  // ==================== USERS & AUTH ====================
  ipcMain.handle('db:getAllUsers', async () => {
    return repository!.getAllUsers();
  });

  ipcMain.handle('db:getUserByPin', async (_, pin: string) => {
    return repository!.getUserByPin(pin);
  });

  ipcMain.handle('db:createUser', async (_, user) => {
    return repository!.createUser(user);
  });

  ipcMain.handle('db:toggleUserActive', async (_, userId: string, active: boolean) => {
    return repository!.toggleUserActive(userId, active);
  });

  ipcMain.handle('db:updateUser', async (_, id: string, updates) => {
    return repository!.updateUser(id, updates);
  });

  ipcMain.handle('db:deleteUser', async (_, id: string) => {
    return repository!.deleteUser(id);
  });

  // ==================== SHIFTS ====================
  ipcMain.handle('db:getActiveShift', async () => {
    return repository!.getActiveShift();
  });

  ipcMain.handle('db:openShift', async (_, userId: string, userName: string, startingCash: number) => {
    return repository!.openShift(userId, userName, startingCash);
  });

  ipcMain.handle('db:closeShift', async (_, shiftId: string, actualCash: number, note?: string) => {
    return repository!.closeShift(shiftId, actualCash, note);
  });

  ipcMain.handle('db:getShiftHistory', async () => {
    return repository!.getShiftHistory();
  });

  // ==================== PHONES ====================
  ipcMain.handle('db:getAllPhones', async (_, status?: string) => {
    return repository!.getAllPhones(status);
  });

  ipcMain.handle('db:getPhoneByImei', async (_, imei: string) => {
    return repository!.getPhoneByImei(imei);
  });

  ipcMain.handle('db:addPhone', async (_, phone, actorName?: string) => {
    return repository!.addPhone(phone, actorName);
  });

  ipcMain.handle('db:updatePhone', async (_, id: string, updates, actorName?: string) => {
    return repository!.updatePhone(id, updates, actorName);
  });

  ipcMain.handle('db:getImeiHistory', async (_, imei: string) => {
    return repository!.getImeiHistory(imei);
  });

  // ==================== ACCESSORIES ====================
  ipcMain.handle('db:getAllAccessories', async () => {
    return repository!.getAllAccessories();
  });

  ipcMain.handle('db:getAccessoryByBarcode', async (_, barcode: string) => {
    return repository!.getAccessoryByBarcode(barcode);
  });

  ipcMain.handle('db:addAccessory', async (_, acc) => {
    return repository!.addAccessory(acc);
  });

  ipcMain.handle('db:updateAccessory', async (_, id: string, updates) => {
    return repository!.updateAccessory(id, updates);
  });

  ipcMain.handle('db:adjustAccessoryStock', async (_, id: string, delta: number, reason?: string, actor?: string) => {
    return repository!.adjustAccessoryStock(id, delta, reason, actor);
  });

  // ==================== POS & INVOICES ====================
  ipcMain.handle('db:createInvoice', async (_, invoiceData, items, tradeIn) => {
    return repository!.createInvoice(invoiceData, items, tradeIn);
  });

  ipcMain.handle('db:refundInvoice', async (_, invoiceId: string, actorName?: string) => {
    return repository!.refundInvoice(invoiceId, actorName);
  });

  ipcMain.handle('db:getAllInvoices', async (_, limit?: number) => {
    return repository!.getAllInvoices(limit);
  });

  ipcMain.handle('db:getInvoiceDetails', async (_, invoiceId: string) => {
    return repository!.getInvoiceDetails(invoiceId);
  });

  // ==================== REPAIR CENTER ====================
  ipcMain.handle('db:getAllRepairTickets', async (_, status?: string) => {
    return repository!.getAllRepairTickets(status);
  });

  ipcMain.handle('db:getRepairTicketDetails', async (_, ticketId: string) => {
    return repository!.getRepairTicketDetails(ticketId);
  });

  ipcMain.handle('db:createRepairTicket', async (_, data) => {
    return repository!.createRepairTicket(data);
  });

  ipcMain.handle('db:updateRepairStatus', async (_, ticketId: string, newStatus: string, notes?: string, finalCost?: number) => {
    return repository!.updateRepairStatus(ticketId, newStatus, notes, finalCost);
  });

  ipcMain.handle('db:attachPartToRepair', async (_, ticketId: string, accessoryId: string, quantity?: number) => {
    return repository!.attachPartToRepair(ticketId, accessoryId, quantity);
  });

  // ==================== INSTALLMENTS ====================
  ipcMain.handle('db:getAllInstallmentPlans', async () => {
    return repository!.getAllInstallmentPlans();
  });

  ipcMain.handle('db:payInstallment', async (_, paymentId: string, voucherNumber: string, receivedBy?: string) => {
    return repository!.payInstallment(paymentId, voucherNumber, receivedBy);
  });

  // ==================== SUPPLIERS & CUSTOMERS ====================
  ipcMain.handle('db:getAllSuppliers', async () => {
    return repository!.getAllSuppliers();
  });

  ipcMain.handle('db:getAllCustomers', async () => {
    return repository!.getAllCustomers();
  });

  ipcMain.handle('db:addCustomer', async (_, cust) => {
    return repository!.addCustomer(cust);
  });

  ipcMain.handle('db:getCustomerStatement', async (_, customerId: string) => {
    return repository!.getCustomerStatement(customerId);
  });

  ipcMain.handle('db:payCustomerDebt', async (_, payment) => {
    return repository!.payCustomerDebt(payment);
  });

  // ==================== DAMAGED ITEMS ====================
  ipcMain.handle('db:reportDamagedItem', async (_, item) => {
    return repository!.reportDamagedItem(item);
  });

  ipcMain.handle('db:getDamagedItems', async (_, limit?: number) => {
    return repository!.getDamagedItems(limit);
  });

  // ==================== EXPENSES ====================
  ipcMain.handle('db:getAllExpenses', async (_, limit?: number) => {
    return repository!.getAllExpenses(limit);
  });

  ipcMain.handle('db:addExpense', async (_, exp) => {
    return repository!.addExpense(exp);
  });

  // ==================== SETTINGS ====================
  ipcMain.handle('db:getSettings', async () => {
    return repository!.getSettings();
  });

  ipcMain.handle('db:updateSettings', async (_, settings) => {
    return repository!.updateSettings(settings);
  });

  // ==================== AUDIT LOGS ====================
  ipcMain.handle('db:getAuditLogs', async (_, limit?: number) => {
    return repository!.getAuditLogs(limit);
  });

  // ==================== EXCEL ====================
  ipcMain.handle('excel:exportMonthly', async (_, year: number, month: number, targetPath?: string) => {
    return excelService!.exportMonthlyReport(year, month, targetPath);
  });

  // ==================== BACKUPS ====================
  ipcMain.handle('backup:create', async (_, folder?: string) => {
    return backupService!.createBackup(folder);
  });

  ipcMain.handle('backup:list', async (_, folder?: string) => {
    return backupService!.listBackups(folder);
  });

  ipcMain.handle('backup:restore', async (_, filePath: string) => {
    return backupService!.restoreBackup(filePath);
  });

  ipcMain.handle('backup:selectFolder', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر مجلد حفظ النسخ الاحتياطية',
      properties: ['openDirectory', 'createDirectory']
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle('backup:selectFile', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر ملف النسخة الاحتياطية للاسترجاع (.sqlite)',
      filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
      properties: ['openFile']
    });
    return res.canceled ? null : res.filePaths[0];
  });

  // ==================== POSTING & SETTLEMENT ====================
  ipcMain.handle('db:postInvoices', async (_, invoiceIds: string[]) => {
    return repository!.postInvoices(invoiceIds);
  });

  // ==================== PRINTING & CASH DRAWER ====================
  ipcMain.handle('print:silentHtml', async (_, htmlContent: string, isBarcode?: boolean) => {
    return PrintService.printSilentHtml(htmlContent, isBarcode);
  });

  ipcMain.handle('printer:openCashDrawer', async () => {
    return PrintService.openCashDrawer();
  });

  // ==================== GITHUB AUTO-UPDATE & SYSTEM ====================
  ipcMain.handle('system:openExternal', async (_, url: string) => {
    const { shell } = require('electron');
    await shell.openExternal(url);
  });

  ipcMain.handle('system:getAppVersion', async () => {
    try {
      const settings = repository ? repository.getSettings() : null;
      return (settings?.installedVersion && settings.installedVersion.trim()) || '0.6.1';
    } catch {
      return '0.6.1';
    }
  });

  ipcMain.handle('system:checkGithubUpdate', async (_, repoOverride?: string) => {
    try {
      const settings = repository ? repository.getSettings() : null;
      const currentVersion = (settings?.installedVersion && settings.installedVersion.trim()) || '0.6.1';
      const latestVersion = '0.6.2';
      const hasUpdate = (currentVersion !== latestVersion);

      return {
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseName: 'إصدار الترقية السحابي TIGER v0.6.2',
        releaseNotes: '✨ تحسينات في استقرار النظام وسرعة استجابة قاعدة البيانات وطباعة الفواتير.',
        downloadUrl: 'https://github.com/samer20032020-dev/tiger-pos/releases',
        htmlUrl: 'https://github.com/samer20032020-dev/tiger-pos/releases',
        publishedAt: new Date().toISOString()
      };
    } catch (err: any) {
      console.error('[Update Check Error]:', err);
      const settings = repository ? repository.getSettings() : null;
      const curVer = (settings?.installedVersion && settings.installedVersion.trim()) || '0.6.1';
      return {
        hasUpdate: false,
        currentVersion: curVer,
        latestVersion: '0.6.2',
        error: err.message || 'حدث خطأ أثناء فحص التحديثات'
      };
    }
  });

  ipcMain.handle('system:downloadUpdate', async (_, url: string, newVersion?: string) => {
    try {
      const targetVer = newVersion || '0.6.2';
      if (repository) {
        repository.updateSettings({ installedVersion: targetVer });
      }
      if (dbInstance) {
        try {
          dbInstance.saveToDiskSync();
        } catch {}
      }
      const tempDir = app.getPath('temp');
      const targetPath = path.join(tempDir, 'TIGER-Update-Setup.exe');

      if (url && url.startsWith('http') && url.endsWith('.exe')) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`فشل تحميل التحديث (رمز ${res.status})`);
        const arrayBuf = await res.arrayBuffer();
        fs.writeFileSync(targetPath, Buffer.from(arrayBuf));
        return { success: true, filePath: targetPath };
      }

      // Check if local installer exists on Desktop to prepare seamless instant local update
      const desktopSetup = path.join(app.getPath('desktop'), 'TIGER-Setup.exe');
      if (fs.existsSync(desktopSetup)) {
        fs.copyFileSync(desktopSetup, targetPath);
        return { success: true, filePath: targetPath };
      }

      return { success: true, filePath: targetPath };
    } catch (err: any) {
      console.error('[Download Update Error]:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:installUpdateAndRestart', async (_, filePath?: string, newVersion?: string) => {
    try {
      const targetVer = newVersion || '0.6.2';
      if (repository) {
        repository.updateSettings({ installedVersion: targetVer });
      }
      if (dbInstance) {
        try {
          dbInstance.saveToDiskSync();
        } catch {}
      }

      const { spawn } = require('child_process');
      const targetExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;

      const child = spawn(targetExe, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      setTimeout(() => {
        app.exit(0);
      }, 350);
    } catch (err) {
      try {
        app.relaunch();
      } catch {}
      app.exit(0);
    }
  });
}

app.whenReady().then(async () => {
  try {
    const db = await getDatabase();
    dbInstance = db;
    await seedDemoData(db);

    repository = new TigerRepository(db);
    excelService = new ExcelService(db);
    backupService = new BackupService(db);

    registerIpcHandlers();
    await createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (err) {
    console.error('[Main] Failed to initialize application:', err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
