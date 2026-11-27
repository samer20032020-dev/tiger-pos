import React, { useState, useEffect } from 'react';
import { tigerConfirm } from '../../stores/useConfirmStore';
import { 
  Wrench, Plus, Search, Filter, Printer, 
  Package, Clock, CheckCircle2, ChevronDown, Lock, Smartphone, Tag, X,
  AlertTriangle, MessageSquare, Send, DollarSign, Check
} from 'lucide-react';
import { RepairTicket, RepairStatus, Accessory } from '../../../shared/types';
import { REPAIR_STATUS_LABELS, formatJOD, isRepairCategory, cleanNumberInput, parseNumberInput } from '../../../shared/constants';
import { formatLocalDateTime } from '../../../shared/dateUtils';
import { RepairTicketModal } from './RepairTicketModal';
import { RepairPartsModal } from './RepairPartsModal';
import { RepairDeviceStickerModal } from './RepairDeviceStickerModal';
import { RepairInventoryModal } from './RepairInventoryModal';
import { PatternLockInput } from '../common/PatternLockInput';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { sendWhatsAppMessage, buildRepairWhatsAppMessage, RepairWhatsAppTemplate } from '../../utils/whatsapp';
import { useAppStore } from '../../stores/useAppStore';
import { useEscapeClose } from '../../utils/useEscapeStack';

