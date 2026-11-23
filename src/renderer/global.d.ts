// Global window augmentation for Electron preload bridge
import type { 
  User, Shift, Phone, Accessory, Invoice, InvoiceItem,
  TradeInDevice, RepairTicket, InstallmentPlan, Customer,
  Supplier, Expense, AuditLog, DashboardStats, ImeiHistory,
  SystemSettings, DamagedItem, CustomerStatement, CustomerDebtPayment,
  UpdateCheckResult
} from '../shared/types';

export interface TigerAPI {
  getDashboardStats: () => Promise<DashboardStats>;
  getAllUsers: () => Promise<User[]>;
  getUserByPin: (pin: string) => Promise<User | null>;
  createUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  toggleUserActive: (userId: string, active: boolean) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  getActiveShift: () => Promise<Shift | null>;
  openShift: (userId: string, userName: string, startingCash: number) => Promise<Shift>;
  closeShift: (shiftId: string, actualCash: number, note?: string) => Promise<Shift>;
  getShiftHistory: () => Promise<Shift[]>;
  getAllPhones: (status?: string) => Promise<Phone[]>;
  getPhoneByImei: (imei: string) => Promise<Phone | null>;
  addPhone: (phone: Omit<Phone, 'id' | 'createdAt'>, actorName?: string) => Promise<Phone>;
  updatePhone: (id: string, updates: Partial<Phone>, actorName?: string) => Promise<void>;
  getImeiHistory: (imei: string) => Promise<ImeiHistory[]>;
  getAllAccessories: () => Promise<Accessory[]>;
  getAccessoryByBarcode: (barcode: string) => Promise<Accessory | null>;
  addAccessory: (acc: Omit<Accessory, 'id' | 'createdAt'>) => Promise<Accessory>;
  updateAccessory: (id: string, updates: Partial<Accessory>) => Promise<void>;
  adjustAccessoryStock: (id: string, delta: number, reason?: string, actor?: string) => Promise<void>;
  importAccessoriesBatch: (items: any[]) => Promise<{ importedCount: number; updatedCount: number; errors: string[] }>;
  createInvoice: (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>, items: Omit<InvoiceItem, 'id' | 'invoiceId'>[], tradeIn?: Omit<TradeInDevice, 'id' | 'invoiceId' | 'createdAt'> | null) => Promise<Invoice>;
  refundInvoice: (invoiceId: string, actorName?: string) => Promise<void>;
  getAllInvoices: (limit?: number) => Promise<Invoice[]>;
  getInvoiceDetails: (invoiceId: string) => Promise<Invoice | null>;
  postInvoices: (invoiceIds: string[]) => Promise<{ count: number }>;
  getAllRepairTickets: (status?: string) => Promise<RepairTicket[]>;
  getRepairTicketDetails: (ticketId: string) => Promise<RepairTicket | null>;
  createRepairTicket: (data: Omit<RepairTicket, 'id' | 'ticketNumber' | 'createdAt'>) => Promise<RepairTicket>;
  updateRepairStatus: (ticketId: string, newStatus: string, notes?: string, finalCost?: number) => Promise<void>;
  attachPartToRepair: (ticketId: string, accessoryId: string, quantity?: number) => Promise<void>;
  getAllInstallmentPlans: () => Promise<InstallmentPlan[]>;
  payInstallment: (paymentId: string, voucherNumber: string, receivedBy?: string) => Promise<void>;
  getAllSuppliers: () => Promise<Supplier[]>;
  getAllCustomers: () => Promise<Customer[]>;
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  getCustomerStatement: (customerId: string) => Promise<CustomerStatement | null>;
  payCustomerDebt: (payment: Omit<CustomerDebtPayment, 'id' | 'createdAt'>) => Promise<CustomerDebtPayment>;
  reportDamagedItem: (item: Omit<DamagedItem, 'id' | 'createdAt'>) => Promise<DamagedItem>;
  getDamagedItems: (limit?: number) => Promise<DamagedItem[]>;
  getAllExpenses: (limit?: number) => Promise<Expense[]>;
  addExpense: (exp: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>;
  getSettings: () => Promise<SystemSettings>;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<SystemSettings>;
  getAuditLogs: (limit?: number) => Promise<AuditLog[]>;
  exportMonthlyExcel: (year: number, month: number, targetPath?: string) => Promise<{ success: boolean; filePath: string }>;
  createBackup: (folder?: string) => Promise<{ success: boolean; filePath: string; size: number }>;
  listBackups: (folder?: string) => Promise<{ filename: string; filePath: string; size: number; date: string }[]>;
  restoreBackup: (filePath: string) => Promise<boolean>;
  selectBackupFolder: () => Promise<string | null>;
  selectBackupFile: () => Promise<string | null>;
  printSilentHtml: (htmlContent: string, isBarcode?: boolean) => Promise<boolean>;
  openCashDrawer: () => Promise<{ success: boolean; message: string }>;
  // System & Auto-Update
  getAppVersion: () => Promise<string>;
  checkGithubUpdate: (repoOverride?: string) => Promise<UpdateCheckResult>;
  downloadUpdate: (url: string, newVersion?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  installUpdateAndRestart: (filePath?: string, newVersion?: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    tigerAPI: TigerAPI;
  }
}

export {};
