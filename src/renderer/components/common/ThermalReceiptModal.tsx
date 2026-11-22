import React, { useState, useEffect, useRef } from 'react';
import { Printer, X, MessageSquare } from 'lucide-react';
import { Invoice } from '../../../shared/types';
import { formatJOD } from '../../../shared/constants';
import { WhatsAppIcon } from './WhatsAppIcon';
import { sendWhatsAppMessage, buildInvoiceWhatsAppMessage } from '../../utils/whatsapp';
import { useAppStore } from '../../stores/useAppStore';
import JsBarcode from 'jsbarcode';

interface ThermalReceiptModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  invoice,
  isOpen,
  onClose
}) => {
  const { addToast } = useAppStore();
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');
  const [printing, setPrinting] = useState(false);
  const [phonePromptOpen, setPhonePromptOpen] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [storeInfo, setStoreInfo] = useState<{ name: string; phone: string; address: string }>({
    name: 'TIGER',
    phone: '',
    address: ''
  });
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && window.tigerAPI) {
      window.tigerAPI.getSettings().then((stgs) => {
        if (stgs) {
          setStoreInfo({
            name: stgs.storeName || 'TIGER',
            phone: stgs.storePhone || '',
            address: stgs.storeAddress || ''
          });
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && barcodeCanvasRef.current && invoice.invoiceNumber) {
      try {
        JsBarcode(barcodeCanvasRef.current, invoice.invoiceNumber, {
          format: 'CODE128',
          width: paperSize === '80mm' ? 1.6 : 1.3,
          height: paperSize === '80mm' ? 40 : 32,
          displayValue: true,
          fontSize: 12,
          font: 'monospace',
          margin: 0
        });
      } catch (err) {
        console.error('Failed to render receipt barcode:', err);
      }
    }
  }, [isOpen, invoice, paperSize]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setPrinting(true);
    const receiptHtml = document.getElementById('thermal-receipt-content')?.innerHTML;
    if (receiptHtml && window.tigerAPI) {
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <style>
            @page { margin: 0; size: ${paperSize === '80mm' ? '80mm auto' : '58mm auto'}; }
            body {
              font-family: 'Courier New', monospace, Tahoma, sans-serif;
              font-size: ${paperSize === '80mm' ? '12px' : '10px'};
              margin: 0;
              padding: 8px;
              direction: rtl;
              text-align: right;
              color: #000;
              background: #fff;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 3px 0; }
            .right { text-align: right; }
            .left { text-align: left; }
            canvas, img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${receiptHtml}
        </body>
        </html>
      `;
      try {
        await window.tigerAPI.printSilentHtml(fullHtml, false);
      } catch (e) {
        console.error('Print error:', e);
      }
    }
    setPrinting(false);
  };

  const handleSendWhatsApp = async (phoneToUse?: string) => {
    const targetPhone = phoneToUse || invoice.customerPhone || manualPhone;
    if (!targetPhone) {
      setPhonePromptOpen(true);
      return;
    }
    const msg = buildInvoiceWhatsAppMessage(invoice, storeInfo.name);
    const res = await sendWhatsAppMessage(targetPhone, msg);
    if (res.success) {
      addToast('تم فتح محادثة واتساب وإرسال الفاتورة بنجاح', 'success');
      setPhonePromptOpen(false);
    } else {
      addToast(res.error || 'تعذر إرسال الفاتورة عبر واتساب', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header Controls */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-slate-800 dark:text-white">معاينة وطباعة الفاتورة الحرارية</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* 80mm vs 58mm selector */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setPaperSize('80mm')}
                className={`px-2.5 py-1 rounded-md transition ${paperSize === '80mm' ? 'bg-orange-500 text-white shadow' : 'text-slate-600 dark:text-slate-400'}`}
              >
                80mm
              </button>
              <button
                onClick={() => setPaperSize('58mm')}
                className={`px-2.5 py-1 rounded-md transition ${paperSize === '58mm' ? 'bg-orange-500 text-white shadow' : 'text-slate-600 dark:text-slate-400'}`}
              >
                58mm
              </button>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content Box */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950 flex justify-center">
          <div
            id="thermal-receipt-content"
            style={{ width: paperSize === '80mm' ? '300px' : '230px' }}
            className="bg-white text-black p-4 rounded shadow-sm text-xs border border-dashed border-slate-300 font-mono"
          >
            {/* Store Header */}
            <div className="text-center">
              <div className="text-xl font-black tracking-widest uppercase text-black">
                {storeInfo.name || 'TIGER'}
              </div>
              {(storeInfo.address || storeInfo.phone) && (
                <div className="text-[10px] text-gray-800 mt-0.5 font-sans">
                  {[storeInfo.address, storeInfo.phone ? `هاتف: ${storeInfo.phone}` : ''].filter(Boolean).join(' | ')}
                </div>
              )}
              <div className="border-t border-dashed border-black my-2" />
            </div>

            {/* Invoice Meta */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>رقم الفاتورة:</span>
                <span className="font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ والوقت:</span>
                <span>{invoice.createdAt.replace('T', ' ').substring(0, 16)}</span>
              </div>
              <div className="flex justify-between">
                <span>الكاشير:</span>
                <span>{invoice.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>العميل:</span>
                <span className="font-bold">{invoice.customerName}</span>
              </div>
              {invoice.customerPhone && (
                <div className="flex justify-between">
                  <span>هاتف العميل:</span>
                  <span className="font-mono">{invoice.customerPhone}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Line items with IMEI & Warranty */}
            <table className="w-full text-right text-[11px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1">الصنف والمواصفات</th>
                  <th className="text-center py-1">العدد</th>
                  <th className="text-left py-1">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-dashed border-gray-300">
                    <td className="py-1.5 align-top">
                      <div className="font-bold">{item.name}</div>
                      {item.barcodeOrImei && (
                        <div className="text-[9px] text-gray-700 font-mono">
                          IMEI: {item.barcodeOrImei}
                        </div>
                      )}
                      {item.warrantyPeriod && (
                        <div className="text-[9px] font-semibold text-emerald-800 mt-0.5">
                          ✓ الضمان: {item.warrantyPeriod}
                        </div>
                      )}
                      {(item.itemDiscount || 0) > 0 && (
                        <div className="text-[9px] text-red-700">
                          خصم بند: -{formatJOD(item.itemDiscount || 0)}
                        </div>
                      )}
                    </td>
                    <td className="text-center py-1.5 align-top font-bold">{item.quantity}</td>
                    <td className="text-left py-1.5 align-top font-bold whitespace-nowrap">{formatJOD(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Totals (3 Decimal Places) */}
            <div className="border-t border-dashed border-black my-2" />
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{formatJOD(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>الخصم الممنوح:</span>
                  <span>-{formatJOD(invoice.discount)}</span>
                </div>
              )}
              {invoice.taxAmount !== undefined && invoice.taxAmount > 0 && (
                <div className="flex justify-between text-blue-800 font-bold">
                  <span>ضريبة المبيعات ({invoice.taxRate || 5.5}%):</span>
                  <span>+{formatJOD(invoice.taxAmount)}</span>
                </div>
              )}
              {invoice.tradeInDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>خصم جهاز مستعمل (Trade-In):</span>
                  <span>-{formatJOD(invoice.tradeInDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t border-black pt-1">
                <span>الصافي النهائي:</span>
                <span>{formatJOD(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700 pt-1">
                <span>طريقة الدفع:</span>
                <span className="font-bold uppercase">{invoice.paymentMethod}</span>
              </div>
              {invoice.remainingAmount > 0 && (
                <div className="flex justify-between text-red-700 font-bold">
                  <span>المتبقي ذمم / أقساط:</span>
                  <span>{formatJOD(invoice.remainingAmount)}</span>
                </div>
              )}
            </div>

            {/* Barcode representation of invoice number for 1-scan instant returns */}
            <div className="border-t border-dashed border-black my-2" />
            <div className="flex flex-col items-center justify-center py-1">
              <canvas ref={barcodeCanvasRef} className="max-w-full" />
              <div className="text-[8px] text-center text-gray-600 mt-1 font-sans">
                امسح الباركود أعلاه للإرجاع أو الاستبدال الفوري
              </div>
              <div className="text-[9px] text-center font-bold text-gray-800 mt-2">
                شكراً لثقتكم بمحل TIGER | كفالة الأجهزة تخضع لتعليمات الوكيل الرسمي
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
          >
            إغلاق
          </button>

          {/* WhatsApp Direct Notification */}
          <button
            onClick={() => handleSendWhatsApp()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition active:scale-[0.98]"
            title="إرسال الفاتورة عبر واتساب العميل بنقرة واحدة"
          >
            <WhatsAppIcon className="w-4 h-4 fill-white" />
            <span>إرسال للواتساب</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={printing}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {printing ? 'جاري الطباعة الصامتة...' : 'طباعة حرارية فورية'}
          </button>
        </div>

        {/* Manual Phone Prompt if Invoice had no Phone */}
        {phonePromptOpen && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border-t border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
            <input
              type="text"
              placeholder="أدخل رقم واتساب العميل (مثال: 0791234567)..."
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
            />
            <button
              onClick={() => handleSendWhatsApp(manualPhone)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
            >
              إرسال
            </button>
            <button
              onClick={() => setPhonePromptOpen(false)}
              className="text-slate-400 hover:text-slate-600 px-2 py-1 text-xs"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
