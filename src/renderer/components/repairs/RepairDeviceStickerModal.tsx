import React, { useEffect, useRef, useState } from 'react';
import { Tag, Printer, X } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { RepairTicket } from '../../../shared/types';

interface RepairDeviceStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: RepairTicket;
}

export const RepairDeviceStickerModal: React.FC<RepairDeviceStickerModalProps> = ({
  isOpen,
  onClose,
  ticket
}) => {
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (isOpen && barcodeRef.current && ticket.ticketNumber) {
      try {
        JsBarcode(barcodeRef.current, ticket.ticketNumber, {
          format: 'CODE128',
          width: 1.2,
          height: 25,
          displayValue: false,
          margin: 0
        });
      } catch (err) {
        console.error('Failed to generate sticker barcode:', err);
      }
    }
  }, [isOpen, ticket]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setPrinting(true);
    const stickerHtml = document.getElementById('repair-mini-sticker-content')?.innerHTML;
    if (stickerHtml && window.tigerAPI) {
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <style>
            @page { margin: 0; size: 40mm 20mm; }
            body {
              font-family: Arial, Tahoma, sans-serif;
              margin: 0;
              padding: 1.5mm;
              direction: rtl;
              text-align: right;
              background: #fff;
              color: #000;
              font-size: 8px;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          ${stickerHtml}
        </body>
        </html>
      `;
      try {
        await window.tigerAPI.printSilentHtml(fullHtml, true);
      } catch (e) {
        console.error('Sticker print error:', e);
      }
    }
    setPrinting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">استيكر الجهاز اللاصق (40mm x 20mm)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 40mm x 20mm Mini Tag Preview */}
        <div className="my-5 flex flex-col items-center">
          <div
            id="repair-mini-sticker-content"
            style={{ width: '160px', height: '80px' }}
            className="border-2 border-dashed border-orange-500 bg-white text-black p-1.5 rounded flex flex-col justify-between shadow-sm select-none font-sans"
          >
            <div className="flex items-center justify-between border-b border-black pb-0.5 text-[9px] font-black">
              <span className="text-orange-600">TIGER REPAIR</span>
              <span className="font-mono">#{ticket.ticketNumber}</span>
            </div>

            <div className="text-[8px] leading-tight space-y-0.5">
              <div className="truncate font-bold">
                العميل: <span className="font-normal">{ticket.customerName}</span>
              </div>
              <div className="truncate font-bold">
                الجهاز: <span className="font-normal">{ticket.deviceModel}</span>
              </div>
              <div className="truncate font-mono font-bold text-[7.5px]">
                القفل: <span>{ticket.lockPasscode || (ticket.lockPattern ? `P:${ticket.lockPattern}` : 'بدون')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5 border-t border-black">
              <canvas ref={barcodeRef} className="max-h-[16px] max-w-[90px]" />
              <span className="text-[7.5px] font-mono text-gray-700">{ticket.createdAt.substring(0, 10)}</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2">مقاس لاصق ظهر الجهاز: 40مم × 20مم</span>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            إلغاء
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30"
          >
            <Printer className="w-4 h-4" />
            {printing ? 'جاري الطباعة...' : 'طباعة استيكر الجهاز'}
          </button>
        </div>
      </div>
    </div>
  );
};
