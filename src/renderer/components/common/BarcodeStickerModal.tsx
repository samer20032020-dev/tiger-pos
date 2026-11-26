import React, { useEffect, useState } from 'react';
import { Tag, Printer, X, Plus, Minus, Check } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { formatJOD } from '../../../shared/constants';
import { useAppStore } from '../../stores/useAppStore';
import { useEscapeClose } from '../../utils/useEscapeStack';

interface BarcodeStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  code: string; // Barcode or IMEI
  price: number;
  subtitle?: string;
  extraInfo?: string;
  availableStock?: number;
}

export type StickerPresetSize = '50x25' | '40x30' | '40x25' | '38x25';

export const BarcodeStickerModal: React.FC<BarcodeStickerModalProps> = ({
  isOpen,
  onClose,
  title,
  code,
  price,
  subtitle = 'TIGER',
  extraInfo,
  availableStock
}) => {
  useEscapeClose(isOpen, onClose);
  const { addToast } = useAppStore();
  const [printing, setPrinting] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [presetSize, setPresetSize] = useState<StickerPresetSize>('50x25');
  const [storeName, setStoreName] = useState('TIGER');
  
  // Customization Toggles - Simple & Soft
  const [showStoreName, setShowStoreName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCodeText, setShowCodeText] = useState(true);

  // Barcode Base64 Image
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');

  // Fetch store name from settings
  useEffect(() => {
    if (isOpen && window.tigerAPI) {
      window.tigerAPI.getSettings().then((stgs) => {
        if (stgs && stgs.storeName) {
          setStoreName(stgs.storeName);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  // Generate crisp Barcode PNG Data URL
  useEffect(() => {
    if (isOpen && code) {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, code, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          margin: 0
        });
        setBarcodeDataUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Failed to generate sticker barcode:', err);
      }
    }
  }, [isOpen, code]);

  if (!isOpen) return null;

  const [widthMm, heightMm] = presetSize.split('x').map(Number);

  const handlePrint = async () => {
    if (quantity < 1) {
      addToast('يرجى تحديد عدد نسخ صحيح', 'error');
      return;
    }

    setPrinting(true);

    try {
      const escape = (str: string) =>
        str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const pagesHtml = Array.from({ length: quantity })
        .map(
          () => `
        <div class="sticker-page">
          <div class="header">
            ${showStoreName ? `<span class="store-badge">${escape(storeName || 'TIGER')}</span>` : '<span></span>'}
            <span class="item-title">${escape(title)}</span>
          </div>

          <div class="barcode-container">
            ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" class="barcode-img" alt="barcode" />` : ''}
            ${showCodeText ? `<div class="barcode-code">${escape(code)}</div>` : ''}
          </div>

          <div class="footer">
            <span class="subtitle">${subtitle ? escape(subtitle) : ''}</span>
            ${showPrice ? `<span class="price-badge">${formatJOD(price)}</span>` : ''}
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
          <title>طباعة ملصقات الباركود</title>
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
              padding: 1.2mm 2mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              text-align: center;
              overflow: hidden;
            }
            .header {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #000;
              padding-bottom: 0.5mm;
              line-height: 1.1;
            }
            .store-badge {
              font-size: 7pt;
              font-weight: 900;
              letter-spacing: 0.4px;
              color: #000;
              text-transform: uppercase;
            }
            .item-title {
              font-size: 7.2pt;
              font-weight: 800;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: ${showStoreName ? widthMm - 18 : widthMm - 4}mm;
            }
            .barcode-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin: 0.3mm 0;
              width: 100%;
            }
            .barcode-img {
              max-width: ${widthMm - 4}mm;
              height: ${heightMm >= 30 ? 13 : 9}mm;
              object-fit: contain;
              image-rendering: pixelated;
            }
            .barcode-code {
              font-family: 'Courier New', Courier, monospace;
              font-size: 6.5pt;
              font-weight: 800;
              letter-spacing: 1px;
              margin-top: 0.2mm;
              line-height: 1;
            }
            .footer {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1px solid #000;
              padding-top: 0.5mm;
              line-height: 1.1;
            }
            .subtitle {
              font-size: 6.2pt;
              font-weight: 700;
              color: #222;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: ${widthMm - 24}mm;
            }
            .price-badge {
              font-size: 8.5pt;
              font-weight: 900;
              direction: ltr;
              font-family: 'Courier New', Courier, monospace;
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
        addToast(`تم إرسال ${quantity} ملصق إلى الطابعة بنجاح!`, 'success');
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
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">طباعة ملصق الباركود</h3>
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
              width: `${widthMm * 4.4}px`,
              minHeight: `${heightMm * 4.4}px`
            }}
            className="bg-white text-black p-2.5 rounded-lg flex flex-col justify-between shadow-md border border-slate-200/90 select-none font-sans transition-all duration-200"
          >
            {/* Top row */}
            <div className="w-full flex items-center justify-between border-b border-black pb-1 text-[11px] font-black">
              {showStoreName ? (
                <span className="font-black tracking-wider text-orange-600 truncate max-w-[80px]">
                  {storeName || 'TIGER'}
                </span>
              ) : <span />}
              <span className="truncate max-w-[130px] font-bold text-right" title={title}>
                {title}
              </span>
            </div>

            {/* Barcode Center */}
            <div className="my-1 flex flex-col items-center justify-center">
              {barcodeDataUrl ? (
                <img
                  src={barcodeDataUrl}
                  alt="barcode"
                  className="max-h-[36px] object-contain select-none"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="h-8 w-28 bg-slate-100 animate-pulse rounded" />
              )}
              {showCodeText && (
                <span className="font-mono text-[9.5px] font-bold tracking-wider mt-0.5 text-black">
                  {code}
                </span>
              )}
            </div>

            {/* Bottom Row */}
            <div className="w-full flex items-center justify-between border-t border-black pt-1 text-[11px]">
              <span className="text-[10px] font-bold text-gray-700 truncate max-w-[90px]">
                {subtitle || ''}
              </span>
              {showPrice && (
                <div className="font-black text-xs text-black font-mono">
                  {formatJOD(price)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Simple Controls */}
        <div className="space-y-3.5">
          
          {/* Quantity Row */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
              <span>عدد النسخ:</span>
              {availableStock !== undefined && availableStock > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(availableStock)}
                  className="text-orange-600 hover:underline font-bold"
                >
                  كامل الرصيد ({availableStock})
                </button>
              )}
            </div>

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
                  max="500"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                  className="w-16 text-center font-bold font-mono text-sm bg-transparent border-0 outline-none text-slate-900 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(500, q + 1))}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Chips */}
              <div className="flex items-center gap-1 flex-1">
                {[1, 2, 5, 10, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuantity(num)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition ${
                      quantity === num
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700 hover:border-orange-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Size Pills */}
          <div>
            <div className="text-xs text-slate-500 mb-1.5 font-medium">المقاس:</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: '50x25', label: '50 × 25 مم' },
                { id: '40x30', label: '40 × 30 مم' },
                { id: '40x25', label: '40 × 25 مم' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPresetSize(p.id as StickerPresetSize)}
                  className={`py-2 px-3 rounded-xl text-center text-xs font-bold border transition ${
                    presetSize === p.id
                      ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 text-orange-600 dark:text-orange-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Soft Toggles */}
          <div className="flex items-center justify-between pt-1 text-xs text-slate-600 dark:text-slate-400">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500"
              />
              <span>إظهار السعر</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showStoreName}
                onChange={(e) => setShowStoreName(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500"
              />
              <span>اسم المحل</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showCodeText}
                onChange={(e) => setShowCodeText(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500"
              />
              <span>رقم الكود</span>
            </label>
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
            {printing ? 'جاري الطباعة...' : `طباعة (${quantity}) ملصق الآن`}
          </button>
        </div>

      </div>
    </div>
  );
};
