import { contextBridge, ipcRenderer } from 'electron';
import { 
  User, Shift, Phone, Accessory, Invoice, InvoiceItem, 
  TradeInDevice, RepairTicket, RepairPartReportEntry, InstallmentPlan, Customer, 
  Supplier, Expense, AuditLog, DashboardStats, ImeiHistory,
  SystemSettings, DamagedItem, CustomerStatement, CustomerDebtPayment,
  UpdateCheckResult, UpdateProgressEvent
} from '../shared/types';

export interface TigerAPI {
  // Dashboard
  getDashboardStats: () => Promise<DashboardStats>;

  // Users & Auth
  getAllUsers: () => Promise<User[]>;
  getUserByPin: (pin: string, userId?: string) => Promise<User | null>;
  createUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  toggleUserActive: (userId: string, active: boolean) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // Shifts
  getActiveShift: () => Promise<Shift | null>;
  openShift: (userId: string, userName: string, startingCash: number) => Promise<Shift>;
  closeShift: (shiftId: string, actualCash: number, note?: string) => Promise<Shift>;
  getShiftHistory: () => Promise<Shift[]>;

  // Phones & IMEI
  getAllPhones: (status?: string) => Promise<Phone[]>;
  getPhoneByImei: (imei: string) => Promise<Phone | null>;
  addPhone: (phone: Omit<Phone, 'id' | 'createdAt'>, actorName?: string) => Promise<Phone>;
  updatePhone: (id: string, updates: Partial<Phone>, actorName?: string) => Promise<void>;
  getImeiHistory: (imei: string) => Promise<ImeiHistory[]>;

  // Accessories
  getAllAccessories: () => Promise<Accessory[]>;
  getAccessoryByBarcode: (barcode: string) => Promise<Accessory | null>;
  addAccessory: (acc: Omit<Accessory, 'id' | 'createdAt'>) => Promise<Accessory>;
  updateAccessory: (id: string, updates: Partial<Accessory>) => Promise<void>;
  adjustAccessoryStock: (id: string, delta: number, reason?: string, actor?: string) => Promise<void>;
  deleteAccessory: (id: string) => Promise<void>;
  importAccessoriesBatch: (items: any[]) => Promise<{ importedCount: number; updatedCount: number; errors: string[] }>;

  // POS & Invoices
  createInvoice: (
    invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>,
    items: Omit<InvoiceItem, 'id' | 'invoiceId'>[],
    tradeIn?: Omit<TradeInDevice, 'id' | 'invoiceId' | 'createdAt'> | null
  ) => Promise<Invoice>;
  refundInvoice: (invoiceId: string, actorName?: string) => Promise<void>;
  deleteInvoice: (invoiceId: string, actorName?: string) => Promise<void>;
  getAllInvoices: (limit?: number) => Promise<Invoice[]>;
  getInvoiceDetails: (invoiceId: string) => Promise<Invoice | null>;
  postInvoices: (invoiceIds: string[]) => Promise<{ count: number }>;
  settleAndResetDailyDrawer: () => Promise<{ invoiceCount: number; repairCount: number; expenseCount: number }>;

  // Repair Center
  getAllRepairTickets: (status?: string) => Promise<RepairTicket[]>;
  getRepairTicketDetails: (ticketId: string) => Promise<RepairTicket | null>;
  createRepairTicket: (data: Omit<RepairTicket, 'id' | 'ticketNumber' | 'createdAt'>) => Promise<RepairTicket>;
  updateRepairStatus: (ticketId: string, newStatus: string, notes?: string, finalCost?: number) => Promise<void>;
  markRepairTicketPaid: (ticketId: string, finalCostOverride?: number, actorName?: string) => Promise<void>;
  getAllRepairPartsReport: () => Promise<RepairPartReportEntry[]>;
  attachPartToRepair: (ticketId: string, accessoryId: string, quantity?: number) => Promise<void>;
  deleteRepairTicket: (ticketId: string) => Promise<void>;

