import { RepairTicket, Invoice } from '../../shared/types';
import { formatJOD } from '../../shared/constants';

/**
 * Normalizes phone numbers, specifically for Jordanian mobile formats (079, 078, 077).
 * Removes all non-numeric characters and formats with international country code.
 */
export function normalizeJordanPhone(phone: string): string {
  if (!phone) return '';

  // Keep only digits
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 00962, replace with 962
  if (cleaned.startsWith('00962')) {
    cleaned = cleaned.substring(2);
  }

  // If starts with 07 (standard Jordan local, 10 digits e.g. 0791234567)
  if (cleaned.startsWith('07') && cleaned.length === 10) {
    cleaned = '962' + cleaned.substring(1);
  }

  // If starts with 7 without 0 (9 digits e.g. 791234567)
  if (cleaned.startsWith('7') && cleaned.length === 9) {
    cleaned = '962' + cleaned;
  }

  return cleaned;
}

/**
 * Builds the pre-formatted WhatsApp message for Repair Tickets.
 */
export function buildRepairWhatsAppMessage(
  ticket: RepairTicket,
  type: 'ready' | 'received' | 'in_progress' = 'ready',
  storeName: string = 'مركز تايجر موبايل'
): string {
  const customerName = ticket.customerName?.trim() || 'الزبون العزيز';
  const deviceModel = ticket.deviceModel || 'الهاتف';
  const remaining = Math.max(0, (ticket.finalCost || ticket.estimatedCost || 0) - (ticket.advancePayment || 0));

  if (type === 'ready') {
    return (
      `أهلاً بك زبوننا العزيز (${customerName})..\n` +
      `جهازك (${deviceModel}) جاهز للاستلام من ${storeName} \n\n` +
      `رقم التذكرة: #${ticket.ticketNumber}\n` +
      ` المبلغ المتبقي: ${formatJOD(remaining)}\n\n` +
      `نشكركم لثقتكم بنا وبمركز TIGER❤️`
    );
  }

  if (type === 'received') {
    return (
      `أهلاً بك زبوننا العزيز (${customerName})..\n` +
      `تم استلام جهازك (${deviceModel}) بنجاح في ${storeName} للفحص والصيانة 🔧\n\n` +
      `📋 رقم التذكرة: #${ticket.ticketNumber}\n` +
      `🔍 العطل المسجل: ${ticket.reportedIssue || 'فحص عام'}\n` +
      `💵 العربون المستلم: ${formatJOD(ticket.advancePayment || 0)}\n` +
      `📊 التكلفة التقديرية: ${formatJOD(ticket.estimatedCost || 0)}\n\n` +
      `سيتم إشعاركم فور الانتهاء من فحص وإصلاح الجهاز. شكراً لاختياركم تايجر موبايل!`
    );
  }

  return (
    `أهلاً بك زبوننا العزيز (${customerName})..\n` +
    `نفيدكم بأن جهازك (${deviceModel}) قيد الفحص والعمل لدى الفنيين في ${storeName} ⚙️\n` +
    `رقم التذكرة: #${ticket.ticketNumber}\n` +
    `سنقوم بإشعاركم فور جاهزيته التامة للاستلام.`
  );
}

/**
 * Builds the pre-formatted WhatsApp message for Invoices / Receipts.
 */
export function buildInvoiceWhatsAppMessage(
  invoice: Invoice,
  storeName: string = 'TIGER'
): string {
  const rawCustomer = invoice.customerName?.trim();
  const customerDisplay = (!rawCustomer || rawCustomer === 'زبون نقدي' || rawCustomer === 'الزبون العزيز')
    ? 'بك'
    : rawCustomer;

  const dateStr = invoice.createdAt ? invoice.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10);

  const itemsText = (invoice.items || [])
    .map(i => `${i.name} × ${i.quantity} = ${formatJOD(i.total || (i.unitPrice * i.quantity))}`)
    .join('\n');

  let msg = `أهلاً ${customerDisplay} 🤍\n` +
    `شكراً لاختيارك TIGER 🐅\n\n` +
    `فاتورة #${invoice.invoiceNumber}\n` +
    `التاريخ: ${dateStr}\n\n` +
    `${itemsText}\n` +
    `الإجمالي: ${formatJOD(invoice.totalAmount)}\n`;

  if (invoice.remainingAmount && invoice.remainingAmount > 0) {
    msg += `المتبقي عليك: ${formatJOD(invoice.remainingAmount)}\n`;
  }

  msg += `\nنورتنا ✨\nTIGER`;

  return msg;
}

/**
 * Opens WhatsApp chat via external URL protocol.
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeJordanPhone(phone);
  if (!normalized || normalized.length < 9) {
    return { success: false, error: 'رقم هاتف العميل غير صالح أو مفقود' };
  }

  const encodedMsg = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${normalized}?text=${encodedMsg}`;

  try {
    if (window.tigerAPI && window.tigerAPI.openExternal) {
      await window.tigerAPI.openExternal(whatsappUrl);
      return { success: true };
    } else {
      window.open(whatsappUrl, '_blank');
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر فتح تطبيق الواتساب' };
  }
}

