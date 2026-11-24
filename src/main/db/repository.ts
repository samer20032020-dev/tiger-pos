import { LocalDatabase } from './database';
import { 
  User, Shift, Phone, Accessory, Invoice, InvoiceItem, 
  TradeInDevice, RepairTicket, RepairPart, InstallmentPlan, 
  InstallmentPayment, Customer, CustomerStatement, CustomerDebtPayment,
  DamagedItem, Supplier, SupplierInvoice, Expense, AuditLog, 
  DashboardStats, ImeiHistory, SystemSettings, PaymentMethod 
} from '../../shared/types';

export class TigerRepository {
  constructor(private db: LocalDatabase) {}

  // ==================== SYSTEM SETTINGS ====================
  public getSettings(): SystemSettings {
    const rows = this.db.query('SELECT key, value FROM system_settings');
    const settings: any = {
      currencySymbol: 'د.أ',
      currencyDecimals: 3,
      defaultTaxRate: 0,
      enableTaxByDefault: false,
      storeName: 'TIGER',
      storePhone: '',
      storeAddress: '',
      githubRepo: 'samer20032020-dev/tiger-pos',
      cashDrawerShortcut: 'F12',
      installedVersion: '0.6.4'
    };
    for (const r of rows) {
      if (r.key === 'currencyDecimals') {
        settings.currencyDecimals = Number(r.value);
      } else if (r.key === 'defaultTaxRate') {
        settings.defaultTaxRate = Math.min(5.5, Math.max(0, Number(r.value)));
      } else if (r.key === 'enableTaxByDefault') {
        settings[r.key] = r.value === '1' || r.value === 'true';
      } else if (r.key === 'githubRepo') {
        settings.githubRepo = (r.value === 'drsamer/tiger-pos') ? 'samer20032020-dev/tiger-pos' : r.value;
      } else if (r.key === 'currencySymbol') {
        settings.currencySymbol = (r.value && r.value.trim()) ? r.value.trim() : 'د.أ';
      } else {
        settings[r.key] = r.value;
      }
    }
    return settings;
  }

  public updateSettings(updates: Partial<SystemSettings>): void {
    this.db.transaction(() => {
      for (const [key, val] of Object.entries(updates)) {
        this.db.run(
          'INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
          [key, String(val), String(val)]
        );
      }
    });
  }

  // ==================== USERS & AUTH ====================
  public getAllUsers(): User[] {
    const rows = this.db.query('SELECT * FROM users ORDER BY created_at ASC');
    return rows.map(r => ({
      id: r.id,
      username: r.username,
      fullName: r.full_name,
      role: r.role,
      pinCode: r.pin_code,
      active: Boolean(r.active),
      createdAt: r.created_at
    }));
  }

  public getUserByPin(pin: string): User | null {
    const r = this.db.queryOne('SELECT * FROM users WHERE pin_code = ? AND active = 1', [pin]);
    if (!r) return null;
    return {
      id: r.id,
      username: r.username,
      fullName: r.full_name,
      role: r.role,
      pinCode: r.pin_code,
      active: Boolean(r.active),
      createdAt: r.created_at
    };
  }

