import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { app } from 'electron';
import { LocalDatabase } from '../db/database';

export class ExcelService {
  constructor(private db: LocalDatabase) {}

  public async exportMonthlyReport(year: number, month: number, targetFilePath?: string): Promise<{ success: boolean; filePath: string }> {
    const monthStr = String(month).padStart(2, '0');
    const monthPrefix = `${year}-${monthStr}`;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TIGER';
    workbook.created = new Date();

    const tigerOrangeFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE65100' } // Tiger Primary Orange
    };
    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };

    const currencyNumFmt = '#,##0.000 "د.أ"';

    // ==========================================
    // 1. SHEET: ملخص الشهر (Monthly Summary)
    // ==========================================
    const summarySheet = workbook.addWorksheet('ملخص الشهر', {
      views: [{ rightToLeft: true }]
    });

    const salesStats = this.db.queryOne(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(discount), 0) as total_discount,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(trade_in_discount), 0) as total_trade_in,
        COUNT(*) as invoice_count
      FROM invoices 
      WHERE status = 'completed' AND strftime('%Y-%m', created_at) = ?
    `, [monthPrefix]);

    const cogsStats = this.db.queryOne(`
      SELECT COALESCE(SUM(cost_price * quantity), 0) as total_cogs
      FROM invoice_items
      WHERE invoice_id IN (SELECT id FROM invoices WHERE status = 'completed' AND strftime('%Y-%m', created_at) = ?)
    `, [monthPrefix]);

    const repairStats = this.db.queryOne(`
      SELECT 
        COALESCE(SUM(final_cost), 0) as total_repairs,
        COUNT(*) as repair_count
      FROM repair_tickets
      WHERE status = 'delivered' AND strftime('%Y-%m', created_at) = ?
    `, [monthPrefix]);

    const repairPartsCost = this.db.queryOne(`
      SELECT COALESCE(SUM(total_cost), 0) as parts_cost
      FROM repair_parts
      WHERE ticket_id IN (SELECT id FROM repair_tickets WHERE status = 'delivered' AND strftime('%Y-%m', created_at) = ?)
    `, [monthPrefix]);

    const expenseStats = this.db.queryOne(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE strftime('%Y-%m', expense_date) = ?
    `, [monthPrefix]);

    const damagedLossStats = this.db.queryOne(`
      SELECT COALESCE(SUM(total_loss), 0) as total_write_off
      FROM damaged_items
      WHERE action_taken = 'write_off' AND strftime('%Y-%m', created_at) = ?
    `, [monthPrefix]);

    const totalSales = Number(salesStats?.total_sales || 0);
    const totalCogs = Number(cogsStats?.total_cogs || 0);
    const grossProfitSales = totalSales - totalCogs;
    const totalRepairRevenue = Number(repairStats?.total_repairs || 0);
    const totalRepairPartsCost = Number(repairPartsCost?.parts_cost || 0);
    const netRepairProfit = totalRepairRevenue - totalRepairPartsCost;
    const totalExpenses = Number(expenseStats?.total_expenses || 0);
    const totalWriteOff = Number(damagedLossStats?.total_write_off || 0);
    const grandExpenses = totalExpenses + totalWriteOff;
    const totalNetProfit = grossProfitSales + netRepairProfit - grandExpenses;

    summarySheet.columns = [
      { header: 'البيان المالي', key: 'metric', width: 38 },
      { header: 'القيمة (3 خانات د.أ)', key: 'value', width: 25 },
      { header: 'ملاحظات وتفاصيل', key: 'notes', width: 45 }
    ];

    const summaryRows = [
      { metric: 'إجمالي المبيعات (Gross Sales)', value: totalSales, notes: `عدد الفواتير المكتملة: ${salesStats?.invoice_count || 0}` },
      { metric: 'تكلفة البضاعة المباعة (COGS)', value: totalCogs, notes: 'تكلفة شراء الأجهزة والإكسسوارات المباعة' },
      { metric: 'إجمالي ربح المبيعات (Gross Profit)', value: grossProfitSales, notes: 'المبيعات ناقص تكلفة البضاعة المباعة' },
      { metric: 'إيرادات قسم الصيانة (Repairs Revenue)', value: totalRepairRevenue, notes: `عدد الأجهزة المسلمة: ${repairStats?.repair_count || 0}` },
      { metric: 'تكلفة قطع الغيار المستخدمة بالصيانة', value: totalRepairPartsCost, notes: 'تكلفة الشاشات والبطاريات وقطع الصيانة' },
      { metric: 'صافي ربح الصيانة (Net Repair Profit)', value: netRepairProfit, notes: 'أجور اليد والأرباح الصافية للصيانة' },
      { metric: 'المصاريف التشغيلية (Operating Expenses)', value: totalExpenses, notes: 'إيجار، رواتب، كهرباء، ونثريات' },
      { metric: 'خسائر التوالف المشطوبة (Damaged Write-offs)', value: totalWriteOff, notes: 'أجهزة وإكسسوارات تالفة مسجلة كخسارة' },
      { metric: 'صافي الربح الإجمالي النهائي (NET PROFIT)', value: totalNetProfit, notes: `الربح الصافي لشهر ${monthStr}/${year} بعد خصم المصاريف والتوالف` }
    ];

    summarySheet.getRow(1).eachCell(cell => {
      cell.fill = tigerOrangeFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    summaryRows.forEach(row => {
      const addedRow = summarySheet.addRow(row);
      addedRow.getCell(2).numFmt = currencyNumFmt;
      addedRow.eachCell(cell => {
        cell.border = borderStyle;
        cell.alignment = { vertical: 'middle' };
      });
      if (row.metric.includes('NET PROFIT')) {
        addedRow.eachCell(cell => {
          cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: totalNetProfit >= 0 ? 'FF007A33' : 'FFCC0000' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        });
      }
    });

    // ==========================================
    // 2. SHEET: فواتير المبيعات (Invoices Summary)
    // ==========================================
    const salesSheet = workbook.addWorksheet('فواتير المبيعات', {
      views: [{ rightToLeft: true }]
    });

    salesSheet.columns = [
      { header: 'رقم الفاتورة', key: 'invoice_number', width: 18 },
      { header: 'التاريخ والوقت', key: 'created_at', width: 20 },
      { header: 'اسم العميل', key: 'customer_name', width: 22 },
      { header: 'هاتف العميل', key: 'customer_phone', width: 16 },
      { header: 'طريقة الدفع', key: 'payment_method', width: 14 },
      { header: 'المجموع الفرعي', key: 'subtotal', width: 16 },
      { header: 'الخصم', key: 'discount', width: 14 },
      { header: 'الضريبة', key: 'tax_amount', width: 14 },
      { header: 'خصم التبديل', key: 'trade_in_discount', width: 15 },
      { header: 'صافي الفاتورة', key: 'total_amount', width: 16 },
      { header: 'المدفوع نقداً', key: 'cash_amount', width: 15 },
      { header: 'المدفوع فيزا/CliQ', key: 'card_cliq', width: 16 },
      { header: 'متبقي ذمم', key: 'remaining_amount', width: 15 },
      { header: 'الكاشير', key: 'cashier_name', width: 16 },
      { header: 'الحالة', key: 'status', width: 12 }
    ];

    salesSheet.getRow(1).eachCell(cell => {
      cell.fill = tigerOrangeFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const invoices = this.db.query(`
      SELECT * FROM invoices 
      WHERE strftime('%Y-%m', created_at) = ?
      ORDER BY created_at DESC
    `, [monthPrefix]);

    invoices.forEach(inv => {
      const addedRow = salesSheet.addRow({
        invoice_number: inv.invoice_number,
        created_at: inv.created_at.replace('T', ' ').substring(0, 19),
        customer_name: inv.customer_name,
        customer_phone: inv.customer_phone || '-',
        payment_method: inv.payment_method,
        subtotal: inv.subtotal,
        discount: inv.discount,
        tax_amount: inv.tax_amount || 0,
        trade_in_discount: inv.trade_in_discount,
        total_amount: inv.total_amount,
        cash_amount: inv.cash_amount,
        card_cliq: (inv.card_amount + inv.cliq_amount),
        remaining_amount: inv.remaining_amount,
        cashier_name: inv.cashier_name,
        status: inv.status === 'completed' ? 'مكتملة' : 'مسترجعة'
      });
      [6, 7, 8, 9, 10, 11, 12, 13].forEach(col => {
        addedRow.getCell(col).numFmt = currencyNumFmt;
      });
      addedRow.eachCell(cell => {
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    // ==========================================
    // 3. SHEET: تفاصيل الأصناف والـ IMEI (Items & IMEIs)
    // ==========================================
    const itemsSheet = workbook.addWorksheet('تفاصيل الأصناف والـ IMEI', {
      views: [{ rightToLeft: true }]
    });

    itemsSheet.columns = [
      { header: 'رقم الفاتورة', key: 'invoice_number', width: 18 },
      { header: 'تاريخ البيع', key: 'created_at', width: 18 },
      { header: 'نوع الصنف', key: 'item_type', width: 14 },
      { header: 'اسم الصنف والمواصفات', key: 'item_name', width: 30 },
      { header: 'الباركود / الـ IMEI المباع', key: 'barcode_or_imei', width: 22 },
      { header: 'الكمية', key: 'quantity', width: 10 },
      { header: 'سعر الحبة', key: 'unit_price', width: 14 },
      { header: 'تكلفة الحبة', key: 'cost_price', width: 14 },
      { header: 'خصم البند', key: 'item_discount', width: 12 },
      { header: 'الضمان الممنوح', key: 'warranty_period', width: 25 },
      { header: 'إجمالي البيع', key: 'total_price', width: 15 },
      { header: 'ربح البند', key: 'item_profit', width: 15 }
    ];

    itemsSheet.getRow(1).eachCell(cell => {
      cell.fill = tigerOrangeFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const invoiceItems = this.db.query(`
      SELECT 
        i.invoice_number,
        i.created_at,
        it.item_type,
        it.name as item_name,
        it.barcode_or_imei,
        it.quantity,
        it.unit_price,
        it.cost_price,
        it.item_discount,
        it.warranty_period,
        it.total,
        (it.total - (it.cost_price * it.quantity)) as profit
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE strftime('%Y-%m', i.created_at) = ? AND i.status = 'completed'
      ORDER BY i.created_at DESC
    `, [monthPrefix]);

    invoiceItems.forEach(item => {
      const addedRow = itemsSheet.addRow({
        invoice_number: item.invoice_number,
        created_at: item.created_at.substring(0, 10),
        item_type: item.item_type === 'phone' ? 'هاتف ذكي' : 'إكسسوار / قطعة',
        item_name: item.item_name,
        barcode_or_imei: item.barcode_or_imei || '-',
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        item_discount: item.item_discount || 0,
        warranty_period: item.warranty_period || 'ضمان قياسي',
        total_price: item.total,
        item_profit: item.profit
      });
      [7, 8, 9, 11, 12].forEach(col => {
        addedRow.getCell(col).numFmt = currencyNumFmt;
      });
      addedRow.eachCell(cell => {
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    // ==========================================
    // 4. SHEET: حركة الصيانة (Repair Tickets)
    // ==========================================
    const repairsSheet = workbook.addWorksheet('حركة الصيانة', {
      views: [{ rightToLeft: true }]
    });

    repairsSheet.columns = [
      { header: 'رقم التذكرة', key: 'ticket_number', width: 16 },
      { header: 'تاريخ الاستلام', key: 'created_at', width: 18 },
      { header: 'اسم العميل', key: 'customer_name', width: 20 },
      { header: 'رقم الهاتف', key: 'customer_phone', width: 16 },
      { header: 'نوع وموديل الجهاز', key: 'device_model', width: 22 },
      { header: 'IMEI الجهاز', key: 'device_imei', width: 20 },
      { header: 'العطل المشتكى منه', key: 'reported_issue', width: 28 },
      { header: 'حالة الصيانة', key: 'status', width: 16 },
      { header: 'العربون المستلم', key: 'advance_payment', width: 15 },
      { header: 'التكلفة الإجمالية', key: 'final_cost', width: 15 },
      { header: 'تكلفة قطع الغيار', key: 'parts_cost', width: 15 },
      { header: 'صافي ربح الصيانة', key: 'repair_profit', width: 16 },
      { header: 'ملاحظات الفني', key: 'technician_notes', width: 25 }
    ];

    repairsSheet.getRow(1).eachCell(cell => {
      cell.fill = tigerOrangeFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const tickets = this.db.query(`
      SELECT 
        t.*,
        COALESCE((SELECT SUM(rp.total_cost) FROM repair_parts rp WHERE rp.ticket_id = t.id), 0) as parts_cost
      FROM repair_tickets t
      WHERE strftime('%Y-%m', t.created_at) = ?
      ORDER BY t.created_at DESC
    `, [monthPrefix]);

    tickets.forEach(t => {
      const finalCost = Number(t.final_cost || 0);
      const pCost = Number(t.parts_cost || 0);
      const rProfit = finalCost - pCost;
      const addedRow = repairsSheet.addRow({
        ticket_number: t.ticket_number,
        created_at: t.created_at.substring(0, 10),
        customer_name: t.customer_name,
        customer_phone: t.customer_phone,
        device_model: t.device_model,
        device_imei: t.device_imei,
        reported_issue: t.reported_issue,
        status: t.status,
        advance_payment: t.advance_payment,
        final_cost: finalCost,
        parts_cost: pCost,
        repair_profit: rProfit,
        technician_notes: t.technician_notes || '-'
      });
      [9, 10, 11, 12].forEach(col => {
        addedRow.getCell(col).numFmt = currencyNumFmt;
      });
      addedRow.eachCell(cell => {
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    // ==========================================
    // 5. SHEET: المصاريف والتوالف (Expenses & Damaged)
    // ==========================================
    const expensesSheet = workbook.addWorksheet('المصاريف والتوالف', {
      views: [{ rightToLeft: true }]
    });

    expensesSheet.columns = [
      { header: 'النوع', key: 'entry_type', width: 14 },
      { header: 'التاريخ', key: 'date', width: 16 },
      { header: 'البند / اسم الصنف', key: 'title', width: 28 },
      { header: 'التصنيف / السبب', key: 'category', width: 22 },
      { header: 'المبلغ / قيمة الخسارة (د.أ)', key: 'amount', width: 22 },
      { header: 'المسؤول / المدخل', key: 'actor', width: 18 },
      { header: 'ملاحظات وتفاصيل', key: 'notes', width: 32 }
    ];

    expensesSheet.getRow(1).eachCell(cell => {
      cell.fill = tigerOrangeFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const expenses = this.db.query(`
      SELECT * FROM expenses 
      WHERE strftime('%Y-%m', expense_date) = ?
      ORDER BY expense_date DESC
    `, [monthPrefix]);

    expenses.forEach(e => {
      const addedRow = expensesSheet.addRow({
        entry_type: 'مصروف تشغيلي',
        date: e.expense_date,
        title: e.title,
        category: e.category,
        amount: e.amount,
        actor: e.paid_by,
        notes: e.notes || '-'
      });
      addedRow.getCell(5).numFmt = currencyNumFmt;
      addedRow.eachCell(cell => {
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    const damagedItems = this.db.query(`
      SELECT * FROM damaged_items
      WHERE strftime('%Y-%m', created_at) = ?
      ORDER BY created_at DESC
    `, [monthPrefix]);

    damagedItems.forEach(d => {
      const addedRow = expensesSheet.addRow({
        entry_type: d.action_taken === 'write_off' ? 'تالف مشطوب (خسارة)' : 'مرتجع للمورد',
        date: d.created_at.substring(0, 10),
        title: d.name,
        category: `${d.item_type === 'phone' ? 'هاتف' : 'إكسسوار'} (${d.barcode_or_imei})`,
        amount: d.total_loss,
        actor: d.reported_by,
        notes: `السبب: ${d.reason}`
      });
      addedRow.getCell(5).numFmt = currencyNumFmt;
      addedRow.eachCell(cell => {
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    // ==========================================
    // 6. SHEET: الأقساط والذمم (Installments & Balances)
    // ==========================================
    const installmentsSheet = workbook.addWorksheet('الأقساط والذمم', {
      views: [{ rightToLeft: true }]
    });

    installmentsSheet.columns = [
      { header: 'اسم العميل', key: 'customer_name', width: 22 },
      { header: 'رقم الهاتف', key: 'customer_phone', width: 16 },
      { header: 'رقم الفاتورة', key: 'invoice_id', width: 16 },
      { header: 'إجمالي الخطة', key: 'total_amount', width: 14 },
      { header: 'الدفعة الأولى', key: 'down_payment', width: 14 },
      { header: 'المتبقي', key: 'remaining_amount', width: 14 },
      { header: 'عدد الشهور', key: 'months_count', width: 12 },
      { header: 'القسط الشهري', key: 'monthly_amount', width: 14 },
      { header: 'تاريخ البدء', key: 'start_date', width: 14 },
      { header: 'حالة الخطة', key: 'status', width: 14 },
      { header: 'اسم الكفيل', key: 'guarantor_name', width: 22 },
      { header: 'الرقم الوطني للكفيل', key: 'guarantor_id', width: 18 },
      { header: 'هاتف الكفيل', key: 'guarantor_phone', width: 16 },
      { header: 'عنوان الكفيل', key: 'guarantor_address', width: 25 }
    ];

    installmentsSheet.getRow(1).eachCell(cell => {
      cell.fill = tigerOrangeFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const plans = this.db.query('SELECT * FROM installment_plans ORDER BY created_at DESC');
    plans.forEach(pl => {
      const addedRow = installmentsSheet.addRow({
        customer_name: pl.customer_name,
        customer_phone: pl.customer_phone,
        invoice_id: pl.invoice_id,
        total_amount: pl.total_amount,
        down_payment: pl.down_payment,
        remaining_amount: pl.remaining_amount,
        months_count: pl.months_count,
        monthly_amount: pl.monthly_amount,
        start_date: pl.start_date,
        status: pl.status === 'active' ? 'نشط' : pl.status === 'completed' ? 'مسدد بالكامل' : 'متعثر',
        guarantor_name: pl.guarantor_name || '-',
        guarantor_id: pl.guarantor_id_number || '-',
        guarantor_phone: pl.guarantor_phone || '-',
        guarantor_address: pl.guarantor_address || '-'
      });
      [4, 5, 6, 8].forEach(col => {
        addedRow.getCell(col).numFmt = currencyNumFmt;
      });
      addedRow.eachCell(cell => {
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    // Resolve target path
    let savePath = targetFilePath;
    if (!savePath) {
      const desktop = app ? app.getPath('desktop') : process.cwd();
      savePath = path.join(desktop, `تقرير_شهر_${monthStr}_${year}_TIGER.xlsx`);
    }

    await workbook.xlsx.writeFile(savePath);
    console.log(`[ExcelService] Exported monthly report with 6 sheets to: ${savePath}`);

    return {
      success: true,
      filePath: savePath
    };
  }
}
