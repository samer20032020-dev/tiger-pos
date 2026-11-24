export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  starting_cash REAL NOT NULL DEFAULT 0,
  expected_cash REAL NOT NULL DEFAULT 0,
  actual_cash REAL,
  difference REAL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS phones (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  storage TEXT NOT NULL,
  ram TEXT,
  color TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'new',
  battery_health INTEGER,
  imei1 TEXT UNIQUE NOT NULL,
  imei2 TEXT,
  cost_price REAL NOT NULL,
  selling_price REAL NOT NULL,
  wholesale_price REAL NOT NULL DEFAULT 0,
  warranty_period TEXT DEFAULT 'ضمان سنة وكيل رسمي',
  status TEXT NOT NULL DEFAULT 'in_stock',
  supplier_id TEXT,
  supplier_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  sold_at TEXT,
  invoice_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_phones_imei1 ON phones(imei1);
CREATE INDEX IF NOT EXISTS idx_phones_imei2 ON phones(imei2);
CREATE INDEX IF NOT EXISTS idx_phones_status ON phones(status);
CREATE INDEX IF NOT EXISTS idx_phones_model ON phones(brand, model);

CREATE TABLE IF NOT EXISTS imei_history (
  id TEXT PRIMARY KEY,
  phone_id TEXT NOT NULL,
  imei TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_imei_history_imei ON imei_history(imei);
CREATE INDEX IF NOT EXISTS idx_imei_history_phone ON imei_history(phone_id);

CREATE TABLE IF NOT EXISTS accessories (
  id TEXT PRIMARY KEY,
  barcode TEXT UNIQUE NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  cost_price REAL NOT NULL,
  retail_price REAL NOT NULL,
  wholesale_price REAL NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 5,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accessories_barcode ON accessories(barcode);
CREATE INDEX IF NOT EXISTS idx_accessories_category ON accessories(category);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  shift_id TEXT,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'fixed',
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  trade_in_discount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  paid_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  cash_amount REAL NOT NULL DEFAULT 0,
  card_amount REAL NOT NULL DEFAULT 0,
  cliq_amount REAL NOT NULL DEFAULT 0,
  credit_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  is_posted INTEGER NOT NULL DEFAULT 0,
  posted_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_shift ON invoices(shift_id);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  barcode_or_imei TEXT NOT NULL,
  unit_price REAL NOT NULL,
  cost_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  item_discount REAL NOT NULL DEFAULT 0,
  warranty_period TEXT,
  total REAL NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS trade_in_devices (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  storage TEXT NOT NULL,
  color TEXT NOT NULL,
  battery_health INTEGER,
  imei TEXT NOT NULL,
  condition_notes TEXT,
  purchase_price REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE IF NOT EXISTS repair_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_model TEXT NOT NULL,
  device_imei TEXT NOT NULL,
  lock_passcode TEXT,
  lock_pattern TEXT,
  reported_issue TEXT NOT NULL,
  condition_checklist TEXT NOT NULL,
  estimated_cost REAL NOT NULL DEFAULT 0,
  advance_payment REAL NOT NULL DEFAULT 0,
  final_cost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received',
  technician_notes TEXT,
  is_posted INTEGER NOT NULL DEFAULT 0,
  posted_at TEXT,
  created_at TEXT NOT NULL,
  expected_delivery_date TEXT,
  delivered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_repair_tickets_status ON repair_tickets(status);
CREATE INDEX IF NOT EXISTS idx_repair_tickets_imei ON repair_tickets(device_imei);
CREATE INDEX IF NOT EXISTS idx_repair_tickets_number ON repair_tickets(ticket_number);

CREATE TABLE IF NOT EXISTS repair_parts (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  accessory_id TEXT NOT NULL,
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_cost REAL NOT NULL,
  total_price REAL NOT NULL,
  added_at TEXT NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES repair_tickets(id)
);

CREATE INDEX IF NOT EXISTS idx_repair_parts_ticket ON repair_parts(ticket_id);

CREATE TABLE IF NOT EXISTS installment_plans (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  total_amount REAL NOT NULL,
  down_payment REAL NOT NULL,
  remaining_amount REAL NOT NULL,
  months_count INTEGER NOT NULL,
  monthly_amount REAL NOT NULL,
  start_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  guarantor_name TEXT,
  guarantor_id_number TEXT,
  guarantor_phone TEXT,
  guarantor_address TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS installment_payments (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  payment_number INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  paid_date TEXT,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  voucher_number TEXT,
  received_by TEXT,
  notes TEXT,
  FOREIGN KEY (plan_id) REFERENCES installment_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_installment_payments_plan ON installment_payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_status ON installment_payments(status);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  id_number TEXT,
  balance REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_debt_payments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  voucher_number TEXT NOT NULL,
  received_by TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS damaged_items (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  barcode_or_imei TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  cost_price REAL NOT NULL,
  total_loss REAL NOT NULL,
  reason TEXT NOT NULL,
  action_taken TEXT NOT NULL DEFAULT 'write_off',
  supplier_id TEXT,
  reported_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_name TEXT,
  balance REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  total_amount REAL NOT NULL,
  paid_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid',
  invoice_date TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  paid_by TEXT NOT NULL,
  shift_id TEXT,
  expense_date TEXT NOT NULL,
  is_posted INTEGER NOT NULL DEFAULT 0,
  posted_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_or_host TEXT NOT NULL DEFAULT 'localhost',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const SAFE_MIGRATIONS_SQL = [
  "ALTER TABLE phones ADD COLUMN wholesale_price REAL NOT NULL DEFAULT 0;",
  "ALTER TABLE phones ADD COLUMN warranty_period TEXT DEFAULT 'ضمان سنة وكيل رسمي';",
  "ALTER TABLE invoices ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'fixed';",
  "ALTER TABLE invoices ADD COLUMN tax_rate REAL NOT NULL DEFAULT 0;",
  "ALTER TABLE invoices ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0;",
  "ALTER TABLE invoice_items ADD COLUMN item_discount REAL NOT NULL DEFAULT 0;",
  "ALTER TABLE invoice_items ADD COLUMN warranty_period TEXT;",
  "ALTER TABLE installment_plans ADD COLUMN guarantor_name TEXT;",
  "ALTER TABLE installment_plans ADD COLUMN guarantor_id_number TEXT;",
  "ALTER TABLE installment_plans ADD COLUMN guarantor_phone TEXT;",
  "ALTER TABLE installment_plans ADD COLUMN guarantor_address TEXT;",
  "ALTER TABLE invoices ADD COLUMN is_posted INTEGER NOT NULL DEFAULT 0;",
  "ALTER TABLE invoices ADD COLUMN posted_at TEXT;",
  "ALTER TABLE repair_tickets ADD COLUMN is_posted INTEGER NOT NULL DEFAULT 0;",
  "ALTER TABLE repair_tickets ADD COLUMN posted_at TEXT;",
  "ALTER TABLE expenses ADD COLUMN is_posted INTEGER NOT NULL DEFAULT 0;",
  "ALTER TABLE expenses ADD COLUMN posted_at TEXT;"
];