  public createUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const id = `usr-${Date.now()}`;
    const createdAt = new Date().toISOString();
    this.db.run(
      'INSERT INTO users (id, username, full_name, role, pin_code, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, user.username, user.fullName, user.role, user.pinCode, user.active ? 1 : 0, createdAt]
    );
    this.logAudit('user_created', 'admin', 'المدير', `تم إنشاء مستخدم جديد: ${user.fullName} (${user.role})`);
    return { id, createdAt, ...user };
  }

  public toggleUserActive(userId: string, active: boolean): void {
    this.db.run('UPDATE users SET active = ? WHERE id = ?', [active ? 1 : 0, userId]);
  }

  public updateUser(id: string, updates: Partial<User>): void {
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.fullName !== undefined) {
      fields.push('full_name = ?');
      values.push(updates.fullName);
    }
    if (updates.pinCode !== undefined) {
      fields.push('pin_code = ?');
      values.push(updates.pinCode);
    }
    if (updates.active !== undefined) {
      fields.push('active = ?');
      values.push(updates.active ? 1 : 0);
    }
    if (fields.length === 0) return;
    values.push(id);
    this.db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    this.logAudit('user_created', 'admin', 'المدير', `تم تعديل بيانات المستخدم: ${id}`);
  }

  public deleteUser(id: string): void {
    this.db.run('DELETE FROM users WHERE id = ?', [id]);
    this.logAudit('user_created', 'admin', 'المدير', `تم حذف المستخدم نهائياً: ${id}`);
  }

  // ==================== SHIFTS ====================
  public getActiveShift(): Shift | null {
    const r = this.db.queryOne('SELECT * FROM shifts WHERE status = "open" ORDER BY opened_at DESC LIMIT 1');
    if (!r) return null;
    return {
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      openedAt: r.opened_at,
      closedAt: r.closed_at,
      startingCash: r.starting_cash,
      expectedCash: r.expected_cash,
      actualCash: r.actual_cash,
      difference: r.difference,
      note: r.note,
      status: r.status
    };
  }

  public openShift(userId: string, userName: string, startingCash: number): Shift {
    const active = this.getActiveShift();
    if (active) throw new Error('توجد وردية مفتوحة بالفعل! يجب إغلاقها أولاً.');

    const id = `sh-${Date.now()}`;
    const openedAt = new Date().toISOString();
    this.db.run(
      'INSERT INTO shifts (id, user_id, user_name, opened_at, starting_cash, expected_cash, status) VALUES (?, ?, ?, ?, ?, ?, "open")',
      [id, userId, userName, openedAt, startingCash, startingCash]
    );
    this.logAudit('shift_closed', userId, userName, `تم فتح وردية جديدة بمبلغ افتتاحي: ${startingCash.toFixed(3)} د.أ`);
    return {
      id,
      userId,
      userName,
      openedAt,
      closedAt: null,
      startingCash,
      expectedCash: startingCash,
      actualCash: null,
      difference: null,
      note: null,
      status: 'open'
    };
  }

  public closeShift(shiftId: string, actualCash: number, note: string = ''): Shift {
    const shift = this.db.queryOne('SELECT * FROM shifts WHERE id = ? AND status = "open"', [shiftId]);
    if (!shift) throw new Error('الوردية غير موجودة أو تم إغلاقها مسبقاً');

    const closedAt = new Date().toISOString();
    const difference = actualCash - shift.expected_cash;

    return this.db.transaction(() => {
      this.db.run(
        'UPDATE shifts SET closed_at = ?, actual_cash = ?, difference = ?, note = ?, status = "closed" WHERE id = ?',
        [closedAt, actualCash, difference, note, shiftId]
      );

      // Automatically post unposted invoices, expenses, and delivered repairs for the shift
      this.db.run('UPDATE invoices SET is_posted = 1, posted_at = ? WHERE is_posted = 0', [closedAt]);
      this.db.run('UPDATE expenses SET is_posted = 1, posted_at = ? WHERE is_posted = 0 OR is_posted IS NULL', [closedAt]);
      this.db.run('UPDATE repair_tickets SET is_posted = 1, posted_at = ? WHERE (is_posted = 0 OR is_posted IS NULL) AND status IN ("delivered", "cancelled")', [closedAt]);

      this.logAudit('shift_closed', shift.user_id, shift.user_name, `تم إغلاق الوردية ${shiftId} وترحيل العمليات. متوقع: ${shift.expected_cash.toFixed(3)} د.أ، الفعلي: ${actualCash.toFixed(3)} د.أ، الفارق: ${difference.toFixed(3)} د.أ`);

      return {
        id: shift.id,
        userId: shift.user_id,
        userName: shift.user_name,
        openedAt: shift.opened_at,
        closedAt,
        startingCash: shift.starting_cash,
        expectedCash: shift.expected_cash,
        actualCash,
        difference,
        note,
        status: 'closed'
      };
    });
  }

  public getShiftHistory(limit = 20): Shift[] {
    const rows = this.db.query('SELECT * FROM shifts ORDER BY opened_at DESC LIMIT ?', [limit]);
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      openedAt: r.opened_at,
      closedAt: r.closed_at,
      startingCash: r.starting_cash,
      expectedCash: r.expected_cash,
      actualCash: r.actual_cash,
      difference: r.difference,
      note: r.note,
      status: r.status
    }));
  }

  // ==================== PHONES & IMEI ====================
  public getAllPhones(status?: string): Phone[] {
    let sql = 'SELECT * FROM phones';
    const params: any[] = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = this.db.query(sql, params);
    return rows.map(r => ({
      id: r.id,
      brand: r.brand,
      model: r.model,
      storage: r.storage,
      ram: r.ram,
      color: r.color,
      condition: r.condition,
      batteryHealth: r.battery_health,
      imei1: r.imei1,
      imei2: r.imei2,
      costPrice: r.cost_price,
      sellingPrice: r.selling_price,
      wholesalePrice: r.wholesale_price || 0,
      warrantyPeriod: r.warranty_period || 'ضمان سنة وكيل رسمي',
      status: r.status,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      notes: r.notes,
      createdAt: r.created_at,
      soldAt: r.sold_at,
      invoiceId: r.invoice_id
    }));
  }

  public getPhoneByImei(imei: string): Phone | null {
    const r = this.db.queryOne('SELECT * FROM phones WHERE imei1 = ? OR imei2 = ?', [imei, imei]);
    if (!r) return null;
    return {
      id: r.id,
      brand: r.brand,
      model: r.model,
      storage: r.storage,
      ram: r.ram,
      color: r.color,
      condition: r.condition,
      batteryHealth: r.battery_health,
      imei1: r.imei1,
      imei2: r.imei2,
      costPrice: r.cost_price,
      sellingPrice: r.selling_price,
      wholesalePrice: r.wholesale_price || 0,
      warrantyPeriod: r.warranty_period || 'ضمان سنة وكيل رسمي',
      status: r.status,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      notes: r.notes,
      createdAt: r.created_at,
      soldAt: r.sold_at,
      invoiceId: r.invoice_id
    };
  }

  public addPhone(phone: Omit<Phone, 'id' | 'createdAt'>, actorName = 'النظام'): Phone {
    const existing = this.getPhoneByImei(phone.imei1);
    if (existing) throw new Error(`الهاتف بالرقم التسلسلي IMEI 1 (${phone.imei1}) مسجل مسبقاً!`);

    const id = `ph-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const wholesalePrice = phone.wholesalePrice || Math.round(phone.costPrice * 1.08);
    const warrantyPeriod = phone.warrantyPeriod || (phone.condition === 'new' ? 'ضمان سنة وكيل رسمي' : 'ضمان فحص 7 أيام للمستعمل');

    this.db.transaction(() => {
      this.db.run(`
        INSERT INTO phones (
          id, brand, model, storage, ram, color, condition, battery_health,
          imei1, imei2, cost_price, selling_price, wholesale_price, warranty_period,
          status, supplier_id, supplier_name, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, phone.brand, phone.model, phone.storage, phone.ram || null, phone.color,
        phone.condition, phone.batteryHealth || null, phone.imei1, phone.imei2 || null,
        phone.costPrice, phone.sellingPrice, wholesalePrice, warrantyPeriod,
        phone.status || 'in_stock', phone.supplierId || null, phone.supplierName || null, phone.notes || null, createdAt
      ]);

      this.addImeiHistory({
        phoneId: id,
        imei: phone.imei1,
        action: 'purchased',
        description: `إدخال الجهاز للمخزون - الموديل: ${phone.brand} ${phone.model} (${phone.storage}) بسعر تكلفة ${phone.costPrice.toFixed(3)} د.أ ومفرق ${phone.sellingPrice.toFixed(3)} د.أ`,
        actor: actorName
      });
    });

    return { id, createdAt, wholesalePrice, warrantyPeriod, ...phone };
  }

  public updatePhone(id: string, updates: Partial<Phone>, actorName = 'المسؤول'): void {
    const current = this.db.queryOne('SELECT * FROM phones WHERE id = ?', [id]);
    if (!current) throw new Error('الجهاز غير موجود');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.sellingPrice !== undefined && updates.sellingPrice !== current.selling_price) {
      fields.push('selling_price = ?');
      values.push(updates.sellingPrice);
      this.logAudit('price_override', 'usr', actorName, `تعديل سعر بيع الهاتف ${current.brand} ${current.model} من ${current.selling_price.toFixed(3)} إلى ${updates.sellingPrice.toFixed(3)}`);
    }
    if (updates.wholesalePrice !== undefined) {
      fields.push('wholesale_price = ?');
      values.push(updates.wholesalePrice);
    }
    if (updates.warrantyPeriod !== undefined) {
      fields.push('warranty_period = ?');
      values.push(updates.warrantyPeriod);
    }
    if (updates.costPrice !== undefined) {
      fields.push('cost_price = ?');
      values.push(updates.costPrice);
    }
    if (updates.status !== undefined && updates.status !== current.status) {
      fields.push('status = ?');
      values.push(updates.status);
      this.addImeiHistory({
        phoneId: id,
        imei: current.imei1,
        action: 'status_changed',
        description: `تغيير حالة الجهاز من ${current.status} إلى ${updates.status}`,
        actor: actorName
      });
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.batteryHealth !== undefined) {
      fields.push('battery_health = ?');
      values.push(updates.batteryHealth);
    }

    if (fields.length > 0) {
      values.push(id);
      this.db.run(`UPDATE phones SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  public getImeiHistory(imei: string): ImeiHistory[] {
    const rows = this.db.query('SELECT * FROM imei_history WHERE imei = ? ORDER BY created_at DESC', [imei]);
    const historyList: ImeiHistory[] = rows.map(r => ({
      id: r.id,
      phoneId: r.phone_id,
      imei: r.imei,
      action: r.action,
      description: r.description,
      referenceId: r.reference_id,
      actor: r.actor,
      createdAt: r.created_at
    }));

    // Auto-link any Repair tickets for this IMEI
    const repairTickets = this.db.query('SELECT * FROM repair_tickets WHERE device_imei = ?', [imei]);
    for (const t of repairTickets) {
      const alreadyLinked = historyList.some(h => h.referenceId === t.ticket_number);
      if (!alreadyLinked) {
        historyList.push({
          id: `hist-rep-${t.id}`,
          phoneId: t.device_imei,
          imei: t.device_imei,
          action: 'sent_to_repair',
          description: `دخول الجهاز لقسم الصيانة: كرت رقم ${t.ticket_number} - العطل: ${t.reported_issue} (${t.status})`,
          referenceId: t.ticket_number,
          actor: 'قسم الصيانة',
          createdAt: t.created_at
        });
      }
    }

    return historyList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public addImeiHistory(entry: Omit<ImeiHistory, 'id' | 'createdAt'>): void {
    const id = `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createdAt = new Date().toISOString();
    this.db.run(`
      INSERT INTO imei_history (id, phone_id, imei, action, description, reference_id, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, entry.phoneId, entry.imei, entry.action, entry.description, entry.referenceId || null, entry.actor, createdAt]);
  }

  // ==================== ACCESSORIES ====================
  public getAllAccessories(): Accessory[] {
    const rows = this.db.query('SELECT * FROM accessories ORDER BY name ASC');
    return rows.map(r => ({
      id: r.id,
      barcode: r.barcode,
      sku: r.sku,
      name: r.name,
      category: r.category,
      costPrice: r.cost_price,
      retailPrice: r.retail_price,
      wholesalePrice: r.wholesale_price,
      currentStock: r.current_stock,
      minStockAlert: r.min_stock_alert,
      description: r.description,
      createdAt: r.created_at
    }));
  }

  public getAccessoryByBarcode(barcode: string): Accessory | null {
    const r = this.db.queryOne('SELECT * FROM accessories WHERE barcode = ?', [barcode]);
    if (!r) return null;
    return {
      id: r.id,
      barcode: r.barcode,
      sku: r.sku,
      name: r.name,
      category: r.category,
      costPrice: r.cost_price,
      retailPrice: r.retail_price,
      wholesalePrice: r.wholesale_price,
      currentStock: r.current_stock,
      minStockAlert: r.min_stock_alert,
      description: r.description,
      createdAt: r.created_at
    };
  }

  public addAccessory(acc: Omit<Accessory, 'id' | 'createdAt'>): Accessory {
    const existing = this.getAccessoryByBarcode(acc.barcode);
    if (existing) throw new Error(`الباركود (${acc.barcode}) مسجل مسبقاً لصنف: ${existing.name}`);

    const id = `acc-${Date.now()}`;
    const createdAt = new Date().toISOString();
    this.db.run(`
      INSERT INTO accessories (id, barcode, sku, name, category, cost_price, retail_price, wholesale_price, current_stock, min_stock_alert, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, acc.barcode, acc.sku, acc.name, acc.category, acc.costPrice, acc.retailPrice, acc.wholesalePrice, acc.currentStock, acc.minStockAlert, acc.description || null, createdAt]);

    return { id, createdAt, ...acc };
  }

  public updateAccessory(id: string, updates: Partial<Accessory>): void {
    const current = this.db.queryOne('SELECT * FROM accessories WHERE id = ?', [id]);
    if (!current) throw new Error('الصنف غير موجود');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.costPrice !== undefined) { fields.push('cost_price = ?'); values.push(updates.costPrice); }
    if (updates.retailPrice !== undefined) { fields.push('retail_price = ?'); values.push(updates.retailPrice); }
    if (updates.wholesalePrice !== undefined) { fields.push('wholesale_price = ?'); values.push(updates.wholesalePrice); }
    if (updates.currentStock !== undefined) { fields.push('current_stock = ?'); values.push(updates.currentStock); }
    if (updates.minStockAlert !== undefined) { fields.push('min_stock_alert = ?'); values.push(updates.minStockAlert); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.barcode !== undefined) { fields.push('barcode = ?'); values.push(updates.barcode); }
    if (updates.sku !== undefined) { fields.push('sku = ?'); values.push(updates.sku); }

    if (fields.length > 0) {
      values.push(id);
      this.db.run(`UPDATE accessories SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  public adjustAccessoryStock(id: string, delta: number, reason = '', actor = 'النظام'): void {
    const current = this.db.queryOne('SELECT * FROM accessories WHERE id = ?', [id]);
    if (!current) throw new Error('الصنف غير موجود');
    const newStock = current.current_stock + delta;
    this.db.run('UPDATE accessories SET current_stock = ? WHERE id = ?', [newStock, id]);
    this.logAudit('stock_adjusted', 'usr', actor, `تعديل مخزون ${current.name} بمقدار (${delta > 0 ? '+' : ''}${delta}). الرصيد الجديد: ${newStock}. السبب: ${reason}`);
  }

  public importAccessoriesBatch(items: Array<{
    barcode?: string;
    sku?: string;
    name: string;
    category?: string;
    costPrice?: number;
    retailPrice?: number;
    wholesalePrice?: number;
    currentStock?: number;
    minStockAlert?: number;
    description?: string;
  }>): { importedCount: number; updatedCount: number; errors: string[] } {
    return this.db.transaction(() => {
      let importedCount = 0;
      let updatedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          const name = (item.name || '').trim();
          if (!name) continue;

          let sku = (item.sku || '').trim();
          let barcode = (item.barcode || '').trim();

          if (!barcode) {
            if (sku) {
              barcode = `TGR${sku.padStart(5, '0')}`;
            } else {
              barcode = `TGR${Date.now().toString().slice(-6)}${String(i + 1).padStart(2, '0')}`;
            }
          }

          if (!sku) {
            sku = barcode.slice(-6);
          }

          const category = (item.category || 'أخرى').trim();
          const costPrice = Number(item.costPrice) || 0;
          const retailPrice = Number(item.retailPrice) || 0;
          const wholesalePrice = Number(item.wholesalePrice) || retailPrice;
          const currentStock = Number(item.currentStock) || 0;
          const minStockAlert = Number(item.minStockAlert) || 3;
          const description = (item.description || '').trim() || null;

          const existing = this.db.queryOne('SELECT * FROM accessories WHERE barcode = ?', [barcode]);

          if (existing) {
            this.db.run(`
              UPDATE accessories 
              SET current_stock = ?,
                  cost_price = ?,
                  retail_price = ?,
                  wholesale_price = ?,
                  min_stock_alert = ?,
                  category = ?,
                  description = COALESCE(?, description)
              WHERE id = ?
            `, [currentStock, costPrice, retailPrice, wholesalePrice, minStockAlert, category, description, existing.id]);
            updatedCount++;
          } else {
            const id = `acc-${Date.now()}-${i}`;
            const createdAt = new Date().toISOString();
            this.db.run(`
              INSERT INTO accessories (id, barcode, sku, name, category, cost_price, retail_price, wholesale_price, current_stock, min_stock_alert, description, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, barcode, sku, name, category, costPrice, retailPrice, wholesalePrice, currentStock, minStockAlert, description, createdAt]);
            importedCount++;
          }
        } catch (err: any) {
          errors.push(`خطأ في الصنف (${items[i]?.name || i + 1}): ${err.message}`);
        }
      }

      this.logAudit('stock_adjusted', 'system', 'المدير', `استيراد كميات وتحديث أصناف إكسل/CSV (${importedCount} جديد، ${updatedCount} محدث)`);
      return { importedCount, updatedCount, errors };
    });
  }

  // ==================== DAMAGED / WRITE-OFF (التوالف) ====================
  public reportDamagedItem(params: {
    itemType: 'phone' | 'accessory';
    itemId: string;
    quantity: number;
    reason: string;
    actionTaken: 'write_off' | 'returned_to_supplier';
    supplierId?: string | null;
    reportedBy: string;
  }): DamagedItem {
    return this.db.transaction(() => {
      const id = `dmg-${Date.now()}`;
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      let name = '';
      let barcodeOrImei = '';
      let costPrice = 0;

      if (params.itemType === 'accessory') {
        const acc = this.db.queryOne('SELECT * FROM accessories WHERE id = ?', [params.itemId]);
        if (!acc) throw new Error('الصنف غير موجود');
        if (acc.current_stock < params.quantity) throw new Error('الكمية المراد إتلافها أكبر من المخزون المتوفر');
        name = acc.name;
        barcodeOrImei = acc.barcode;
        costPrice = acc.cost_price;

        // Deduct from stock
        this.db.run('UPDATE accessories SET current_stock = current_stock - ? WHERE id = ?', [params.quantity, acc.id]);
      } else {
        const phone = this.db.queryOne('SELECT * FROM phones WHERE id = ?', [params.itemId]);
        if (!phone) throw new Error('الهاتف غير موجود');
        name = `${phone.brand} ${phone.model} (${phone.storage})`;
        barcodeOrImei = phone.imei1;
        costPrice = phone.cost_price;

        // Mark phone as damaged
        this.db.run('UPDATE phones SET status = "damaged" WHERE id = ?', [phone.id]);
        this.addImeiHistory({
          phoneId: phone.id,
          imei: phone.imei1,
          action: 'damaged',
          description: `تسجيل الجهاز كتالف / خردة. السبب: ${params.reason} (${params.actionTaken === 'returned_to_supplier' ? 'مرتجع للمورد' : 'إتلاف وخسارة'})`,
          actor: params.reportedBy
        });
      }

      const totalLoss = costPrice * params.quantity;

      this.db.run(`
        INSERT INTO damaged_items (
          id, item_type, item_id, name, barcode_or_imei, quantity, cost_price, total_loss, reason, action_taken, supplier_id, reported_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, params.itemType, params.itemId, name, barcodeOrImei, params.quantity, costPrice, totalLoss,
        params.reason, params.actionTaken, params.supplierId || null, params.reportedBy, now
      ]);

      // If written off as store loss, automatically add an expense so it reduces Net Profit accurately!
      if (params.actionTaken === 'write_off') {
        this.addExpense({
          category: 'write_off',
          amount: totalLoss,
          title: `خسارة إتلاف بضاعة: ${name} (${params.quantity} قطعة)`,
          notes: `سبب الإتلاف: ${params.reason}. تم التوثيق بواسطة: ${params.reportedBy}`,
          paidBy: params.reportedBy,
          shiftId: null,
          expenseDate: today
        });
      }

      this.logAudit('damaged_stock', 'usr', params.reportedBy, `تسجيل توالف: ${name} (كمية ${params.quantity}) بخسارة إجمالية ${totalLoss.toFixed(3)} د.أ`);

      return {
        id,
        itemType: params.itemType,
        itemId: params.itemId,
        name,
        barcodeOrImei,
        quantity: params.quantity,
        costPrice,
        totalLoss,
        reason: params.reason,
        actionTaken: params.actionTaken,
        supplierId: params.supplierId || null,
        reportedBy: params.reportedBy,
        createdAt: now
      };
    });
  }

  public getDamagedItems(limit = 100): DamagedItem[] {
    const rows = this.db.query('SELECT * FROM damaged_items ORDER BY created_at DESC LIMIT ?', [limit]);
    return rows.map(r => ({
      id: r.id,
      itemType: r.item_type,
      itemId: r.item_id,
      name: r.name,
      barcodeOrImei: r.barcode_or_imei,
      quantity: r.quantity,
      costPrice: r.cost_price,
      totalLoss: r.total_loss,
      reason: r.reason,
      actionTaken: r.action_taken,
      supplierId: r.supplier_id,
      reportedBy: r.reported_by,
      createdAt: r.created_at
    }));
  }

  // ==================== POS, INVOICES & TRADE-IN ====================
  public createInvoice(
    invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>,
    items: Omit<InvoiceItem, 'id' | 'invoiceId'>[],
    tradeIn?: Omit<TradeInDevice, 'id' | 'invoiceId' | 'createdAt'> | null
  ): Invoice {
    return this.db.transaction(() => {
      const invoiceId = `inv-${Date.now()}`;
      const now = new Date().toISOString();
      const countRes = this.db.queryOne('SELECT COUNT(*) as count FROM invoices');
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String((countRes?.count || 0) + 1).padStart(5, '0')}`;

      // Insert invoice
      this.db.run(`
        INSERT INTO invoices (
          id, invoice_number, shift_id, customer_id, customer_name, customer_phone,
          subtotal, discount, discount_type, tax_rate, tax_amount, trade_in_discount, total_amount, paid_amount, remaining_amount,
          payment_method, cash_amount, card_amount, cliq_amount, credit_amount,
          status, notes, cashier_id, cashier_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId, invoiceNumber, invoiceData.shiftId || null, invoiceData.customerId || null,
        invoiceData.customerName, invoiceData.customerPhone || null,
        invoiceData.subtotal, invoiceData.discount, invoiceData.discountType || 'fixed',
        invoiceData.taxRate || 0, invoiceData.taxAmount || 0, invoiceData.tradeInDiscount,
        invoiceData.totalAmount, invoiceData.paidAmount, invoiceData.remainingAmount,
        invoiceData.paymentMethod, invoiceData.cashAmount, invoiceData.cardAmount,
        invoiceData.cliqAmount, invoiceData.creditAmount, 'completed',
        invoiceData.notes || null, invoiceData.cashierId, invoiceData.cashierName, now
      ]);

      // Insert Items & adjust stock
      const createdItems: InvoiceItem[] = [];
      for (const item of items) {
        const itemId = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.db.run(`
          INSERT INTO invoice_items (id, invoice_id, item_type, item_id, name, barcode_or_imei, unit_price, cost_price, quantity, item_discount, warranty_period, total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId, invoiceId, item.itemType, item.itemId, item.name, item.barcodeOrImei,
          item.unitPrice, item.costPrice, item.quantity, item.itemDiscount || 0,
          item.warrantyPeriod || null, item.total
        ]);

        if (item.itemType === 'accessory') {
          this.db.run('UPDATE accessories SET current_stock = current_stock - ? WHERE id = ?', [item.quantity, item.itemId]);
        } else if (item.itemType === 'phone') {
          this.db.run('UPDATE phones SET status = "sold", sold_at = ?, invoice_id = ? WHERE id = ?', [now, invoiceId, item.itemId]);
          this.addImeiHistory({
            phoneId: item.itemId,
            imei: item.barcodeOrImei,
            action: 'sold',
            description: `تم بيع الجهاز بموجب فاتورة رقم ${invoiceNumber} للعميل ${invoiceData.customerName} بسعر ${item.unitPrice.toFixed(3)} د.أ (الضمان: ${item.warrantyPeriod || 'سنة وكيل'})`,
            referenceId: invoiceNumber,
            actor: invoiceData.cashierName
          });
        }

        createdItems.push({ id: itemId, invoiceId, ...item });
      }

      // Handle Trade-In if provided
      let createdTradeIn: TradeInDevice | null = null;
      if (tradeIn && tradeIn.purchasePrice > 0) {
        const tradeInId = `trd-${Date.now()}`;
        this.db.run(`
          INSERT INTO trade_in_devices (id, invoice_id, brand, model, storage, color, battery_health, imei, condition_notes, purchase_price, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          tradeInId, invoiceId, tradeIn.brand, tradeIn.model, tradeIn.storage, tradeIn.color,
          tradeIn.batteryHealth || null, tradeIn.imei, tradeIn.conditionNotes || null, tradeIn.purchasePrice, now
        ]);

        // Automatically add into Phone inventory under 'used' condition!
        const usedPhoneId = `ph-used-${Date.now()}`;
        this.db.run(`
          INSERT INTO phones (
            id, brand, model, storage, ram, color, condition, battery_health,
            imei1, imei2, cost_price, selling_price, wholesale_price, warranty_period,
            status, supplier_id, supplier_name, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'used', ?, ?, NULL, ?, ?, ?, 'ضمان فحص 7 أيام للمستعمل', 'in_stock', NULL, ?, ?, ?)
        `, [
          usedPhoneId, tradeIn.brand, tradeIn.model, tradeIn.storage, '4GB', tradeIn.color,
          tradeIn.batteryHealth || null, tradeIn.imei, tradeIn.purchasePrice,
          Math.round(tradeIn.purchasePrice * 1.25), // reasonable default margin
          Math.round(tradeIn.purchasePrice * 1.12),
          `Trade-In (${invoiceData.customerName})`,
          `جهاز مستعمل تم شراؤه كبديل بالفاتورة ${invoiceNumber}. ${tradeIn.conditionNotes || ''}`,
          now
        ]);

        this.addImeiHistory({
          phoneId: usedPhoneId,
          imei: tradeIn.imei,
          action: 'trade_in',
          description: `تم شراء الجهاز كبديل (Trade-In) بمبلغ ${tradeIn.purchasePrice.toFixed(3)} د.أ وخصمه من الفاتورة ${invoiceNumber}`,
          referenceId: invoiceNumber,
          actor: invoiceData.cashierName
        });

        createdTradeIn = { id: tradeInId, invoiceId, createdAt: now, ...tradeIn };
      }

      // Update Shift cash if shift is open
      if (invoiceData.shiftId && invoiceData.cashAmount > 0) {
        this.db.run('UPDATE shifts SET expected_cash = expected_cash + ? WHERE id = ?', [invoiceData.cashAmount, invoiceData.shiftId]);
      }

      // Update customer balance if remaining amount > 0
      if (invoiceData.customerId && invoiceData.remainingAmount > 0) {
        this.db.run('UPDATE customers SET balance = balance + ? WHERE id = ?', [invoiceData.remainingAmount, invoiceData.customerId]);
      }

      return {
        id: invoiceId,
        invoiceNumber,
        createdAt: now,
        items: createdItems,
        tradeIn: createdTradeIn,
        ...invoiceData
      };
    });
  }

  public refundInvoice(invoiceId: string, actorName = 'المدير'): void {
    this.db.transaction(() => {
      const invoice = this.db.queryOne('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      if (!invoice) throw new Error('الفاتورة غير موجودة');
      if (invoice.status === 'refunded') throw new Error('تم استرجاع هذه الفاتورة مسبقاً');

      // Restock items
      const items = this.db.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
      for (const item of items) {
        if (item.item_type === 'accessory') {
          this.db.run('UPDATE accessories SET current_stock = current_stock + ? WHERE id = ?', [item.quantity, item.item_id]);
        } else if (item.item_type === 'phone') {
          this.db.run('UPDATE phones SET status = "in_stock", sold_at = NULL, invoice_id = NULL WHERE id = ?', [item.item_id]);
          this.addImeiHistory({
            phoneId: item.item_id,
            imei: item.barcode_or_imei,
            action: 'returned',
            description: `تم إرجاع الجهاز للمخزون واسترداد الفاتورة ${invoice.invoice_number}`,
            referenceId: invoice.invoice_number,
            actor: actorName
          });
        }
      }

      // Deduct cash from active shift if cash was paid
      const activeShift = this.getActiveShift();
      if (activeShift && invoice.cash_amount > 0) {
        this.db.run('UPDATE shifts SET expected_cash = expected_cash - ? WHERE id = ?', [invoice.cash_amount, activeShift.id]);
      }

      // Revert customer balance if credit
      if (invoice.customer_id && invoice.remaining_amount > 0) {
        this.db.run('UPDATE customers SET balance = balance - ? WHERE id = ?', [invoice.remaining_amount, invoice.customer_id]);
      }

      this.db.run('UPDATE invoices SET status = "refunded" WHERE id = ?', [invoiceId]);
      this.logAudit('invoice_deleted', 'usr', actorName, `تم استرجاع الفاتورة ${invoice.invoice_number} وإعادة البضاعة للمخزون بمبلغ ${invoice.total_amount.toFixed(3)} د.أ`);
    });
  }

  public getAllInvoices(limit = 100): Invoice[] {
    const rows = this.db.query(`
      SELECT inv.*, 
        (SELECT COALESCE(SUM(ii.cost_price * ii.quantity), 0) FROM invoice_items ii WHERE ii.invoice_id = inv.id) as total_cost 
      FROM invoices inv 
      ORDER BY inv.created_at DESC 
      LIMIT ?
    `, [limit]);

    return rows.map(r => {
      const totalCost = Number(r.total_cost || 0);
      const totalAmount = Number(r.total_amount || 0);

      const items: InvoiceItem[] = this.db.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [r.id]).map(it => ({
        id: it.id,
        invoiceId: it.invoice_id,
        itemType: it.item_type,
        itemId: it.item_id,
        name: it.name,
        barcodeOrImei: it.barcode_or_imei,
        unitPrice: it.unit_price,
        costPrice: it.cost_price,
        quantity: it.quantity,
        itemDiscount: it.item_discount || 0,
        warrantyPeriod: it.warranty_period,
        total: it.total
      }));

      return {
        id: r.id,
        invoiceNumber: r.invoice_number,
        shiftId: r.shift_id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        subtotal: r.subtotal,
        discount: r.discount,
        discountType: r.discount_type || 'fixed',
        taxRate: r.tax_rate || 0,
        taxAmount: r.tax_amount || 0,
        tradeInDiscount: r.trade_in_discount,
        totalAmount,
        paidAmount: r.paid_amount,
        remainingAmount: r.remaining_amount,
        paymentMethod: r.payment_method,
        cashAmount: r.cash_amount,
        cardAmount: r.card_amount,
        cliqAmount: r.cliq_amount,
        creditAmount: r.credit_amount,
        status: r.status,
        notes: r.notes,
        cashierId: r.cashier_id,
        cashierName: r.cashier_name,
        createdAt: r.created_at,
        isPosted: r.is_posted === 1,
        postedAt: r.posted_at || null,
        totalCost,
        totalProfit: Math.max(0, totalAmount - totalCost),
        items
      };
    });
  }

  public postInvoices(invoiceIds: string[]): { count: number } {
    if (!invoiceIds || invoiceIds.length === 0) return { count: 0 };
    const now = new Date().toISOString();
    return this.db.transaction(() => {
      let count = 0;
      for (const id of invoiceIds) {
        this.db.run('UPDATE invoices SET is_posted = 1, posted_at = ? WHERE id = ?', [now, id]);
        count++;
      }
      // Also post any unposted expenses and delivered/cancelled repairs
      this.db.run('UPDATE expenses SET is_posted = 1, posted_at = ? WHERE is_posted = 0 OR is_posted IS NULL', [now]);
      this.db.run('UPDATE repair_tickets SET is_posted = 1, posted_at = ? WHERE (is_posted = 0 OR is_posted IS NULL) AND status IN ("delivered", "cancelled")', [now]);
      this.logAudit('invoices_posted', 'system', 'المدير', `تم ترحيل وإغلاق ${count} فاتورة نقدية ومبيعات ومصاريف اليوم بنجاح وتصفير مؤشرات اليومية`);
      return { count };
    });
  }

  public settleAndResetDailyDrawer(): { invoiceCount: number; repairCount: number; expenseCount: number } {
    const now = new Date().toISOString();
    return this.db.transaction(() => {
      const invRes = this.db.run('UPDATE invoices SET is_posted = 1, posted_at = ? WHERE is_posted = 0', [now]);
      const repRes = this.db.run('UPDATE repair_tickets SET is_posted = 1, posted_at = ? WHERE is_posted = 0 OR is_posted IS NULL', [now]);
      const expRes = this.db.run('UPDATE expenses SET is_posted = 1, posted_at = ? WHERE is_posted = 0 OR is_posted IS NULL', [now]);
      
      this.db.run('UPDATE shifts SET closed_at = ?, status = "closed", note = COALESCE(note, "") || " [تم ترحيل وتصفير الصندوق]" WHERE status = "open"', [now]);

      this.logAudit('invoices_posted', 'system', 'المدير', `ترحيل شامل وإغلاق اليومية وتصفير الصندوق بالكامل (${invRes.changes || 0} فواتير، ${repRes.changes || 0} صيانة، ${expRes.changes || 0} مصاريف)`);

      return {
        invoiceCount: invRes.changes || 0,
        repairCount: repRes.changes || 0,
        expenseCount: expRes.changes || 0
      };
    });
  }

  public getInvoiceDetails(invoiceId: string): Invoice | null {
    const r = this.db.queryOne('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (!r) return null;

    const items = this.db.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]).map(it => ({
      id: it.id,
      invoiceId: it.invoice_id,
      itemType: it.item_type,
      itemId: it.item_id,
      name: it.name,
      barcodeOrImei: it.barcode_or_imei,
      unitPrice: it.unit_price,
      costPrice: it.cost_price,
      quantity: it.quantity,
      itemDiscount: it.item_discount || 0,
      warrantyPeriod: it.warranty_period || null,
      total: it.total
    }));

    const tradeInRow = this.db.queryOne('SELECT * FROM trade_in_devices WHERE invoice_id = ?', [invoiceId]);
    const tradeIn = tradeInRow ? {
      id: tradeInRow.id,
      invoiceId: tradeInRow.invoice_id,
      brand: tradeInRow.brand,
      model: tradeInRow.model,
      storage: tradeInRow.storage,
      color: tradeInRow.color,
      batteryHealth: tradeInRow.battery_health,
      imei: tradeInRow.imei,
      conditionNotes: tradeInRow.condition_notes,
      purchasePrice: tradeInRow.purchase_price,
      createdAt: tradeInRow.created_at
    } : null;

    return {
      id: r.id,
      invoiceNumber: r.invoice_number,
      shiftId: r.shift_id,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      subtotal: r.subtotal,
      discount: r.discount,
      discountType: r.discount_type || 'fixed',
      taxRate: r.tax_rate || 0,
      taxAmount: r.tax_amount || 0,
      tradeInDiscount: r.trade_in_discount,
      totalAmount: r.total_amount,
      paidAmount: r.paid_amount,
      remainingAmount: r.remaining_amount,
      paymentMethod: r.payment_method,
      cashAmount: r.cash_amount,
      cardAmount: r.card_amount,
      cliqAmount: r.cliq_amount,
      creditAmount: r.credit_amount,
      status: r.status,
      notes: r.notes,
      cashierId: r.cashier_id,
      cashierName: r.cashier_name,
      createdAt: r.created_at,
      items,
      tradeIn
    };
  }

  // ==================== REPAIR CENTER ====================
  public getAllRepairTickets(status?: string): RepairTicket[] {
    let sql = 'SELECT * FROM repair_tickets';
    const params: any[] = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = this.db.query(sql, params);

    return rows.map(r => {
      let checklist = {
        crackedScreen: false, frameScratches: false, backCracked: false,
        cameraDamaged: false, simTrayMissing: false, deadDevice: false, waterDamage: false
      };
      try {
        if (r.condition_checklist) checklist = { ...checklist, ...JSON.parse(r.condition_checklist) };
      } catch (e) {}

      return {
        id: r.id,
        ticketNumber: r.ticket_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        deviceModel: r.device_model,
        deviceImei: r.device_imei,
        lockPasscode: r.lock_passcode,
        lockPattern: r.lock_pattern,
        reportedIssue: r.reported_issue,
        conditionChecklist: checklist,
        estimatedCost: r.estimated_cost,
        advancePayment: r.advance_payment,
        finalCost: r.final_cost,
        status: r.status,
        technicianNotes: r.technician_notes,
        createdAt: r.created_at,
        isPosted: r.is_posted === 1,
        postedAt: r.posted_at || null,
        expectedDeliveryDate: r.expected_delivery_date,
        deliveredAt: r.delivered_at
      };
    });
  }

  public getRepairTicketDetails(ticketId: string): RepairTicket | null {
    const r = this.db.queryOne('SELECT * FROM repair_tickets WHERE id = ?', [ticketId]);
    if (!r) return null;

    let checklist = {
      crackedScreen: false, frameScratches: false, backCracked: false,
      cameraDamaged: false, simTrayMissing: false, deadDevice: false, waterDamage: false
    };
    try {
      if (r.condition_checklist) checklist = { ...checklist, ...JSON.parse(r.condition_checklist) };
    } catch (e) {}

    const parts = this.db.query('SELECT * FROM repair_parts WHERE ticket_id = ?', [ticketId]).map(p => ({
      id: p.id,
      ticketId: p.ticket_id,
      accessoryId: p.accessory_id,
      partName: p.part_name,
      quantity: p.quantity,
      unitCost: p.unit_cost,
      unitPrice: p.unit_price,
      totalCost: p.total_cost,
      totalPrice: p.total_price,
      addedAt: p.added_at
    }));

    return {
      id: r.id,
      ticketNumber: r.ticket_number,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      deviceModel: r.device_model,
      deviceImei: r.device_imei,
      lockPasscode: r.lock_passcode,
      lockPattern: r.lock_pattern,
      reportedIssue: r.reported_issue,
      conditionChecklist: checklist,
      estimatedCost: r.estimated_cost,
      advancePayment: r.advance_payment,
      finalCost: r.final_cost,
      status: r.status,
      technicianNotes: r.technician_notes,
      createdAt: r.created_at,
      isPosted: r.is_posted === 1,
      postedAt: r.posted_at || null,
      expectedDeliveryDate: r.expected_delivery_date,
      deliveredAt: r.delivered_at,
      parts
    };
  }

  public createRepairTicket(data: Omit<RepairTicket, 'id' | 'ticketNumber' | 'createdAt'>): RepairTicket {
    const id = `rep-${Date.now()}`;
    const now = new Date().toISOString();
    const countRes = this.db.queryOne('SELECT COUNT(*) as count FROM repair_tickets');
    const ticketNumber = `TIG-REP-${String((countRes?.count || 0) + 1001)}`;

    this.db.run(`
      INSERT INTO repair_tickets (
        id, ticket_number, customer_name, customer_phone, device_model, device_imei,
        lock_passcode, lock_pattern, reported_issue, condition_checklist, estimated_cost,
        advance_payment, final_cost, status, technician_notes, created_at, expected_delivery_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, ticketNumber, data.customerName, data.customerPhone, data.deviceModel, data.deviceImei,
      data.lockPasscode || null, data.lockPattern || null, data.reportedIssue,
      JSON.stringify(data.conditionChecklist), data.estimatedCost, data.advancePayment,
      data.finalCost || data.estimatedCost, data.status || 'received',
      data.technicianNotes || null, now, data.expectedDeliveryDate || null
    ]);

    // If advance payment > 0 and shift open, add to cash
    if (data.advancePayment > 0) {
      const activeShift = this.getActiveShift();
      if (activeShift) {
        this.db.run('UPDATE shifts SET expected_cash = expected_cash + ? WHERE id = ?', [data.advancePayment, activeShift.id]);
      }
    }

    return {
      id,
      ticketNumber,
      createdAt: now,
      ...data
    };
  }

  public updateRepairStatus(ticketId: string, newStatus: string, notes?: string, finalCost?: number): void {
    const fields = ['status = ?'];
    const values: any[] = [newStatus];

    if (notes !== undefined) {
      fields.push('technician_notes = ?');
      values.push(notes);
    }
    if (finalCost !== undefined) {
      fields.push('final_cost = ?');
      values.push(finalCost);
    }
    if (newStatus === 'delivered') {
      fields.push('delivered_at = ?');
      values.push(new Date().toISOString());
    }

    values.push(ticketId);
    this.db.run(`UPDATE repair_tickets SET ${fields.join(', ')} WHERE id = ?`, values);
    this.logAudit('repair_updated', 'tech', 'فني الصيانة', `تحديث حالة تذكرة الصيانة ${ticketId} إلى (${newStatus})`);
  }

  public attachPartToRepair(ticketId: string, accessoryId: string, quantity = 1): void {
    this.db.transaction(() => {
      const acc = this.db.queryOne('SELECT * FROM accessories WHERE id = ?', [accessoryId]);
      if (!acc) throw new Error('قطعة الغيار غير موجودة');
      if (acc.current_stock < quantity) throw new Error(`المخزون المتوفر (${acc.current_stock}) غير كافٍ`);

      const partId = `rpart-${Date.now()}`;
      const now = new Date().toISOString();
      const unitCost = acc.cost_price;
      const unitPrice = acc.retail_price;
      const totalCost = unitCost * quantity;
      const totalPrice = unitPrice * quantity;

      this.db.run(`
        INSERT INTO repair_parts (id, ticket_id, accessory_id, part_name, quantity, unit_cost, unit_price, total_cost, total_price, added_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [partId, ticketId, accessoryId, acc.name, quantity, unitCost, unitPrice, totalCost, totalPrice, now]);

      // Deduct from stock
      this.db.run('UPDATE accessories SET current_stock = current_stock - ? WHERE id = ?', [quantity, accessoryId]);
    });
  }

  public deleteRepairTicket(ticketId: string): void {
    this.db.transaction(() => {
      // 1. Return any attached parts back to stock
      const parts = this.db.query('SELECT * FROM repair_parts WHERE ticket_id = ?', [ticketId]);
      for (const p of parts) {
        if (p.accessory_id && p.quantity) {
          this.db.run('UPDATE accessories SET current_stock = current_stock + ? WHERE id = ?', [p.quantity, p.accessory_id]);
        }
      }
      this.db.run('DELETE FROM repair_parts WHERE ticket_id = ?', [ticketId]);
      this.db.run('DELETE FROM repair_tickets WHERE id = ?', [ticketId]);
      this.logAudit('repair_deleted', 'system', 'المسؤول', `حذف تذكرة الصيانة ${ticketId}`);
    });
  }

  // ==================== INSTALLMENTS & GUARANTOR ====================
  public getAllInstallmentPlans(): InstallmentPlan[] {
    const plans = this.db.query('SELECT * FROM installment_plans ORDER BY created_at DESC');
    return plans.map(p => {
      const payments = this.db.query('SELECT * FROM installment_payments WHERE plan_id = ? ORDER BY payment_number ASC', [p.id]).map(pm => ({
        id: pm.id,
        planId: pm.plan_id,
        paymentNumber: pm.payment_number,
        dueDate: pm.due_date,
        paidDate: pm.paid_date,
        amount: pm.amount,
        status: pm.status,
        voucherNumber: pm.voucher_number,
        receivedBy: pm.received_by,
        notes: pm.notes
      }));

      return {
        id: p.id,
        customerId: p.customer_id,
        customerName: p.customer_name,
        customerPhone: p.customer_phone,
        invoiceId: p.invoice_id,
        totalAmount: p.total_amount,
        downPayment: p.down_payment,
        remainingAmount: p.remaining_amount,
        monthsCount: p.months_count,
        monthlyAmount: p.monthly_amount,
        startDate: p.start_date,
        status: p.status,
        guarantorName: p.guarantor_name || null,
        guarantorIdNumber: p.guarantor_id_number || null,
        guarantorPhone: p.guarantor_phone || null,
        guarantorAddress: p.guarantor_address || null,
        notes: p.notes,
        createdAt: p.created_at,
        payments
      };
    });
  }

  public payInstallment(paymentId: string, voucherNumber: string, receivedBy = 'الكاشير'): void {
    this.db.transaction(() => {
      const pmt = this.db.queryOne('SELECT * FROM installment_payments WHERE id = ?', [paymentId]);
      if (!pmt) throw new Error('الدفعة غير موجودة');
      if (pmt.status === 'paid') throw new Error('تم سداد هذا القسط مسبقاً');

      const now = new Date().toISOString();
      this.db.run(`
        UPDATE installment_payments 
        SET status = "paid", paid_date = ?, voucher_number = ?, received_by = ?
        WHERE id = ?
      `, [now, voucherNumber, receivedBy, paymentId]);

      // Reduce customer balance
      const plan = this.db.queryOne('SELECT * FROM installment_plans WHERE id = ?', [pmt.plan_id]);
      if (plan) {
        this.db.run('UPDATE customers SET balance = MAX(0, balance - ?) WHERE id = ?', [pmt.amount, plan.customer_id]);
        
        // Check if all payments are paid
        const unpaid = this.db.queryOne('SELECT COUNT(*) as count FROM installment_payments WHERE plan_id = ? AND status != "paid"', [pmt.plan_id]);
        if (unpaid && unpaid.count === 0) {
          this.db.run('UPDATE installment_plans SET status = "completed" WHERE id = ?', [pmt.plan_id]);
        }
      }

      // Add to cash register if shift open
      const activeShift = this.getActiveShift();
      if (activeShift) {
        this.db.run('UPDATE shifts SET expected_cash = expected_cash + ? WHERE id = ?', [pmt.amount, activeShift.id]);
      }

      this.logAudit('debt_payment', 'usr', receivedBy, `سداد قسط رقم ${pmt.payment_number} للعميل ${plan?.customer_name || ''} بمبلغ ${pmt.amount.toFixed(3)} د.أ بموجب سند قبض #${voucherNumber}`);
    });
  }

  // ==================== CUSTOMERS & ACCOUNT STATEMENT ====================
  public getAllCustomers(): Customer[] {
    const rows = this.db.query('SELECT * FROM customers ORDER BY name ASC');
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      idNumber: r.id_number,
      balance: r.balance,
      notes: r.notes,
      createdAt: r.created_at
    }));
  }

  public addCustomer(cust: Omit<Customer, 'id' | 'createdAt'>): Customer {
    const id = `cust-${Date.now()}`;
    const now = new Date().toISOString();
    this.db.run(`
      INSERT INTO customers (id, name, phone, id_number, balance, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, cust.name, cust.phone, cust.idNumber || null, cust.balance || 0, cust.notes || null, now]);
    return { id, createdAt: now, ...cust };
  }

  public getCustomerStatement(customerId: string): CustomerStatement {
    const customer = this.db.queryOne('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customer) throw new Error('العميل غير موجود');

    const invoices = this.db.query('SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC', [customerId]).map(r => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      shiftId: r.shift_id,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      subtotal: r.subtotal,
      discount: r.discount,
      tradeInDiscount: r.trade_in_discount,
      totalAmount: r.total_amount,
      paidAmount: r.paid_amount,
      remainingAmount: r.remaining_amount,
      paymentMethod: r.payment_method,
      cashAmount: r.cash_amount,
      cardAmount: r.card_amount,
      cliqAmount: r.cliq_amount,
      creditAmount: r.credit_amount,
      status: r.status,
      notes: r.notes,
      cashierId: r.cashier_id,
      cashierName: r.cashier_name,
      createdAt: r.created_at
    }));

    const repairTickets = this.db.query('SELECT * FROM repair_tickets WHERE customer_phone = ? ORDER BY created_at DESC', [customer.phone]).map(r => ({
      id: r.id,
      ticketNumber: r.ticket_number,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      deviceModel: r.device_model,
      deviceImei: r.device_imei,
      lockPasscode: r.lock_passcode,
      lockPattern: r.lock_pattern,
      reportedIssue: r.reported_issue,
      conditionChecklist: JSON.parse(r.condition_checklist || '{}'),
      estimatedCost: r.estimated_cost,
      advancePayment: r.advance_payment,
      finalCost: r.final_cost,
      status: r.status,
      technicianNotes: r.technician_notes,
      createdAt: r.created_at,
      expectedDeliveryDate: r.expected_delivery_date,
      deliveredAt: r.delivered_at
    }));

    const installmentPlans = this.getAllInstallmentPlans().filter(p => p.customerId === customerId);

    const debtPayments = this.db.query('SELECT * FROM customer_debt_payments WHERE customer_id = ? ORDER BY created_at DESC', [customerId]).map(r => ({
      id: r.id,
      customerId: r.customer_id,
      amount: r.amount,
      paymentMethod: r.payment_method,
      voucherNumber: r.voucher_number,
      receivedBy: r.received_by,
      notes: r.notes,
      createdAt: r.created_at
    }));

    const totalPurchases = invoices.reduce((sum, inv) => sum + (inv.status === 'completed' ? inv.totalAmount : 0), 0);
    const totalPaidInvoices = invoices.reduce((sum, inv) => sum + (inv.status === 'completed' ? inv.paidAmount : 0), 0);
    const totalPaidDebts = debtPayments.reduce((sum, dp) => sum + dp.amount, 0);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        idNumber: customer.id_number,
        balance: customer.balance,
        notes: customer.notes,
        createdAt: customer.created_at
      },
      totalPurchases,
      totalPaid: totalPaidInvoices + totalPaidDebts,
      currentBalance: customer.balance,
      invoices,
      repairTickets,
      installmentPlans,
      debtPayments
    };
  }

  public payCustomerDebt(params: {
    customerId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    voucherNumber: string;
    notes?: string | null;
    receivedBy: string;
  }): CustomerDebtPayment {
    let result!: CustomerDebtPayment;
    this.db.transaction(() => {
      const cust = this.db.queryOne('SELECT * FROM customers WHERE id = ?', [params.customerId]);
      if (!cust) throw new Error('العميل غير موجود');

      const id = `cdp-${Date.now()}`;
      const now = new Date().toISOString();

      this.db.run(`
        INSERT INTO customer_debt_payments (id, customer_id, amount, payment_method, voucher_number, received_by, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, params.customerId, params.amount, params.paymentMethod, params.voucherNumber, params.receivedBy, params.notes || null, now]);

      // Deduct from customer balance
      this.db.run('UPDATE customers SET balance = MAX(0, balance - ?) WHERE id = ?', [params.amount, params.customerId]);

      // Add to shift expected cash if paid cash
      if (params.paymentMethod === 'cash') {
        const activeShift = this.getActiveShift();
        if (activeShift) {
          this.db.run('UPDATE shifts SET expected_cash = expected_cash + ? WHERE id = ?', [params.amount, activeShift.id]);
        }
      }

      this.logAudit('debt_payment', 'usr', params.receivedBy, `سداد دفعة من رصيد العميل ${cust.name} بقيمة ${params.amount.toFixed(3)} د.أ بسند قبض #${params.voucherNumber}`);

      result = {
        id,
        customerId: params.customerId,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        voucherNumber: params.voucherNumber,
        receivedBy: params.receivedBy,
        notes: params.notes || null,
        createdAt: now
      };
    });
    return result;
  }

  // ==================== EXPENSES ====================
  public getAllExpenses(limit = 100): Expense[] {
    const rows = this.db.query('SELECT * FROM expenses ORDER BY created_at DESC LIMIT ?', [limit]);
    return rows.map(r => ({
      id: r.id,
      category: r.category,
      amount: r.amount,
      title: r.title,
      notes: r.notes,
      paidBy: r.paid_by,
      shiftId: r.shift_id,
      expenseDate: r.expense_date,
      createdAt: r.created_at
    }));
  }

  public addExpense(exp: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const id = `exp-${Date.now()}`;
    const now = new Date().toISOString();

    this.db.transaction(() => {
      this.db.run(`
        INSERT INTO expenses (id, category, amount, title, notes, paid_by, shift_id, expense_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, exp.category, exp.amount, exp.title, exp.notes || null, exp.paidBy, exp.shiftId || null, exp.expenseDate, now]);

      // Deduct from shift expected cash if paid from cash register
      if (exp.shiftId) {
        this.db.run('UPDATE shifts SET expected_cash = expected_cash - ? WHERE id = ?', [exp.amount, exp.shiftId]);
      }
    });

    return { id, createdAt: now, ...exp };
  }

  // ==================== SUPPLIERS ====================
  public getAllSuppliers(): Supplier[] {
    const rows = this.db.query('SELECT * FROM suppliers ORDER BY name ASC');
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      companyName: r.company_name,
      balance: r.balance,
      notes: r.notes,
      createdAt: r.created_at
    }));
  }

  // ==================== AUDIT LOGS ====================
  public getAuditLogs(limit = 100): AuditLog[] {
    const rows = this.db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
    return rows.map(r => ({
      id: r.id,
      actionType: r.action_type,
      actorId: r.actor_id,
      actorName: r.actor_name,
      details: r.details,
      ipOrHost: r.ip_or_host,
      createdAt: r.created_at
    }));
  }

  public logAudit(actionType: AuditLog['actionType'], actorId: string, actorName: string, details: string): void {
    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    this.db.run(`
      INSERT INTO audit_logs (id, action_type, actor_id, actor_name, details, ip_or_host, created_at)
      VALUES (?, ?, ?, ?, ?, 'localhost', ?)
    `, [id, actionType, actorId, actorName, details, now]);
  }

  // ==================== DASHBOARD STATS ====================
  public getDashboardStats(): DashboardStats {
    const today = new Date().toISOString().split('T')[0];

    // Today sales: only unposted invoices (active shift/day sales)
    const salesRow = this.db.queryOne(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as invoice_count
      FROM invoices 
      WHERE status = 'completed' AND is_posted = 0
    `);

    // Today COGS (Cost of goods sold) for unposted invoices
    const cogsRow = this.db.queryOne(`
      SELECT COALESCE(SUM(cost_price * quantity), 0) as total_cogs
      FROM invoice_items
      WHERE invoice_id IN (SELECT id FROM invoices WHERE status = 'completed' AND is_posted = 0)
    `);

    // Today Expenses: only unposted expenses
    const expRow = this.db.queryOne(`
      SELECT COALESCE(SUM(amount), 0) as total_exp
      FROM expenses
      WHERE (is_posted = 0 OR is_posted IS NULL)
    `);

    // Active repairs count
    const repairsRow = this.db.queryOne(`
      SELECT COUNT(*) as active_repairs
      FROM repair_tickets
      WHERE status NOT IN ('delivered', 'cancelled')
    `);

    // Due installments count
    const dueInstallmentsRow = this.db.queryOne(`
      SELECT COUNT(*) as due_count
      FROM installment_payments
      WHERE status != 'paid' AND due_date <= ?
    `, [today]);

    // Low stock count (accounts for min_stock_alert and critical shortage <= 2 pieces)
    const lowStockRow = this.db.queryOne(`
      SELECT COUNT(*) as low_stock
      FROM accessories
      WHERE current_stock <= min_stock_alert OR current_stock <= 2
    `);

    const totalSales = Number(salesRow?.total_sales || 0);
    const totalCogs = Number(cogsRow?.total_cogs || 0);
    const totalExp = Number(expRow?.total_exp || 0);
    const netProfit = totalSales - totalCogs - totalExp;

    return {
      todaySales: totalSales,
      todayNetProfit: netProfit,
      activeRepairsCount: Number(repairsRow?.active_repairs || 0),
      dueInstallmentsCount: Number(dueInstallmentsRow?.due_count || 0),
      lowStockCount: Number(lowStockRow?.low_stock || 0),
      todayInvoicesCount: Number(salesRow?.invoice_count || 0),
      activeShift: this.getActiveShift()
    };
  }
}