export const RepairsTab: React.FC = () => {
  const { addToast, setActiveTab, setCriticalShortageFilter, currentUser } = useAppStore();
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [criticalParts, setCriticalParts] = useState<Accessory[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isRepairInventoryOpen, setRepairInventoryOpen] = useState(false);
  const [partsTicket, setPartsTicket] = useState<RepairTicket | null>(null);
  const [patternTicket, setPatternTicket] = useState<RepairTicket | null>(null);
  const [stickerTicket, setStickerTicket] = useState<RepairTicket | null>(null);

  // Payment / Settle Modal
  const [settleTicket, setSettleTicket] = useState<RepairTicket | null>(null);
  useEscapeClose(Boolean(patternTicket), () => setPatternTicket(null));
  useEscapeClose(Boolean(settleTicket), () => setSettleTicket(null));
  const [settleFinalCost, setSettleFinalCost] = useState<string>('');
  const [settling, setSettling] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const [ticketsData, accData] = await Promise.all([
        window.tigerAPI.getAllRepairTickets(),
        window.tigerAPI.getAllAccessories ? window.tigerAPI.getAllAccessories() : Promise.resolve([])
      ]);
      setTickets(ticketsData);
      
      // Filter critical spare parts only (<= 2 items, excluding consumer accessories & unlimited services)
      const partsShortages = accData.filter(a => !a.isUnlimitedStock && isRepairCategory(a.category, a.name) && a.currentStock <= 2);
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

  const handleStatusChange = async (ticket: RepairTicket, newStatus: string) => {
    try {
      await window.tigerAPI.updateRepairStatus(ticket.id, newStatus);
      addToast(`تم تحديث حالة الجهاز إلى (${REPAIR_STATUS_LABELS[newStatus]?.label || newStatus})`, 'success');

      const remaining = Math.max(0, (ticket.finalCost || ticket.estimatedCost || 0) - (ticket.advancePayment || 0));
      if (newStatus === 'delivered' && !ticket.isPaid && remaining > 0.005) {
        setSettleTicket(ticket);
        setSettleFinalCost(String(ticket.finalCost || ticket.estimatedCost || 0));
      }
      loadTickets();
    } catch (err: any) {
      addToast(err.message || 'فشل تحديث الحالة', 'error');
    }
  };

  const handleConfirmSettlePaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTicket) return;
    setSettling(true);
    try {
      const finalVal = parseNumberInput(settleFinalCost);
      await window.tigerAPI.markRepairTicketPaid(settleTicket.id, finalVal, currentUser?.fullName || 'الكاشير');
      addToast(`تم تثبيت سداد تذكرة الصيانة (${settleTicket.ticketNumber}) بالكامل بنجاح ✅`, 'success');
      setSettleTicket(null);
      loadTickets();
    } catch (err: any) {
      addToast(err.message || 'فشل تسديد التذكرة', 'error');
    } finally {
      setSettling(false);
    }
  };

  const handleSendWhatsApp = async (t: RepairTicket, template: RepairWhatsAppTemplate = 'ready_for_pickup') => {
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

  const handleDeleteTicket = async (t: RepairTicket) => {
    const confirmed = await tigerConfirm(`هل أنت متأكد من حذف تذكرة الصيانة (${t.ticketNumber} - ${t.customerName}) نهائياً؟`, { title: 'تأكيد حذف التذكرة', tone: 'danger', confirmText: 'نعم، احذف' });
    if (!confirmed) {
      return;
    }
    try {
      await window.tigerAPI.deleteRepairTicket(t.id);
      addToast(`تم حذف تذكرة الصيانة (${t.ticketNumber}) بنجاح`, 'info');
      loadTickets();
    } catch (err: any) {
      addToast(err.message || 'فشل حذف تذكرة الصيانة', 'error');
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
          <div class="row"><span>التاريخ:</span><span>${formatLocalDateTime(t.createdAt)}</span></div>
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
          <div class="row"><span>التكلفة التقديرية:</span><span class="bold">${t.estimatedCost.toFixed(3)} د.أ</span></div>
          <div class="row"><span>العربون / المدفوع:</span><span class="bold">${t.advancePayment.toFixed(3)} د.أ</span></div>
          <div class="row"><span>الحساب المتبقي:</span><span class="bold">${(t.isPaid || t.status === 'delivered' || Math.max(0, (t.finalCost || t.estimatedCost) - t.advancePayment) <= 0.005) ? 'مدفوع بالكامل (0.000 د.أ)' : `${Math.max(0, (t.finalCost || t.estimatedCost) - t.advancePayment).toFixed(3)} د.أ`}</span></div>
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('repair_parts')}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm transition cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-orange-500" />
            <span>مخزون وقطع الصيانة</span>
          </button>

          <button
            onClick={() => setCreateOpen(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            استلام جهاز صيانة جديد
          </button>
        </div>
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
                    <span className="font-mono font-black text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTicket(t);
                        }}
                        title="حذف تذكرة الصيانة"
                        className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span>{t.ticketNumber}</span>
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
                  {(() => {
                    const effCost = t.finalCost || t.estimatedCost || 0;
                    const rem = Math.max(0, effCost - (t.advancePayment || 0));
                    const isFullyPaid = Boolean(t.isPaid || t.status === 'delivered' || rem <= 0.005);
                    return (
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-500">
                          الحساب: <b className="text-slate-900 dark:text-white">{formatJOD(effCost)}</b>
                        </span>
                        {isFullyPaid ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>مدفوع بالكامل</span>
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-bold">
                            متبقي: {formatJOD(rem)}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* WhatsApp Direct Notification (Only for last 3 statuses) + Settle Paid */}
                  {(() => {
                    const isUnpaid = !(
                      t.isPaid ||
                      t.status === 'delivered' ||
                      t.status === 'cancelled' ||
                      Math.max(0, (t.finalCost || t.estimatedCost || 0) - (t.advancePayment || 0)) <= 0.005
                    );
                    const whatsappMeta =
                      t.status === 'ready_for_pickup'
                        ? {
                            template: 'ready_for_pickup' as const,
                            label: 'واتساب: جاهز للاستلام',
                            btnClass: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30',
                          }
                        : t.status === 'delivered'
                        ? {
                            template: 'delivered' as const,
                            label: 'واتساب: تم التسليم والشكر',
                            btnClass: 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30',
                          }
                        : t.status === 'cancelled'
                        ? {
                            template: 'cancelled' as const,
                            label: 'واتساب: تعذر الإصلاح / استلام',
                            btnClass: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30',
                          }
                        : null;

                    if (!whatsappMeta && !isUnpaid) return null;

                    return (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {whatsappMeta && (
                          <button
                            onClick={() => handleSendWhatsApp(t, whatsappMeta.template)}
                            title="إرسال رسالة واتساب مخصصة للحالة الحالية"
                            className={`flex-1 text-white font-bold py-1.5 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98] ${whatsappMeta.btnClass}`}
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                            <span>{whatsappMeta.label}</span>
                          </button>
                        )}
                        {isUnpaid && (
                          <button
                            onClick={() => {
                              setSettleTicket(t);
                              setSettleFinalCost(String(t.finalCost || t.estimatedCost || 0));
                            }}
                            title="تأكيد استلام كامل المبلغ وتصفير المتبقي"
                            className={`px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black flex items-center justify-center gap-1 shadow-sm transition ${
                              whatsappMeta ? '' : 'flex-1'
                            }`}
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>تم الدفع</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    {/* Status Changer */}
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t, e.target.value)}
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
        onSuccess={(newTicket) => {
          loadTickets();
          if (newTicket) {
            setStickerTicket(newTicket);
          }
        }}
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
      {/* Repair Parts Inventory Modal */}
      <RepairInventoryModal
        isOpen={isRepairInventoryOpen}
        onClose={() => setRepairInventoryOpen(false)}
        onSuccess={loadTickets}
      />

      {/* Mark Repair Ticket Paid Modal */}
      {settleTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">تسديد كامل حساب الصيانة</h3>
                  <p className="text-[11px] text-slate-500">{settleTicket.ticketNumber} | {settleTicket.customerName}</p>
                </div>
              </div>
              <button onClick={() => setSettleTicket(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettlePaid} className="space-y-4 pt-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">الجهاز:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{settleTicket.deviceModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">العربون المدفوع مسبقاً:</span>
                  <span className="font-mono font-bold text-emerald-600">{formatJOD(settleTicket.advancePayment)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  التكلفة النهائية الإجمالية (د.أ):
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  value={settleFinalCost}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setSettleFinalCost(cleanNumberInput(e.target.value))}
                  placeholder="0.000"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm font-mono font-black text-emerald-600 text-left"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  سيتم تسجيل التذكرة كمدفوعة بالكامل وتصفير المبلغ المتبقي في الواتساب والإيصال تلقائياً.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleTicket(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{settling ? 'جاري التثبيت...' : 'تأكيد استلام المبلغ بالكامل'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