  // Installments
  getAllInstallmentPlans: () => Promise<InstallmentPlan[]>;
  payInstallment: (paymentId: string, voucherNumber: string, receivedBy?: string) => Promise<void>;

  // Suppliers & Customers
  getAllSuppliers: () => Promise<Supplier[]>;
  getAllCustomers: () => Promise<Customer[]>;
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  getCustomerStatement: (customerId: string) => Promise<CustomerStatement | null>;
  payCustomerDebt: (payment: Omit<CustomerDebtPayment, 'id' | 'createdAt'>) => Promise<CustomerDebtPayment>;
  deleteCustomer: (customerId: string, actorName?: string) => Promise<void>;

  // Damaged Items & Stock Write-Off
  reportDamagedItem: (item: Omit<DamagedItem, 'id' | 'createdAt'>) => Promise<DamagedItem>;
  getDamagedItems: (limit?: number) => Promise<DamagedItem[]>;

  // Expenses
  getAllExpenses: (limit?: number) => Promise<Expense[]>;
  addExpense: (exp: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>;

  // Settings
  getSettings: () => Promise<SystemSettings>;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<SystemSettings>;

  // Audit Logs
  getAuditLogs: (limit?: number) => Promise<AuditLog[]>;

  // Excel & Reports
  exportMonthlyExcel: (yearOrOptions: number | any, month?: number, targetPath?: string) => Promise<{ success: boolean; filePath: string }>;

  // Backups
  createBackup: (folder?: string) => Promise<{ success: boolean; filePath: string; size: number }>;
  listBackups: (folder?: string) => Promise<{ filename: string; filePath: string; size: number; date: string; isAuto?: boolean }[]>;
  getAutoBackupStatus: () => Promise<{
    enabled: boolean;
    intervalHours: number;
    lastAutoBackupAt: string | null;
    lastAutoBackupSize: number | null;
    lastAutoBackupPath: string | null;
    autoBackupCount: number;
    backupDir: string;
  }>;
  restoreBackup: (filePath: string) => Promise<boolean>;
  selectBackupFolder: () => Promise<string | null>;
  selectBackupFile: () => Promise<string | null>;

  // Printing & Hardware
  printSilentHtml: (htmlContent: string, isBarcode?: boolean, silent?: boolean) => Promise<boolean>;
  openCashDrawer: () => Promise<{ success: boolean; message: string }>;

  // System & GitHub Auto-Update
  getAppVersion: () => Promise<string>;
  checkGithubUpdate: (repoOverride?: string) => Promise<UpdateCheckResult>;
  downloadUpdate: (url: string, newVersion?: string) => Promise<{ success: boolean; filePath?: string; isBundle?: boolean; error?: string }>;
  installUpdateAndRestart: (filePath?: string, newVersion?: string) => Promise<{ success: boolean; error?: string } | void>;
  onUpdateProgress?: (callback: (evt: UpdateProgressEvent) => void) => () => void;
  openExternal: (url: string) => Promise<void>;

  // Zoom & Viewport
  setZoomFactor: (factor: number) => Promise<number>;
  getZoomFactor: () => Promise<number>;
  resetZoom: () => Promise<number>;
  onZoomChanged?: (callback: (factor: number) => void) => () => void;
}

const tigerAPI: TigerAPI = {
  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('db:getDashboardStats'),

  // Users
  getAllUsers: () => ipcRenderer.invoke('db:getAllUsers'),
  getUserByPin: (pin, userId) => ipcRenderer.invoke('db:getUserByPin', pin, userId),
  createUser: (user) => ipcRenderer.invoke('db:createUser', user),
  toggleUserActive: (userId, active) => ipcRenderer.invoke('db:toggleUserActive', userId, active),
  updateUser: (id, updates) => ipcRenderer.invoke('db:updateUser', id, updates),
  deleteUser: (id) => ipcRenderer.invoke('db:deleteUser', id),

  // Shifts
  getActiveShift: () => ipcRenderer.invoke('db:getActiveShift'),
  openShift: (userId, userName, startingCash) => ipcRenderer.invoke('db:openShift', userId, userName, startingCash),
  closeShift: (shiftId, actualCash, note) => ipcRenderer.invoke('db:closeShift', shiftId, actualCash, note),
  getShiftHistory: () => ipcRenderer.invoke('db:getShiftHistory'),

  // Phones & IMEI
  getAllPhones: (status) => ipcRenderer.invoke('db:getAllPhones', status),
  getPhoneByImei: (imei) => ipcRenderer.invoke('db:getPhoneByImei', imei),
  addPhone: (phone, actorName) => ipcRenderer.invoke('db:addPhone', phone, actorName),
  updatePhone: (id, updates, actorName) => ipcRenderer.invoke('db:updatePhone', id, updates, actorName),
  getImeiHistory: (imei) => ipcRenderer.invoke('db:getImeiHistory', imei),

  // Accessories
  getAllAccessories: () => ipcRenderer.invoke('db:getAllAccessories'),
  getAccessoryByBarcode: (barcode) => ipcRenderer.invoke('db:getAccessoryByBarcode', barcode),
  addAccessory: (acc) => ipcRenderer.invoke('db:addAccessory', acc),
  updateAccessory: (id, updates) => ipcRenderer.invoke('db:updateAccessory', id, updates),
  adjustAccessoryStock: (id, delta, reason, actor) => ipcRenderer.invoke('db:adjustAccessoryStock', id, delta, reason, actor),
  deleteAccessory: (id) => ipcRenderer.invoke('db:deleteAccessory', id),
  importAccessoriesBatch: (items) => ipcRenderer.invoke('db:importAccessoriesBatch', items),

  // Invoices & POS
  createInvoice: (invoiceData, items, tradeIn) => ipcRenderer.invoke('db:createInvoice', invoiceData, items, tradeIn),
  refundInvoice: (invoiceId, actorName) => ipcRenderer.invoke('db:refundInvoice', invoiceId, actorName),
  deleteInvoice: (invoiceId, actorName) => ipcRenderer.invoke('db:deleteInvoice', invoiceId, actorName),
  getAllInvoices: (limit) => ipcRenderer.invoke('db:getAllInvoices', limit),
  getInvoiceDetails: (invoiceId) => ipcRenderer.invoke('db:getInvoiceDetails', invoiceId),
  postInvoices: (invoiceIds) => ipcRenderer.invoke('db:postInvoices', invoiceIds),
  settleAndResetDailyDrawer: () => ipcRenderer.invoke('db:settleAndResetDailyDrawer'),

  // Repair
  getAllRepairTickets: (status) => ipcRenderer.invoke('db:getAllRepairTickets', status),
  getRepairTicketDetails: (ticketId) => ipcRenderer.invoke('db:getRepairTicketDetails', ticketId),
  createRepairTicket: (data) => ipcRenderer.invoke('db:createRepairTicket', data),
  updateRepairStatus: (ticketId, newStatus, notes, finalCost) => ipcRenderer.invoke('db:updateRepairStatus', ticketId, newStatus, notes, finalCost),
  markRepairTicketPaid: (ticketId, finalCostOverride, actorName) => ipcRenderer.invoke('db:markRepairTicketPaid', ticketId, finalCostOverride, actorName),
  getAllRepairPartsReport: () => ipcRenderer.invoke('db:getAllRepairPartsReport'),
  attachPartToRepair: (ticketId, accessoryId, quantity) => ipcRenderer.invoke('db:attachPartToRepair', ticketId, accessoryId, quantity),
  deleteRepairTicket: (ticketId) => ipcRenderer.invoke('db:deleteRepairTicket', ticketId),

  // Installments
  getAllInstallmentPlans: () => ipcRenderer.invoke('db:getAllInstallmentPlans'),
  payInstallment: (paymentId, voucherNumber, receivedBy) => ipcRenderer.invoke('db:payInstallment', paymentId, voucherNumber, receivedBy),

  // Suppliers & Customers
  getAllSuppliers: () => ipcRenderer.invoke('db:getAllSuppliers'),
  getAllCustomers: () => ipcRenderer.invoke('db:getAllCustomers'),
  addCustomer: (cust) => ipcRenderer.invoke('db:addCustomer', cust),
  getCustomerStatement: (customerId) => ipcRenderer.invoke('db:getCustomerStatement', customerId),
  payCustomerDebt: (payment) => ipcRenderer.invoke('db:payCustomerDebt', payment),
  deleteCustomer: (customerId, actorName) => ipcRenderer.invoke('db:deleteCustomer', customerId, actorName),

  // Damaged Items
  reportDamagedItem: (item) => ipcRenderer.invoke('db:reportDamagedItem', item),
  getDamagedItems: (limit) => ipcRenderer.invoke('db:getDamagedItems', limit),

  // Expenses
  getAllExpenses: (limit) => ipcRenderer.invoke('db:getAllExpenses', limit),
  addExpense: (exp) => ipcRenderer.invoke('db:addExpense', exp),

  // Settings
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  updateSettings: (settings) => ipcRenderer.invoke('db:updateSettings', settings),

  // Audit Logs
  getAuditLogs: (limit) => ipcRenderer.invoke('db:getAuditLogs', limit),

  // Excel
  exportMonthlyExcel: (yearOrOptions, month, targetPath) => ipcRenderer.invoke('excel:exportMonthly', yearOrOptions, month, targetPath),

  // Backups
  createBackup: (folder) => ipcRenderer.invoke('backup:create', folder),
  listBackups: (folder) => ipcRenderer.invoke('backup:list', folder),
  getAutoBackupStatus: () => ipcRenderer.invoke('backup:getAutoStatus'),
  restoreBackup: (filePath) => ipcRenderer.invoke('backup:restore', filePath),
  selectBackupFolder: () => ipcRenderer.invoke('backup:selectFolder'),
  selectBackupFile: () => ipcRenderer.invoke('backup:selectFile'),

  // Printing & Hardware
  printSilentHtml: (htmlContent, isBarcode, silent) => ipcRenderer.invoke('print:silentHtml', htmlContent, isBarcode, silent),
  openCashDrawer: () => ipcRenderer.invoke('printer:openCashDrawer'),

  // System & GitHub Auto-Update
  getAppVersion: () => ipcRenderer.invoke('system:getAppVersion'),
  checkGithubUpdate: (repoOverride) => ipcRenderer.invoke('system:checkGithubUpdate', repoOverride),
  downloadUpdate: (url, newVersion) => ipcRenderer.invoke('system:downloadUpdate', url, newVersion),
  installUpdateAndRestart: (filePath, newVersion) => ipcRenderer.invoke('system:installUpdateAndRestart', filePath, newVersion),
  onUpdateProgress: (callback) => {
    const handler = (_: any, evt: UpdateProgressEvent) => callback(evt);
    ipcRenderer.on('system:updateProgress', handler);
    return () => ipcRenderer.removeListener('system:updateProgress', handler);
  },
  openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),

  // Zoom & Viewport
  setZoomFactor: (factor) => ipcRenderer.invoke('system:setZoomFactor', factor),
  getZoomFactor: () => ipcRenderer.invoke('system:getZoomFactor'),
  resetZoom: () => ipcRenderer.invoke('system:resetZoom'),
  onZoomChanged: (callback) => {
    const handler = (_: any, factor: number) => callback(factor);
    ipcRenderer.on('system:zoomChanged', handler);
    return () => ipcRenderer.removeListener('system:zoomChanged', handler);
  },
};

contextBridge.exposeInMainWorld('tigerAPI', tigerAPI);

declare global {
  interface Window {
    tigerAPI: TigerAPI;
  }
}
