import React, { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Search, Filter, Printer, 
  Package, Clock, CheckCircle2, ChevronDown, Lock, Smartphone, Tag, X,
  AlertTriangle, MessageSquare, Send
} from 'lucide-react';
import { RepairTicket, RepairStatus, Accessory } from '../../../shared/types';
import { REPAIR_STATUS_LABELS, formatJOD } from '../../../shared/constants';
import { RepairTicketModal } from './RepairTicketModal';
import { RepairPartsModal } from './RepairPartsModal';
import { RepairDeviceStickerModal } from './RepairDeviceStickerModal';
import { PatternLockInput } from '../common/PatternLockInput';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { sendWhatsAppMessage, buildRepairWhatsAppMessage } from '../../utils/whatsapp';
import { useAppStore } from '../../stores/useAppStore';

export const RepairsTab: React.FC = () => {
  const { addToast, setActiveTab, setCriticalShortageFilter } = useAppStore();
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [criticalParts, setCriticalParts] = useState<Accessory[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [partsTicket, setPartsTicket] = useState<RepairTicket | null>(null);
  const [patternTicket, setPatternTicket] = useState<RepairTicket | null>(null);
  const [stickerTicket, setStickerTicket] = useState<RepairTicket | null>(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const [ticketsData, accData] = await Promise.all([
        window.tigerAPI.getAllRepairTickets(),
        window.tigerAPI.getAllAccessories ? window.tigerAPI.getAllAccessories() : Promise.resolve([])
      ]);
      setTickets(ticketsData);
      
      // Filter critical spare parts (<= 2 items)
      const partsShortages = accData.filter(a => a.currentStock <= 2 && (
        a.category.includes('قطع غيار') || 
        a.category.includes('شاشات') || 
        a.category.includes('بطاريات') ||
        a.category.includes('كوابل') ||
        a.name.includes('شاشة') ||
        a.name.includes('بطارية') ||
        a.name.includes('كابل')
      ));
      setCriticalParts(partsShortages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await window.tigerAPI.updateRepairStatus(ticketId, newStatus);
      addToast(`تم تحديث حالة الجهاز إلى (${REPAIR_STATUS_LABELS[newStatus]?.label || newStatus})`, 'success');
      loadTickets();
    } catch (err: any) {
      addToast(err.message || 'فشل تحديث الحالة', 'error');
    }
  };

  const handleSendWhatsApp = async (t: RepairTicket, template: 'ready' | 'received' = 'ready') => {
    if (!t.customerPhone) {
      addToast('رقم هاتف العميل غير متوفر في هذه التذكرة', 'warning');
      return;
    }

    const message = buildRepairWhatsAppMessage(t, template);
    const res = await sendWhatsAppMessage(t.customerPhone, message);
    if (res.success) {
      addToast(`تم فتح محادثة واتساب للعميل (${t.customerName}) بنجاح`, 'success');
    } else {
      addToast(res.error || 'تعذر إرسال رسالة الواتساب', 'error');
    }
  };

  const filtered = tickets.filter(t => {
    const matchSearch = search === '' ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.customerPhone.includes(search) ||
      t.deviceModel.toLowerCase().includes(search.toLowerCase()) ||
      t.deviceImei.includes(search);

    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const printTicketReceipt = async (t: RepairTicket) => {
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: monospace, Tahoma, sans-serif; font-size: 11px; padding: 10px; direction: rtl; text-align: right; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="center bold border-b">
          <div style="font-size: 15px; font-weight: 900; letter-spacing: 1px;">TIGER</div>
          <div>قسم الصيانة والدعم الفني</div>
          <div>إيصال استلام جهاز صيانة</div>
        </div>
        <div class="border-b">
          <div class="row"><span>رقم التذكرة:</span><span class="bold">${t.ticketNumber}</span></div>
          <div class="row"><span>التاريخ:</span><span>${t.createdAt.replace('T', ' ').substring(0, 16)}</span></div>
          <div class="row"><span>اسم العميل:</span><span class="bold">${t.customerName}</span></div>
          <div class="row"><span>الهاتف:</span><span>${t.customerPhone}</span></div>
          <div class="row"><span>الجهاز:</span><span class="bold">${t.deviceModel}</span></div>
          <div class="row"><span>IMEI:</span><span>${t.deviceImei}</span></div>
          ${t.lockPasscode ? `<div class="row"><span>رمز القفل:</span><span class="bold">${t.lockPasscode}</span></div>` : ''}
        </div>
        <div class="border-b">
          <div><b>العطل المسجل:</b></div>
          <div>${t.reportedIssue}</div>
        </div>
        <div class="border-b">
          <div class="row"><span>التكلفة التقديرية:</span><span class="bold">${t.estimatedCost.toFixed(2)} د.أ</span></div>
          <div class="row"><span>العربون المستلم:</span><span class="bold">${t.advancePayment.toFixed(2)} د.أ</span></div>
          <div class="row"><span>المتبقي عند الاستلام:</span><span class="bold">${(t.finalCost - t.advancePayment).toFixed(2)} د.أ</span></div>
          <div class="row"><span>الموعد المتوقع:</span><span>${t.expectedDeliveryDate || '-'}</span></div>
        </div>
        <div class="center" style="font-size: 9px; margin-top: 8px; line-height: 1.4;">
          * إقرار قانوني: المحل غير مسؤول عن الأجهزة التي يمر على صيانتها أكثر من 40 يوماً دون استلام، وتعتبر تالفة أو متنازل عنها بعد هذا التاريخ.
          <br>شكراً لثقتكم بنا - TIGER
        </div>
      </body>
      </html>
    `;
    await window.tigerAPI.printSilentHtml(html, false);
    addToast('تم إرسال إيصال الصيانة للطابعة الحرارية', 'info');
  };

  return (
    <div className="p-6 space-y-4 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between select-none">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-500" />
            قسم الصيانة المتكامل (Repair Center)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة مراحل الصيانة، ربط قطع الغيار واحتساب صافي الأرباح، وفحص الأقفال ورسم النمط
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          استلام جهاز صيانة جديد
        </button>
      </div>

      {/* Spare Parts Stock Alert Beacon Banner */}
      {criticalParts.length > 0 && (
        <div className="bg-gradient-to-r from-red-600/10 via-amber-500/10 to-transparent border border-red-200 dark:border-red-900/60 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <div>
              <span className="font-bold text-red-700 dark:text-red-400">
                منارة تنبيهات قطع الغيار (Stock Alert Beacon):
              </span>
              <span className="text-slate-700 dark:text-slate-300 mr-1.5 font-medium">
                يوجد {criticalParts.length} قطع صيانة وشاشات وبطاريات وصل رصيدها إلى قطعتين أو أقل. اطلبها الآن قبل نفادها!
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setCriticalShortageFilter(true);
              setActiveTab('accessories');
            }}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] shrink-0 shadow-sm flex items-center gap-1.5 transition"
          >
            <Package className="w-3.5 h-3.5" />
            <span>طلب النواقص ({criticalParts.length})</span>
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm select-none">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم التذكرة، اسم الزبون، الموديل، أو الـ IMEI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Status Pipeline Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'all'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            الكل ({tickets.length})
          </button>
          {Object.entries(REPAIR_STATUS_LABELS).map(([stKey, stVal]) => {
            const count = tickets.filter(t => t.status === stKey).length;
            return (
              <button
                key={stKey}
                onClick={() => setStatusFilter(stKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === stKey
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {stVal.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Tickets List / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">
            جاري تحميل تذاكر الصيانة...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">
            لا توجد تذاكر صيانة في هذا القسم
          </div>
        ) : (
          filtered.map((t) => {
            const stMeta = REPAIR_STATUS_LABELS[t.status] || { label: t.status, badge: 'bg-slate-100 text-slate-800' };
            return (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Ticket # & Status */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-mono font-black text-xs text-orange-600 dark:text-orange-400">
                      {t.ticketNumber}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm ${stMeta.badge}`}>
                      {t.status === 'diagnosing' && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                      {t.status === 'waiting_for_parts' && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
                        </span>
                      )}
                      {t.status === 'ready_for_pickup' && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                      {t.status === 'received' && (
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                      )}
                      {t.status === 'delivered' && (
                        <CheckCircle2 className="w-3 h-3 text-slate-500" />
                      )}
                      {t.status === 'cancelled' && (
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
                      )}
                      <span>{stMeta.label}</span>
                    </span>
                  </div>

                  {/* Customer & Device */}
                  <div className="my-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{t.customerName}</span>
                      <span className="text-[11px] font-mono text-slate-500">{t.customerPhone}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-orange-500" />
                      <span>{t.deviceModel}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">({t.deviceImei})</span>
                    </div>

                    {/* Reported Issue */}
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-slate-700 dark:text-slate-200 ml-1">العطل:</span>
                      {t.reportedIssue}
                    </div>

                    {/* Lock Screen Info */}
                    <div className="mt-2 flex items-center gap-2">
                      {t.lockPasscode && (
                        <div className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
                          <Lock className="w-3 h-3 text-orange-500" />
                          <span>رمز: <b className="font-mono">{t.lockPasscode}</b></span>
                        </div>
                      )}
                      {t.lockPattern && (
                        <button
                          onClick={() => setPatternTicket(t)}
                          className="text-[10px] bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold px-2 py-0.5 rounded flex items-center gap-1 hover:underline"
                        >
                          <Lock className="w-3 h-3" />
                          عرض النمط (Pattern)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financials & Action Buttons */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">
                      الحساب: <b className="text-slate-900 dark:text-white">{formatJOD(t.finalCost)}</b>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      عربون: {formatJOD(t.advancePayment)}
                    </span>
                  </div>

                  {/* WhatsApp Direct Notification Buttons */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      onClick={() => handleSendWhatsApp(t, 'ready')}
                      title="إرسال إشعار عبر واتساب بنقرة واحدة: جهازك جاهز للاستلام (المبلغ المتبقي)"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/30 transition active:scale-[0.98]"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                      <span>إرسال للواتساب (جاهز)</span>
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(t, 'received')}
                      title="إرسال إشعار عبر واتساب: تم استلام جهازك للفحص والصيانة"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <span>استلام</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    {/* Status Changer */}
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex-1"
                    >
                      {Object.entries(REPAIR_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>

                    {/* Attach Spare Parts button */}
                    <button
                      onClick={() => setPartsTicket(t)}
                      title="ربط قطع غيار واحتساب صافي الربح"
                      className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 hover:bg-orange-100 transition"
                    >
                      <Package className="w-4 h-4" />
                    </button>

                    {/* Mini Device Sticker (40x20mm) button */}
                    <button
                      onClick={() => setStickerTicket(t)}
                      title="طباعة لاصق ظهر الجهاز (استيكر الباك 40x20mm)"
                      className="px-2 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 hover:bg-orange-200 text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>لاصق الباك</span>
                    </button>

                    {/* Print Receipt button */}
                    <button
                      onClick={() => printTicketReceipt(t)}
                      title="طباعة إيصال استلام حراري"
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-orange-500 transition"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <RepairTicketModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={loadTickets}
      />

      {partsTicket && (
        <RepairPartsModal
          ticket={partsTicket}
          isOpen={true}
          onClose={() => setPartsTicket(null)}
          onSuccess={loadTickets}
        />
      )}

      {stickerTicket && (
        <RepairDeviceStickerModal
          ticket={stickerTicket}
          isOpen={true}
          onClose={() => setStickerTicket(null)}
        />
      )}

      {/* View Saved Pattern Modal */}
      {patternTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xs w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-800 dark:text-white">
                نمط قفل الشاشة: {patternTicket.deviceModel}
              </span>
              <button onClick={() => setPatternTicket(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="my-4 flex justify-center">
              <PatternLockInput
                value={patternTicket.lockPattern}
                readOnly={true}
                size={200}
              />
            </div>
            <button
              onClick={() => setPatternTicket(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl text-xs font-bold"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
