import React, { useState, useEffect } from 'react';
import { X, Wrench, Package, Plus, Trash2, CheckCircle2, DollarSign } from 'lucide-react';
import { Accessory, RepairTicket } from '../../../shared/types';
import { cleanNumberInput } from '../../../shared/constants';
import { useAppStore } from '../../stores/useAppStore';

interface RepairPartsModalProps {
  ticket: RepairTicket;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RepairPartsModal: React.FC<RepairPartsModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { addToast } = useAppStore();
  const [ticketDetails, setTicketDetails] = useState<RepairTicket | null>(null);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [selectedAccId, setSelectedAccId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [attaching, setAttaching] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [details, accs] = await Promise.all([
        window.tigerAPI.getRepairTicketDetails(ticket.id),
        window.tigerAPI.getAllAccessories()
      ]);
      setTicketDetails(details);
      // Filter accessories suitable for parts (e.g. category containing صيانة or all)
      setAccessories(accs);
      if (accs.length > 0) setSelectedAccId(accs[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, ticket.id]);

  if (!isOpen) return null;

  const handleAttachPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccId) return;

    setAttaching(true);
    try {
      await window.tigerAPI.attachPartToRepair(ticket.id, selectedAccId, quantity);
      addToast('تم ربط قطعة الغيار بالتذكرة وخصمها من المخزون بنجاح!', 'success');
      await loadData();
      onSuccess();
    } catch (err: any) {
      addToast(err.message || 'فشل إضافة قطعة الغيار', 'error');
    } finally {
      setAttaching(false);
    }
  };

  // Profit calculation:
  // Total ticket charge - total parts cost = Net Repair Profit!
  const totalPartsCost = ticketDetails?.parts?.reduce((sum, p) => sum + p.totalCost, 0) || 0;
  const totalCharge = ticketDetails?.finalCost || ticket.finalCost;
  const netRepairProfit = totalCharge - totalPartsCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">قطع الغيار واحتساب صافي ربح الصيانة</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {ticket.ticketNumber} | {ticket.deviceModel} ({ticket.customerName})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Repair Profit Calculator Card */}
        <div className="my-4 grid grid-cols-3 gap-3">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <div className="text-[10px] text-slate-500">إجمالي حساب الزبون</div>
            <div className="text-base font-black font-mono text-slate-800 dark:text-slate-200">
              {totalCharge.toFixed(2)} د.أ
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-800 text-center">
            <div className="text-[10px] text-red-600 dark:text-red-400 font-bold">تكلفة قطع الغيار</div>
            <div className="text-base font-black font-mono text-red-600 dark:text-red-400">
              {totalPartsCost.toFixed(2)} د.أ
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 text-center">
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">صافي أرباح الصيانة</div>
            <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
              {netRepairProfit.toFixed(2)} د.أ
            </div>
          </div>
        </div>

        {/* Attach Part Form */}
        <form onSubmit={handleAttachPart} className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            إضافة قطعة غيار من المخزون:
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <select
                value={selectedAccId}
                onChange={(e) => setSelectedAccId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              >
                {accessories.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.currentStock <= 0}>
                    {a.name} (متوفر: {a.currentStock}) - تكلفة: {a.costPrice} د.أ
                  </option>
                ))}
              </select>
            </div>
            <div className="w-20">
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={quantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const clean = cleanNumberInput(e.target.value).replace(/[^0-9]/g, '');
                  setQuantity(clean === '' ? 1 : Math.max(1, parseInt(clean, 10)));
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-center font-bold font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={attaching || !selectedAccId}
              className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-md shadow-orange-600/30 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              ربط وخصم
            </button>
          </div>
        </form>

        {/* Attached Parts List */}
        <div className="my-4 space-y-2">
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            قطع الغيار المركبة في هذا الجهاز ({ticketDetails?.parts?.length || 0}):
          </span>
          {ticketDetails?.parts?.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
              لم يتم تركيب أي قطع غيار من المخزون حتى الآن (أجور يد فقط)
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {ticketDetails?.parts?.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{p.partName}</div>
                    <div className="text-[10px] text-slate-400">الكمية: {p.quantity}</div>
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-red-500 font-bold">تكلفة: {p.totalCost.toFixed(2)} د.أ</div>
                    <div className="text-[10px] text-slate-400">سعر البيع: {p.totalPrice.toFixed(2)} د.أ</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
