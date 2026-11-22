import React, { useEffect, useRef, useState } from 'react';
import { Tag, Printer, X } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { formatJOD } from '../../../shared/constants';

interface BarcodeStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  code: string; // Barcode or IMEI
  price: number;
  subtitle?: string;
}

export const BarcodeStickerModal: React.FC<BarcodeStickerModalProps> = ({
  isOpen,
  onClose,
  title,
  code,
  price,
  subtitle = 'TIGER'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current && code) {
      try {
        JsBarcode(canvasRef.current, code, {
          format: 'CODE128',
          width: 1.6,
          height: 38,
          displayValue: true,
          fontSize: 11,
          font: 'monospace',
          margin: 0
        });
      } catch (err) {
        console.error('Failed to generate sticker barcode:', err);
      }
    }
  }, [isOpen, code]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setPrinting(true);
    const stickerHtml = document.getElementById('barcode-sticker-content')?.innerHTML;
    if (stickerHtml && window.tigerAPI) {
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <style>
            @page { margin: 0; size: 50mm 25mm; }
            body {
              font-family: Arial, Tahoma, sans-serif;
              margin: 0;
              padding: 2mm;
              direction: rtl;
              text-align: center;
              background: #fff;
              color: #000;
            }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">طباعة استيكر باركود (50mm x 25mm)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 50x25mm Label Preview */}
        <div className="my-6 flex justify-center">
          <div
            id="barcode-sticker-content"
            style={{ width: '190px', height: '95px' }}
            className="border-2 border-dashed border-slate-400 bg-white text-black p-2 rounded flex flex-col items-center justify-between shadow-sm overflow-hidden select-none"
          >
            <div className="w-full flex items-center justify-between text-[10px] font-bold border-b border-black pb-0.5">
              <span className="font-black tracking-wider text-orange-600">TIGER</span>
              <span className="truncate max-w-[120px]">{title}</span>
            </div>

            <div className="my-0.5">
              <canvas ref={canvasRef} className="max-h-[42px]" />
            </div>

            <div className="w-full flex items-center justify-between text-[11px] font-black border-t border-black pt-0.5">
              <span>السعر:</span>
              <span className="text-xs">{formatJOD(price)}</span>
            </div>
          </div>
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
            {printing ? 'جاري الطباعة...' : 'طباعة الملصق الآن'}
          </button>
        </div>
      </div>
    </div>
  );
};
