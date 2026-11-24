export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  pinCode: string;
  active: boolean;
  createdAt: string;
}

export type ShiftStatus = 'open' | 'closed';

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt: string | null;
  startingCash: number;
  expectedCash: number;
  actualCash: number | null;
  difference: number | null;
  note: string | null;
  status: ShiftStatus;
}

export type PhoneCondition = 'new' | 'used' | 'refurbished';
export type PhoneStatus = 'in_stock' | 'sold' | 'in_repair' | 'returned' | 'damaged';

export interface Phone {
  id: string;
  brand: string;
  model: string;
  storage: string;
  ram?: string;
  color: string;
  condition: PhoneCondition;
  batteryHealth?: number | null;
  imei1: string;
  imei2?: string | null;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  warrantyPeriod?: string;
  status: PhoneStatus;
  supplierId?: string | null;
  supplierName?: string | null;
  notes?: string | null;
  createdAt: string;
  soldAt?: string | null;
  invoiceId?: string | null;
}

export interface ImeiHistory {
  id: string;
  phoneId: string;
  imei: string;
  action: 'purchased' | 'sold' | 'trade_in' | 'returned' | 'sent_to_repair' | 'repaired' | 'price_changed' | 'status_changed' | 'damaged';
  description: string;
  referenceId?: string | null;
  actor: string;
  createdAt: string;
}

export interface Accessory {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  category: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  currentStock: number;
  minStockAlert: number;
  description?: string | null;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'card' | 'cliq' | 'split' | 'credit';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  shiftId: string | null;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  subtotal: number;
  discount: number;
  discountType?: 'fixed' | 'percent';
  taxRate?: number;
  taxAmount?: number;
  tradeInDiscount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  cashAmount: number;
  cardAmount: number;
  cliqAmount: number;
  creditAmount: number;
  status: 'completed' | 'refunded' | 'partially_refunded';
  notes?: string | null;
  cashierId: string;
  cashierName: string;
  createdAt: string;
  isPosted?: boolean;
  postedAt?: string | null;
  totalCost?: number;
  totalProfit?: number;
  items?: InvoiceItem[];
  tradeIn?: TradeInDevice | null;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemType: 'phone' | 'accessory';
  itemId: string;
  name: string;
  barcodeOrImei: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  itemDiscount?: number;
  warrantyPeriod?: string;
  total: number;
}

export interface TradeInDevice {
  id: string;
  invoiceId: string;
  brand: string;
  model: string;
  storage: string;
  color: string;
  batteryHealth?: number | null;
  imei: string;
  conditionNotes?: string | null;
  purchasePrice: number;
  createdAt: string;
}

export type RepairStatus = 'received' | 'diagnosing' | 'waiting_for_parts' | 'ready_for_pickup' | 'delivered' | 'cancelled';

export interface ConditionChecklist {
  crackedScreen: boolean;
  frameScratches: boolean;
  backCracked: boolean;
  cameraDamaged: boolean;
  simTrayMissing: boolean;
  deadDevice: boolean;
  waterDamage?: boolean;
}

export interface RepairTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  deviceImei: string;
  lockPasscode?: string | null;
  lockPattern?: string | null;
  reportedIssue: string;
  conditionChecklist: ConditionChecklist;
  estimatedCost: number;
  advancePayment: number;
  finalCost: number;
  status: RepairStatus;
  technicianNotes?: string | null;
  createdAt: string;
  isPosted?: boolean;
  postedAt?: string | null;
  expectedDeliveryDate?: string | null;
  deliveredAt?: string | null;
  parts?: RepairPart[];
}

export interface RepairPart {
  id: string;
  ticketId: string;
  accessoryId: string;
  partName: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  addedAt: string;
}

export interface InstallmentPlan {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  invoiceId: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  monthsCount: number;
  monthlyAmount: number;
  startDate: string;
  status: 'active' | 'completed' | 'defaulted';
  guarantorName?: string | null;
  guarantorIdNumber?: string | null;
  guarantorPhone?: string | null;
  guarantorAddress?: string | null;
  notes?: string | null;
  createdAt: string;
  payments?: InstallmentPayment[];
}

export interface InstallmentPayment {
  id: string;
  planId: string;
  paymentNumber: number;
  dueDate: string;
  paidDate?: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  voucherNumber?: string | null;
  receivedBy?: string | null;
  notes?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  idNumber?: string | null;
  balance: number;
  notes?: string | null;
  createdAt: string;
}

export interface CustomerStatement {
  customer: Customer;
  totalPurchases: number;
  totalPaid: number;
  currentBalance: number;
  invoices: Invoice[];
  repairTickets: RepairTicket[];
  installmentPlans: InstallmentPlan[];
  debtPayments: CustomerDebtPayment[];
}

export interface CustomerDebtPayment {
  id: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  voucherNumber: string;
  receivedBy: string;
  notes?: string | null;
  createdAt: string;
}

export interface DamagedItem {
  id: string;
  itemType: 'phone' | 'accessory';
  itemId: string;
  name: string;
  barcodeOrImei: string;
  quantity: number;
  costPrice: number;
  totalLoss: number;
  reason: string;
  actionTaken: 'write_off' | 'returned_to_supplier';
  supplierId?: string | null;
  reportedBy: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  companyName?: string | null;
  balance: number;
  notes?: string | null;
  createdAt: string;
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  invoiceDate: string;
  notes?: string | null;
}

export interface Expense {
  id: string;
  category: 'rent' | 'electricity' | 'salaries' | 'tools' | 'hospitality' | 'write_off' | 'other';
  amount: number;
  title: string;
  notes?: string | null;
  paidBy: string;
  shiftId?: string | null;
  expenseDate: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actionType: 'invoice_deleted' | 'invoices_posted' | 'price_override' | 'stock_adjusted' | 'phone_status_changed' | 'shift_closed' | 'user_created' | 'backup_restored' | 'repair_updated' | 'repair_deleted' | 'damaged_stock' | 'debt_payment' | 'customer_deleted' | 'accessory_deleted';
  actorId: string;
  actorName: string;
  details: string;
  ipOrHost: string;
  createdAt: string;
}

export interface DashboardStats {
  todaySales: number;
  todayNetProfit: number;
  activeRepairsCount: number;
  dueInstallmentsCount: number;
  lowStockCount: number;
  todayInvoicesCount: number;
  activeShift: Shift | null;
}

export interface SystemSettings {
  currencySymbol: string;
  currencyDecimals: number;
  defaultTaxRate: number;
  enableTaxByDefault: boolean;
  storeName: string;
  storePhone: string;
  storeAddress: string;
  githubRepo?: string;
  cashDrawerShortcut?: string;
  installedVersion?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  htmlUrl?: string;
  publishedAt?: string;
  error?: string;
}

// Setup state for first-run wizard
export interface SetupState {
  isFirstRun: boolean;
  adminName: string;
  adminPin: string;
  employeeName: string;
  employeePin: string;
}
