import React, { useEffect, useState } from 'react';
import { Tag, Printer, X, Plus, Minus, Smartphone } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { RepairTicket } from '../../../shared/types';
import { useAppStore } from '../../stores/useAppStore';
import { useEscapeClose } from '../../utils/useEscapeStack';

interface RepairDeviceStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: RepairTicket;
}

export type DeviceStickerSize = '40x20' | '50x25';

export const RepairDeviceStickerModal: React.FC<RepairDeviceStickerModalProps> = ({
  isOpen,
  onClose,
  ticket
}) => {
  useEscapeClose(Boolean(isOpen && ticket), onClose);
  const { addToast } = useAppStore();
  const [printing, setPrinting] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [presetSize, setPresetSize] = useState<DeviceStickerSize>('40x20');
  const [storeName, setStoreName] = useState('TIGER REPAIR');
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');

  // Fetch store name
  useEffect(() => {
    if (isOpen && window.tigerAPI) {
      window.tigerAPI.getSettings().then((stgs) => {
        if (stgs && stgs.storeName) {
          setStoreName(`${stgs.storeName} REPAIR`);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  // Generate crisp Barcode PNG Data URL for ticket number
  useEffect(() => {
    if (isOpen && ticket?.ticketNumber) {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, ticket.ticketNumber, {
          format: 'CODE128',
          width: 1.5,
          height: 36,
          displayValue: false,
          margin: 0
        });
        setBarcodeDataUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Failed to generate sticker barcode:', err);
      }
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const [widthMm, heightMm] = presetSize.split('x').map(Number);

  const lockInfo = ticket.lockPasscode
    ? `PIN: ${ticket.lockPasscode}`
    : ticket.lockPattern
    ? `نمط: ${ticket.lockPattern}`
    : 'بدون قفل';

  const dateStr = ticket.createdAt ? ticket.createdAt.substring(0, 10) : '';

  const handlePrint = async () => {
    if (quantity < 1) {
      addToast('يرجى تحديد عدد نسخ صحيح', 'error');
      return;
    }

    setPrinting(true);

    try {
      const escape = (str: string) =>
        (str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const pagesHtml = Array.from({ length: quantity })
        .map(
          () => `
        <div class="sticker-page">
          <div class="header">
            <span class="store-badge">${escape(storeName)}</span>
            <span class="ticket-num">#${escape(ticket.ticketNumber)}</span>
          </div>

          <div class="details">
            <div class="row">
              <span class="lbl">العميل:</span>
              <span class="val font-bold">${escape(ticket.customerName)}</span>
              ${ticket.customerPhone ? `<span class="val-phone">(${escape(ticket.customerPhone)})</span>` : ''}
            </div>
            <div class="row">
              <span class="lbl">الجهاز:</span>
              <span class="val">${escape(ticket.deviceModel)}</span>
            </div>
            <div class="row">
              <span class="lbl">العطل:</span>
              <span class="val truncate">${escape(ticket.reportedIssue || 'فحص وصيانة')}</span>
            </div>
            <div class="row">
              <span class="lbl">القفل:</span>
              <span class="val font-mono font-bold">${escape(lockInfo)}</span>
            </div>
          </div>

          <div class="footer">
            ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" class="barcode-img" alt="barcode" />` : ''}
            <span class="date-badge">${escape(dateStr)}</span>
          </div>
        </div>
      `
        )
        .join('\n');

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>استيكر ظهر جهاز الصيانة</title>
          <style>
            @page {
              size: ${widthMm}mm ${heightMm}mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif;
              direction: rtl;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sticker-page {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              page-break-after: always;
              page-break-inside: avoid;
              padding: 1mm 1.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
              font-size: ${presetSize === '40x20' ? '6.8pt' : '8pt'};
              line-height: 1.15;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #000;
              padding-bottom: 0.3mm;
              font-weight: 900;
            }
            .store-badge {
              font-size: ${presetSize === '40x20' ? '6.5pt' : '7.5pt'};
              text-transform: uppercase;
            }
            .ticket-num {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${presetSize === '40x20' ? '7pt' : '8.5pt'};
              direction: ltr;
            }
            .details {
              display: flex;
              flex-direction: column;
              gap: 0.2mm;
              margin: 0.4mm 0;
            }
            .row {
              display: flex;
              align-items: center;
              gap: 1mm;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .lbl {
              font-weight: 900;
              color: #111;
              flex-shrink: 0;
            }
            .val {
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .val-phone {
              font-family: 'Courier New', Courier, monospace;
              font-size: 6pt;
              direction: ltr;
            }
            .font-bold { font-weight: bold; }
            .font-mono { font-family: 'Courier New', Courier, monospace; }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1px solid #000;
              padding-top: 0.3mm;
            }
            .barcode-img {
              max-width: ${widthMm - 16}mm;
              height: ${presetSize === '40x20' ? '5.5mm' : '8mm'};
              object-fit: contain;
              image-rendering: pixelated;
            }
            .date-badge {
              font-family: 'Courier New', Courier, monospace;
              font-size: 6pt;
              font-weight: bold;
              direction: ltr;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
        </html>
      `;

      if (window.tigerAPI) {
        await window.tigerAPI.printSilentHtml(fullHtml, true, true);
        addToast(`تم إرسال ${quantity} لاصق ظهر الجهاز للطابعة بنجاح!`, 'success');
        onClose();
      }
    } catch (e: any) {
      console.error('Sticker print error:', e);
      addToast(e?.message || 'فشلت عملية الطباعة', 'error');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col max-h-[92vh] overflow-y-auto">
        
        {/* Header - Simple & Clean */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">استيكر ظهر جهاز الصيانة</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Realistic Sticker Preview Stage - Soft & Sleek */}
        <div className="my-4 bg-slate-50/80 dark:bg-slate-950/40 p-4 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800/60">
          <div
            style={{
              width: `${widthMm * 5}px`,
              minHeight: `${heightMm * 5}px`
            }}
            className="bg-white text-black p-2 rounded-lg flex flex-col justify-between shadow-md border border-slate-200/90 select-none font-sans text-xs transition-all duration-200"
          >
            {/* Top row */}
            <div className="w-full flex items-center justify-between border-b border-black pb-0.5 text-[10px] font-black">
              <span className="text-orange-600 font-bold">{storeName}</span>
              <span className="font-mono text-black font-black">#{ticket.ticketNumber}</span>
            </div>

            {/* Details */}
            <div className="my-1 space-y-0.5 text-[8.5px] leading-tight text-right">
              <div className="truncate">
                <span className="font-bold">العميل: </span>
                <span>{ticket.customerName}</span>
                {ticket.customerPhone && (
                  <span className="font-mono text-[7.5px] text-gray-700 mr-1">({ticket.customerPhone})</span>
                )}
              </div>
              <div className="truncate">
                <span className="font-bold">الجهاز: </span>
                <span>{ticket.deviceModel}</span>
              </div>
              <div className="truncate">
                <span className="font-bold">العطل: </span>
                <span className="text-gray-800">{ticket.reportedIssue || 'صيانة عامة'}</span>
              </div>
              <div className="truncate">
                <span className="font-bold">القفل: </span>
                <span className="font-mono font-bold text-orange-600">{lockInfo}</span>
              </div>
            </div>

            {/* Bottom Row: Barcode + Date */}
            <div className="w-full flex items-center justify-between border-t border-black pt-0.5">
              {barcodeDataUrl ? (
                <img
                  src={barcodeDataUrl}
                  alt="barcode"
                  className="max-h-[16px] max-w-[105px] object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="h-4 w-20 bg-slate-100 animate-pulse rounded" />
              )}
              <span className="font-mono text-[7.5px] text-gray-700 font-bold">{dateStr}</span>
            </div>
          </div>
        </div>

        {/* Simple Controls */}
        <div className="space-y-3.5">
          
          {/* Quantity Row */}
          <div>
            <div className="text-xs text-slate-500 mb-1.5 font-medium">عدد النسخ:</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50 active:scale-95 transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="number"
                  min="1"
                  max="20"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-16 text-center font-bold font-mono text-sm bg-transparent border-0 outline-none text-slate-900 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Chips */}
              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() => setQuantity(1)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition ${
                    quantity === 1
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700 hover:border-orange-300'
                  }`}
                >
                  نسخة واحدة
                </button>
                <button
                  type="button"
                  onClick={() => setQuantity(2)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition ${
                    quantity === 2
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700 hover:border-orange-300'
                  }`}
                >
                  نسختان (هاتف + علبة)
                </button>
              </div>
            </div>
          </div>

          {/* Size Pills */}
          <div>
            <div className="text-xs text-slate-500 mb-1.5 font-medium">المقاس:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPresetSize('40x20')}
                className={`py-2 px-3 rounded-xl text-center text-xs font-bold border transition ${
                  presetSize === '40x20'
                    ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 text-orange-600 dark:text-orange-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                40 × 20 مم (ميني)
              </button>
              <button
                type="button"
                onClick={() => setPresetSize('50x25')}
                className={`py-2 px-3 rounded-xl text-center text-xs font-bold border transition ${
                  presetSize === '50x25'
                    ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 text-orange-600 dark:text-orange-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                50 × 25 مم (قياسي)
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            إلغاء
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="flex-1 bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-orange-600/20 transition disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {printing ? 'جاري الطباعة...' : `طباعة (${quantity}) لاصق جهاز`}
          </button>
        </div>

      </div>
    </div>
  );
};
