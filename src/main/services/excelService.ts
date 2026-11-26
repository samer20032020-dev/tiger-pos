import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { app } from 'electron';
import { LocalDatabase } from '../db/database';

export interface ExcelExportOptions {
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number;
  periodLabel?: string;
}

export class ExcelService {
  constructor(private db: LocalDatabase) {}

  public async exportReport(
    options: ExcelExportOptions | number,
    maybeMonth?: number,
    targetFilePath?: string
  ): Promise<{ success: boolean; filePath: string }> {
    let startDate = '';
    let endDate = '';
    let periodLabel = '';
    let filePrefix = '';

    if (typeof options === 'number') {
      const year = options;
      const month = maybeMonth || 1;
      const monthStr = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      startDate = `${year}-${monthStr}-01`;
      endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      periodLabel = `شهر ${monthStr}/${year}`;
      filePrefix = `تقرير_شهر_${monthStr}_${year}`;
    } else {
      const opts = options || {};
      if (opts.startDate && opts.endDate) {
        startDate = opts.startDate <= opts.endDate ? opts.startDate : opts.endDate;
        endDate = opts.startDate <= opts.endDate ? opts.endDate : opts.startDate;
        if (startDate === endDate) {
          periodLabel = `يوم ${startDate}`;
          filePrefix = `تقرير_يوم_${startDate}`;
        } else {
          periodLabel = `الفترة من ${startDate} إلى ${endDate}`;
          filePrefix = `تقرير_فترة_${startDate}_إلى_${endDate}`;
        }
      } else if (opts.year && opts.month) {
        const monthStr = String(opts.month).padStart(2, '0');
        const lastDay = new Date(opts.year, opts.month, 0).getDate();
        startDate = `${opts.year}-${monthStr}-01`;
        endDate = `${opts.year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
        periodLabel = `شهر ${monthStr}/${opts.year}`;
        filePrefix = `تقرير_شهر_${monthStr}_${opts.year}`;
      } else {
        const today = new Date().toISOString().split('T')[0];
        startDate = today;
        endDate = today;
        periodLabel = `يوم ${today}`;
        filePrefix = `تقرير_يوم_${today}`;
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TIGER';
    workbook.created = new Date();

    const tigerOrangeFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE65100' } // Tiger Primary Orange
    };
    const slateHeaderFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // Dark Slate / Navy for Sales items
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
    // 1. SHEET: ملخص الأرباح وتفاصيل المبيعات الشاملة
    // ==========================================
    const summarySheet = workbook.addWorksheet('ملخص الأرباح والمبيعات', {
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
      WHERE status = 'completed' AND date(created_at) >= ? AND date(created_at) <= ?
    `, [startDate, endDate]);

    const cogsStats = this.db.queryOne(`
      SELECT COALESCE(SUM(cost_price * quantity), 0) as total_cogs
      FROM invoice_items
      WHERE invoice_id IN (SELECT id FROM invoices WHERE status = 'completed' AND date(created_at) >= ? AND date(created_at) <= ?)
    `, [startDate, endDate]);

    const repairStats = this.db.queryOne(`
      SELECT 
        COALESCE(SUM(final_cost), 0) as total_repairs,
        COUNT(*) as repair_count
      FROM repair_tickets
      WHERE status != 'cancelled'
        AND (status = 'delivered' OR is_paid = 1)
        AND date(COALESCE(delivered_at, created_at)) >= ?
        AND date(COALESCE(delivered_at, created_at)) <= ?
    `, [startDate, endDate]);

    const repairPartsCost = this.db.queryOne(`
      SELECT COALESCE(SUM(total_cost), 0) as parts_cost
      FROM repair_parts
      WHERE ticket_id IN (
        SELECT id FROM repair_tickets
        WHERE status != 'cancelled'
          AND (status = 'delivered' OR is_paid = 1)
          AND date(COALESCE(delivered_at, created_at)) >= ?
          AND date(COALESCE(delivered_at, created_at)) <= ?
      )
    `, [startDate, endDate]);

    const expenseStats = this.db.queryOne(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE date(expense_date) >= ? AND date(expense_date) <= ?
    `, [startDate, endDate]);

    const damagedLossStats = this.db.queryOne(`
      SELECT COALESCE(SUM(total_loss), 0) as total_write_off
      FROM damaged_items
      WHERE action_taken = 'write_off' AND date(created_at) >= ? AND date(created_at) <= ?
    `, [startDate, endDate]);

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

    // Define column widths for Sheet 1
    summarySheet.columns = [
      { key: 'metric', width: 36 },
      { key: 'value', width: 22 },
      { key: 'notes', width: 44 },
      { key: 'spacer', width: 4 },
      { key: 'item_name', width: 32 },
      { key: 'item_type', width: 14 },
      { key: 'quantity', width: 12 },
      { key: 'unit_price', width: 15 },
      { key: 'total_price', width: 16 },
      { key: 'sale_date', width: 19 },
      { key: 'invoice_number', width: 16 },
      { key: 'seller', width: 22 },
      { key: 'payment_method', width: 14 },
      { key: 'customer', width: 22 },
      { key: 'cost_price', width: 15 },
      { key: 'profit', width: 15 }
    ];

    // Headers Row (Row 1)
    const headerRow = summarySheet.getRow(1);
    headerRow.height = 28;

    // Financial summary headers (Cols A-C)
    headerRow.getCell(1).value = 'البيان المالي';
    headerRow.getCell(2).value = 'القيمة (3 خانات د.أ)';
    headerRow.getCell(3).value = `ملاحظات وتفاصيل (${periodLabel})`;
    [1, 2, 3].forEach(col => {
      const cell = headerRow.getCell(col);
      cell.fill = tigerOrangeFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderStyle;
    });

    // Spacer column (Col D)
    headerRow.getCell(4).value = '';

    // Items details headers (Cols E-P)
    const itemsHeaders = [
      { col: 5, label: 'اسم الصنف والمواصفات' },
      { col: 6, label: 'نوع الصنف' },
      { col: 7, label: 'الكمية المباعة' },
      { col: 8, label: 'سعر القطعة (د.أ)' },
      { col: 9, label: 'السعر الكامل (د.أ)' },
      { col: 10, label: 'تاريخ ووقت البيع' },
      { col: 11, label: 'رقم الفاتورة' },
      { col: 12, label: 'البائع (الموظف / المدير)' },
      { col: 13, label: 'طريقة الدفع' },
      { col: 14, label: 'اسم وهاتف العميل' },
      { col: 15, label: 'تكلفة القطعة (د.أ)' },
      { col: 16, label: 'صافي ربح البند (د.أ)' }
    ];

    itemsHeaders.forEach(h => {
      const cell = headerRow.getCell(h.col);
      cell.value = h.label;
      cell.fill = slateHeaderFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderStyle;
    });

    // Populate Left side: Financial metrics rows 2..10
    const summaryRows = [
      { metric: 'إجمالي المبيعات (Gross Sales)', value: totalSales, notes: `عدد الفواتير المكتملة: ${salesStats?.invoice_count || 0}` },
      { metric: 'تكلفة البضاعة المباعة (COGS)', value: totalCogs, notes: 'تكلفة شراء الأجهزة والإكسسوارات المباعة' },
      { metric: 'إجمالي ربح المبيعات (Gross Profit)', value: grossProfitSales, notes: 'المبيعات ناقص تكلفة البضاعة المباعة' },
      { metric: 'إيرادات قسم الصيانة (Repairs Revenue)', value: totalRepairRevenue, notes: `عدد الأجهزة المسلمة: ${repairStats?.repair_count || 0}` },
      { metric: 'تكلفة قطع الغيار المستخدمة بالصيانة', value: totalRepairPartsCost, notes: 'تكلفة الشاشات والبطاريات وقطع الصيانة' },
      { metric: 'صافي ربح الصيانة (Net Repair Profit)', value: netRepairProfit, notes: 'أجور اليد والأرباح الصافية للصيانة' },
      { metric: 'المصاريف التشغيلية (Operating Expenses)', value: totalExpenses, notes: 'إيجار، رواتب، كهرباء، ونثريات' },
      { metric: 'خسائر التوالف المشطوبة (Damaged Write-offs)', value: totalWriteOff, notes: 'أجهزة وإكسسوارات تالفة مسجلة كخسارة' },
      { metric: 'صافي الربح الإجمالي النهائي (NET PROFIT)', value: totalNetProfit, notes: `الربح الصافي لـ (${periodLabel}) بعد خصم المصاريف والتوالف` }
    ];

    summaryRows.forEach((item, index) => {
      const row = summarySheet.getRow(index + 2);
      row.getCell(1).value = item.metric;
      row.getCell(2).value = item.value;
      row.getCell(2).numFmt = currencyNumFmt;
      row.getCell(3).value = item.notes;

      [1, 2, 3].forEach(c => {
        const cell = row.getCell(c);
        cell.border = borderStyle;
        cell.alignment = { vertical: 'middle' };
      });

      if (item.metric.includes('NET PROFIT')) {
        [1, 2, 3].forEach(c => {
          const cell = row.getCell(c);
          cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: totalNetProfit >= 0 ? 'FF007A33' : 'FFCC0000' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        });
      }
    });

    // Query sold items with cashier and customer info
    const invoiceItems = this.db.query(`
      SELECT 
        it.id as item_row_id,
        it.name as item_name,
        it.item_type,
        it.quantity,
        it.unit_price,
        it.total as total_price,
        it.cost_price,
        (it.total - (it.cost_price * it.quantity)) as profit,
        it.barcode_or_imei,
        it.warranty_period,
        i.invoice_number,
        i.created_at as sale_date,
        i.payment_method,
        i.customer_name,
        i.customer_phone,
        i.cashier_name,
        COALESCE(u.role, 'employee') as cashier_role
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      LEFT JOIN users u ON i.cashier_id = u.id
      WHERE i.status = 'completed' AND date(i.created_at) >= ? AND date(i.created_at) <= ?
      ORDER BY i.created_at DESC, it.name ASC
    `, [startDate, endDate]);

    let sumQty = 0;
    let sumTotalSales = 0;
    let sumProfit = 0;

    if (invoiceItems.length === 0) {
      const row = summarySheet.getRow(2);
      row.getCell(5).value = `لا توجد مبيعات مسجلة خلال هذه الفترة (${periodLabel})`;
      row.getCell(5).font = { name: 'Arial', italic: true, color: { argb: 'FF94A3B8' } };
    } else {
      invoiceItems.forEach((it: any, idx: number) => {
        const rowNum = idx + 2;
        const row = summarySheet.getRow(rowNum);

        const qty = Number(it.quantity) || 1;
        const unitP = Number(it.unit_price) || 0;
        const totalP = Number(it.total_price) || (qty * unitP);
        const costP = Number(it.cost_price) || 0;
        const profit = Number(it.profit) || (totalP - (costP * qty));

        sumQty += qty;
        sumTotalSales += totalP;
        sumProfit += profit;

        const roleTitle = it.cashier_role === 'admin' ? 'مدير' : 'موظف';
        const sellerStr = it.cashier_name ? `${it.cashier_name} (${roleTitle})` : roleTitle;
        const custStr = it.customer_name 
          ? (it.customer_phone && it.customer_phone !== '-' ? `${it.customer_name} (${it.customer_phone})` : it.customer_name)
          : 'زبون عام';
        const payStr = it.payment_method === 'cash' ? 'نقدي' :
                       it.payment_method === 'card' ? 'بطاقة' :
                       it.payment_method === 'cliq' ? 'CliQ' :
                       it.payment_method === 'split' ? 'مقسم' : 'ذمم';
        const typeStr = it.item_type === 'phone' ? 'هاتف ذكي' :
                        it.item_type === 'repair_part' ? 'قطع صيانة' : 'إكسسوار';

        row.getCell(5).value = it.item_name;
        row.getCell(6).value = typeStr;
        row.getCell(7).value = qty;
        row.getCell(8).value = unitP;
        row.getCell(9).value = totalP;
        row.getCell(10).value = (it.sale_date || '').replace('T', ' ').substring(0, 19);
        row.getCell(11).value = it.invoice_number;
        row.getCell(12).value = sellerStr;
        row.getCell(13).value = payStr;
        row.getCell(14).value = custStr;
        row.getCell(15).value = costP;
        row.getCell(16).value = profit;

        // Formats
        [8, 9, 15, 16].forEach(col => {
          row.getCell(col).numFmt = currencyNumFmt;
        });

        [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].forEach(col => {
          const cell = row.getCell(col);
          cell.border = borderStyle;
          cell.alignment = { 
            horizontal: col === 5 || col === 14 ? 'right' : 'center', 
            vertical: 'middle' 
          };
        });
      });

      // Total row for items
      const totalRowNum = Math.max(12, invoiceItems.length + 2);
      const totalRow = summarySheet.getRow(totalRowNum);
      totalRow.getCell(5).value = `المجموع الكلي للمبيعات المبينة (${invoiceItems.length} حركة بيع)`;
      totalRow.getCell(5).font = { name: 'Arial', bold: true, size: 11 };
      totalRow.getCell(7).value = sumQty;
      totalRow.getCell(7).font = { name: 'Arial', bold: true };
      totalRow.getCell(9).value = sumTotalSales;
      totalRow.getCell(9).numFmt = currencyNumFmt;
      totalRow.getCell(9).font = { name: 'Arial', bold: true };
      totalRow.getCell(16).value = sumProfit;
      totalRow.getCell(16).numFmt = currencyNumFmt;
      totalRow.getCell(16).font = { name: 'Arial', bold: true, color: { argb: 'FF007A33' } };

      [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].forEach(col => {
        const cell = totalRow.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cell.border = borderStyle;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    }

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
      { header: 'البائع (الموظف / المدير)', key: 'cashier_name', width: 22 },
      { header: 'الحالة', key: 'status', width: 12 }
    ];

    salesSheet.getRow(1).eachCell(cell => {
      cell.fill = tigerOrangeFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const invoices = this.db.query(`
      SELECT 
        i.*,
        COALESCE(u.role, 'employee') as cashier_role
      FROM invoices i
      LEFT JOIN users u ON i.cashier_id = u.id
      WHERE date(i.created_at) >= ? AND date(i.created_at) <= ?
      ORDER BY i.created_at DESC
    `, [startDate, endDate]);

    invoices.forEach(inv => {
      const roleTitle = inv.cashier_role === 'admin' ? 'مدير' : 'موظف';
      const sellerStr = inv.cashier_name ? `${inv.cashier_name} (${roleTitle})` : roleTitle;
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
        cashier_name: sellerStr,
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
      { header: 'البائع (الموظف / المدير)', key: 'seller', width: 22 },
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

    invoiceItems.forEach((item: any) => {
      const roleTitle = item.cashier_role === 'admin' ? 'مدير' : 'موظف';
      const sellerStr = item.cashier_name ? `${item.cashier_name} (${roleTitle})` : roleTitle;
      const addedRow = itemsSheet.addRow({
        invoice_number: item.invoice_number,
        created_at: (item.sale_date || '').replace('T', ' ').substring(0, 19),
        seller: sellerStr,
        item_type: item.item_type === 'phone' ? 'هاتف ذكي' : item.item_type === 'repair_part' ? 'قطع صيانة' : 'إكسسوار',
        item_name: item.item_name,
        barcode_or_imei: item.barcode_or_imei || '-',
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        item_discount: item.item_discount || 0,
        warranty_period: item.warranty_period || 'ضمان قياسي',
        total_price: item.total_price,
        item_profit: item.profit
      });
      [8, 9, 10, 12, 13].forEach(col => {
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
      WHERE date(COALESCE(t.delivered_at, t.created_at)) >= ? AND date(COALESCE(t.delivered_at, t.created_at)) <= ?
      ORDER BY COALESCE(t.delivered_at, t.created_at) DESC
    `, [startDate, endDate]);

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
      WHERE date(expense_date) >= ? AND date(expense_date) <= ?
      ORDER BY expense_date DESC
    `, [startDate, endDate]);

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
      WHERE date(created_at) >= ? AND date(created_at) <= ?
      ORDER BY created_at DESC
    `, [startDate, endDate]);

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

    // ==========================================
    // 7. SHEET: قطع الصيانة المباشرة (Repair Parts Report)
    // ==========================================
    const repairPartsSheet = workbook.addWorksheet('قطع الصيانة المباشرة', {
      views: [{ rightToLeft: true }]
    });

    repairPartsSheet.columns = [
      { header: 'اسم قطعة الصيانة', key: 'part_name', width: 28 },
      { header: 'المصدر', key: 'source', width: 18 },
      { header: 'رقم التذكرة / الفاتورة', key: 'reference', width: 18 },
      { header: 'العميل / الجهاز', key: 'customer', width: 24 },
      { header: 'الكمية', key: 'quantity', width: 10 },
      { header: 'التكلفة الإجمالية', key: 'total_cost', width: 16 },
      { header: 'قيمة البيع / التركيب', key: 'total_price', width: 18 },
      { header: 'صافي الربح', key: 'profit', width: 16 },
      { header: 'التاريخ والوقت', key: 'added_at', width: 20 }
    ];

    repairPartsSheet.getRow(1).eachCell(cell => {
      cell.fill = tigerOrangeFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const directRepairParts = this.db.query(`
      SELECT 
        rp.part_name, rp.quantity, rp.total_cost, rp.total_price, rp.added_at,
        rt.ticket_number, rt.customer_name, rt.device_model
      FROM repair_parts rp
      LEFT JOIN repair_tickets rt ON rp.ticket_id = rt.id
      WHERE date(rp.added_at) >= ? AND date(rp.added_at) <= ?
      ORDER BY rp.added_at DESC
    `, [startDate, endDate]);

    directRepairParts.forEach(rp => {
      const tCost = Number(rp.total_cost || 0);
      const tPrice = Number(rp.total_price || 0);
      const addedRow = repairPartsSheet.addRow({
        part_name: rp.part_name,
        source: 'صيانة جهاز',
        reference: rp.ticket_number || '-',
        customer: rp.customer_name ? `${rp.customer_name} (${rp.device_model || ''})` : '-',
        quantity: rp.quantity,
        total_cost: tCost,
        total_price: tPrice,
        profit: tPrice - tCost,
        added_at: (rp.added_at || '').replace('T', ' ').substring(0, 19)
      });
      [6, 7, 8].forEach(col => {
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
      savePath = path.join(desktop, `${filePrefix}_TIGER.xlsx`);
    }

    await workbook.xlsx.writeFile(savePath);
    console.log(`[ExcelService] Exported comprehensive report (${periodLabel}) to: ${savePath}`);

    return {
      success: true,
      filePath: savePath
    };
  }

  public async exportMonthlyReport(year: number, month: number, targetFilePath?: string): Promise<{ success: boolean; filePath: string }> {
    return this.exportReport(year, month, targetFilePath);
  }
}
