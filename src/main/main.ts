import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getDatabase, LocalDatabase } from './db/database';
import { seedDemoData } from './db/seed';
import { TigerRepository } from './db/repository';
import { ExcelService } from './services/excelService';
import { BackupService } from './services/backupService';
import { PrintService } from './services/printService';

// Ultra-lightweight & smooth mode for low-end PCs (4GB RAM, old CPUs, integrated Intel HD Graphics)
// Prevents GPU driver crashes, black screens, and freezes on machines without dedicated GPU
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-breakpad');

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
      backgroundThrottling: true,
    },
  });

  const isDev = process.env.ELECTRON_IS_DEV === '1';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Handle Zoom shortcuts (Ctrl + + / Ctrl + - / Ctrl + 0) on both sides (Main Keyboard & Numpad)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && (input.control || input.meta)) {
      const code = input.code;
      const key = input.key;

      // Zoom In: Equal (+), NumpadAdd, key '+' or '=' or 'Add'
      if (
        code === 'Equal' || 
        code === 'NumpadAdd' || 
        key === '+' || 
        key === '=' ||
        key === 'Add'
      ) {
        event.preventDefault();
        const currentZoom = mainWindow ? mainWindow.webContents.getZoomFactor() : 1.0;
        const newZoom = Math.min(Math.round((currentZoom + 0.1) * 100) / 100, 2.5);
        if (mainWindow) {
          mainWindow.webContents.setZoomFactor(newZoom);
          mainWindow.webContents.send('system:zoomChanged', newZoom);
        }
        return;
      }

      // Zoom Out: Minus (-), NumpadSubtract, key '-' or '_' or 'Subtract'
      if (
        code === 'Minus' || 
        code === 'NumpadSubtract' || 
        key === '-' || 
        key === '_' ||
        key === 'Subtract'
      ) {
        event.preventDefault();
        const currentZoom = mainWindow ? mainWindow.webContents.getZoomFactor() : 1.0;
        const newZoom = Math.max(Math.round((currentZoom - 0.1) * 100) / 100, 0.5);
        if (mainWindow) {
          mainWindow.webContents.setZoomFactor(newZoom);
          mainWindow.webContents.send('system:zoomChanged', newZoom);
        }
        return;
      }

      // Reset Zoom: Digit0, Numpad0, key '0'
      if (
        code === 'Digit0' || 
        code === 'Numpad0' || 
        key === '0'
      ) {
        event.preventDefault();
        if (mainWindow) {
          mainWindow.webContents.setZoomFactor(1.0);
          mainWindow.webContents.send('system:zoomChanged', 1.0);
        }
        return;
      }
    }
  });

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

  ipcMain.handle('db:getUserByPin', async (_, pin: string, userId?: string) => {
    return repository!.getUserByPin(pin, userId);
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

  ipcMain.handle('db:importAccessoriesBatch', async (_, items) => {
    return repository!.importAccessoriesBatch(items);
  });

  // ==================== POS & INVOICES ====================
  ipcMain.handle('db:createInvoice', async (_, invoiceData, items, tradeIn) => {
    return repository!.createInvoice(invoiceData, items, tradeIn);
  });

  ipcMain.handle('db:refundInvoice', async (_, invoiceId: string, actorName?: string) => {
    return repository!.refundInvoice(invoiceId, actorName);
  });

  ipcMain.handle('db:deleteInvoice', async (_, invoiceId: string, actorName?: string) => {
    return repository!.deleteInvoice(invoiceId, actorName);
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

  ipcMain.handle('db:deleteRepairTicket', async (_, ticketId: string) => {
    return repository!.deleteRepairTicket(ticketId);
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

  ipcMain.handle('db:deleteCustomer', async (_, customerId: string, actorName?: string) => {
    return repository!.deleteCustomer(customerId, actorName);
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
  ipcMain.handle('excel:exportMonthly', async (_, arg1: any, arg2?: any, arg3?: any) => {
    return excelService!.exportReport(arg1, arg2, arg3);
  });

  // ==================== BACKUPS ====================
  ipcMain.handle('backup:create', async (_, folder?: string) => {
    return backupService!.createBackup(folder);
  });

  ipcMain.handle('backup:list', async (_, folder?: string) => {
    try {
      if (!backupService) return [];
      // Guarantee response within 2.5s even if disk is slow
      return await Promise.race([
        backupService.listBackups(folder),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2500))
      ]);
    } catch {
      return [];
    }
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

  ipcMain.handle('db:settleAndResetDailyDrawer', async () => {
    return repository!.settleAndResetDailyDrawer();
  });

  // ==================== PRINTING & CASH DRAWER ====================
  ipcMain.handle('print:silentHtml', async (_, htmlContent: string, isBarcode?: boolean, silent = true) => {
    return PrintService.printSilentHtml(htmlContent, isBarcode, silent);
  });

  ipcMain.handle('printer:openCashDrawer', async () => {
    return PrintService.openCashDrawer();
  });

  // ==================== GITHUB AUTO-UPDATE & SYSTEM ====================
  ipcMain.handle('system:openExternal', async (_, url: string) => {
    const { shell } = require('electron');
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
      await shell.openExternal(url);
    } else {
      await shell.openPath(url);
    }
  });

  ipcMain.handle('system:getAppVersion', async () => {
    try {
      const settings = repository ? repository.getSettings() : null;
      return app.getVersion() || (settings?.installedVersion && settings.installedVersion.trim()) || '0.7.9';
    } catch {
      return '0.7.9';
    }
  });

  // ==================== ZOOM & VIEWPORT ====================
  ipcMain.handle('system:setZoomFactor', async (_, factor: number) => {
    if (mainWindow) {
      mainWindow.webContents.setZoomFactor(factor);
      mainWindow.webContents.send('system:zoomChanged', factor);
      return factor;
    }
    return 1.0;
  });

  ipcMain.handle('system:getZoomFactor', async () => {
    return mainWindow ? mainWindow.webContents.getZoomFactor() : 1.0;
  });

  ipcMain.handle('system:resetZoom', async () => {
    if (mainWindow) {
      mainWindow.webContents.setZoomFactor(1.0);
      mainWindow.webContents.send('system:zoomChanged', 1.0);
      return 1.0;
    }
    return 1.0;
  });

  ipcMain.handle('system:checkGithubUpdate', async (_, repoOverride?: string) => {
    try {
      const settings = repository ? repository.getSettings() : null;
      const currentVersion = app.getVersion() || (settings?.installedVersion && settings.installedVersion.trim()) || '0.7.8';
      
      let latestVersion = '0.8.8';
      let releaseNotes = '✨ إصدار v0.8.8: مرونة تامة في كتابة الأرقام ودعم الأرقام العربية والإنجليزية بكافة الحقول وخانات المبالغ، والتركيز التلقائي وعرض آخر الفواتير في شاشة المرتجعات.';
      let releaseName = 'إصدار الترقية السحابي TIGER v0.8.8';
      let publishedAt = new Date().toISOString();

      try {
        const repo = (repoOverride && repoOverride.trim()) || (settings?.githubRepo && settings.githubRepo.trim()) || 'samer20032020-dev/tiger-pos';
        const rawUrl = `https://raw.githubusercontent.com/${repo}/main/package.json`;
        const res = await fetch(rawUrl, { cache: 'no-store' });
        if (res.ok) {
          const pkg = await res.json();
          if (pkg.version) {
            latestVersion = pkg.version;
            releaseName = `إصدار الترقية السحابي TIGER v${latestVersion}`;
          }
        }
      } catch (netErr) {
        console.warn('[CheckUpdate] Online check fallback', netErr);
      }

      const cmp = (a: string, b: string) => {
        const pa = a.split('.').map(n => parseInt(n, 10) || 0);
        const pb = b.split('.').map(n => parseInt(n, 10) || 0);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
          const na = pa[i] || 0;
          const nb = pb[i] || 0;
          if (na > nb) return 1;
          if (na < nb) return -1;
        }
        return 0;
      };
      const hasUpdate = cmp(latestVersion, currentVersion) > 0;

      return {
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseName,
        releaseNotes,
        downloadUrl: `https://github.com/samer20032020-dev/tiger-pos/releases/download/v${latestVersion}/TIGER-Setup.exe`,
        htmlUrl: 'https://github.com/samer20032020-dev/tiger-pos/releases',
        publishedAt
      };
    } catch (err: any) {
      console.error('[Update Check Error]:', err);
      const settings = repository ? repository.getSettings() : null;
      const curVer = app.getVersion() || (settings?.installedVersion && settings.installedVersion.trim()) || '0.7.8';
      return {
        hasUpdate: false,
        currentVersion: curVer,
        latestVersion: '0.8.8',
        error: err.message || 'حدث خطأ أثناء فحص التحديثات'
      };
    }
  });

  ipcMain.handle('system:downloadUpdate', async (_, url: string, newVersion?: string) => {
    try {
      const tempDir = app.getPath('temp');
      const targetPath = path.join(tempDir, 'TIGER-Update-Setup.exe');

      let downloadSuccess = false;

      // 1. Attempt online download if valid URL provided
      if (url && url.startsWith('http')) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            if (arrayBuf.byteLength > 20 * 1024 * 1024) { // Valid setup binary > 20MB
              fs.writeFileSync(targetPath, Buffer.from(arrayBuf));
              downloadSuccess = true;
            }
          }
        } catch (fetchErr) {
          console.warn('[DownloadUpdate] Online fetch error, checking local fallbacks', fetchErr);
        }
      }

      // 2. If online download didn't produce the installer, fallback to local installer files
      if (!downloadSuccess) {
        const localCandidates = [
          path.join(app.getPath('desktop'), 'TIGER-Setup.exe'),
          path.join(process.cwd(), 'release', 'TIGER-Setup.exe'),
          path.join(process.cwd(), 'TIGER-Setup.exe')
        ];

        for (const loc of localCandidates) {
          try {
            if (fs.existsSync(loc)) {
              const stats = fs.statSync(loc);
              if (stats.size > 20 * 1024 * 1024) {
                fs.copyFileSync(loc, targetPath);
                downloadSuccess = true;
                break;
              }
            }
          } catch { }
        }
      }

      if (!downloadSuccess) {
        throw new Error('لم يتم العثور على ملف التثبيت التحديثي (TIGER-Setup.exe). يرجى التأكد من توفر الملف على سطح المكتب.');
      }

      return { success: true, filePath: targetPath };
    } catch (err: any) {
      console.error('[Download Update Error]:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:installUpdateAndRestart', async (_, filePath?: string, newVersion?: string) => {
    try {
      if (dbInstance) {
        try {
          dbInstance.saveToDiskSync();
        } catch { }
      }

      const tempDir = app.getPath('temp');
      const candidatePaths = [
        filePath,
        path.join(tempDir, 'TIGER-Update-Setup.exe'),
        path.join(app.getPath('desktop'), 'TIGER-Setup.exe'),
        path.join(process.cwd(), 'release', 'TIGER-Setup.exe'),
        path.join(process.cwd(), 'TIGER-Setup.exe')
      ].filter(Boolean) as string[];

      let installerPath = '';
      for (const p of candidatePaths) {
        try {
          if (fs.existsSync(p)) {
            const stats = fs.statSync(p);
            if (stats.size > 20 * 1024 * 1024) {
              installerPath = p;
              break;
            }
          }
        } catch { }
      }

      if (!installerPath) {
        throw new Error('ملف التحديث غير موجود، يرجى إعادة تنزيل التحديث أولاً.');
      }

      // Launch installer directly via shell and exit app so files can be replaced
      shell.openPath(installerPath).catch(() => {});

      const { spawn } = require('child_process');
      const batPath = path.join(tempDir, 'tiger_launch_installer.bat');
      const batContent = `@echo off
chcp 65001 >nul
timeout /t 1 /nobreak >nul
taskkill /F /IM TIGER.exe >nul 2>&1
timeout /t 1 /nobreak >nul
start "" "${installerPath}"
exit /b
`;
      try {
        fs.writeFileSync(batPath, batContent, 'utf8');
        const child = spawn('cmd.exe', ['/c', batPath], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      } catch { }

      setTimeout(() => {
        app.exit(0);
      }, 600);

      return { success: true };
    } catch (err: any) {
      console.error('[Install Update Error]:', err);
      return { success: false, error: err.message };
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

    // Sync installedVersion with app.getVersion()
    try {
      const realVer = app.getVersion();
      if (realVer && repository) {
        repository.updateSettings({ installedVersion: realVer });
        db.saveToDiskSync();
      }
    } catch (e) {
      console.warn('[VersionSync] Could not sync version:', e);
    }

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
