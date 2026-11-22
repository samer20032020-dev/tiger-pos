import React, { useState, useEffect } from 'react';
import { 
  X, CreditCard, Banknote, Landmark, UserCheck, CheckCircle2, 
  Split, AlertTriangle, Plus, Search, Calendar, Sparkles, UserPlus 
} from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';
import { useAppStore } from '../../stores/useAppStore';
import { useShiftStore } from '../../stores/useShiftStore';
import { PaymentMethod, Customer } from '../../../shared/types';
import { formatJOD } from '../../../shared/constants';

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSuccess: (createdInvoice: any) => void;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirmSuccess
}) => {
  const { 
    items, customer, customerName, customerPhone, 
    discountType, getDiscountAmount, taxEnabled, taxRate, getTaxAmount,
    tradeIn, getSubtotal, getNetTotal, 
    clearCart, notes, setCustomer, setCustomerInfo 
  } = useCartStore();
  const { currentUser, addToast } = useAppStore();
  const { activeShift } = useShiftStore();

  const netTotal = getNetTotal();

  // Payment amounts
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashAmount, setCashAmount] = useState<number>(netTotal);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [cliqAmount, setCliqAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Customer debt handling for "يدفع جزء وجزء بعدين"
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const [customerMode, setCustomerMode] = useState<'quick_new' | 'existing'>('quick_new');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [quickName, setQuickName] = useState<string>('');
  const [quickPhone, setQuickPhone] = useState<string>('');
  const [dueDateNote, setDueDateNote] = useState<string>('خلال أسبوع');

  // Load existing customers on open
  useEffect(() => {
    if (isOpen && window.tigerAPI && window.tigerAPI.getAllCustomers) {
      window.tigerAPI.getAllCustomers().then((custs) => {
        setExistingCustomers(custs || []);
      }).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('cash');
      setCashAmount(netTotal);
      setCardAmount(0);
      setCliqAmount(0);
      setQuickName(customer && customer.name !== 'زبون نقدي' ? customer.name : customerName && customerName !== 'زبون نقدي' ? customerName : '');
      setQuickPhone(customer?.phone || customerPhone || '');
      setSelectedCustomerId(customer?.id || '');
    }
  }, [isOpen, netTotal, customer, customerName, customerPhone]);

  if (!isOpen) return null;

  const totalPaid = Number((Number(cashAmount || 0) + Number(cardAmount || 0) + Number(cliqAmount || 0)).toFixed(3));
  const remaining = Number(Math.max(0, netTotal - totalPaid).toFixed(3));
  const changeDue = Number(Math.max(0, totalPaid - netTotal).toFixed(3));

  // --- Quick 100% Selectors ---
  const handleSelectFull = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'cash') {
      setCashAmount(netTotal); setCardAmount(0); setCliqAmount(0);
    } else if (method === 'card') {
      setCashAmount(0); setCardAmount(netTotal); setCliqAmount(0);
    } else if (method === 'cliq') {
      setCashAmount(0); setCardAmount(0); setCliqAmount(netTotal);
    } else if (method === 'credit') {
      setCashAmount(0); setCardAmount(0); setCliqAmount(0);
    }
  };

  // --- Smart Quick-Split Presets ---
  // 1. Half Cash + Half CliQ (50% / 50%)
  const handleSplitHalfCashCliq = () => {
    setPaymentMethod('split');
    const half = Number((netTotal / 2).toFixed(3));
    setCashAmount(half);
    setCliqAmount(Number((netTotal - half).toFixed(3)));
    setCardAmount(0);
  };

  // 2. Half Cash + Half Card (50% / 50%)
  const handleSplitHalfCashCard = () => {
    setPaymentMethod('split');
    const half = Number((netTotal / 2).toFixed(3));
    setCashAmount(half);
    setCardAmount(Number((netTotal - half).toFixed(3)));
    setCliqAmount(0);
  };

  // 3. Half Card + Half CliQ (50% / 50%)
  const handleSplitHalfCardCliq = () => {
    setPaymentMethod('split');
    const half = Number((netTotal / 2).toFixed(3));
    setCardAmount(half);
    setCliqAmount(Number((netTotal - half).toFixed(3)));
    setCashAmount(0);
  };

  // 4. Equal Thirds (1/3 Cash + 1/3 Card + 1/3 CliQ)
  const handleSplitEqualThirds = () => {
    setPaymentMethod('split');
    const third = Number((netTotal / 3).toFixed(3));
    setCashAmount(third);
    setCardAmount(third);
    setCliqAmount(Number((netTotal - (2 * third)).toFixed(3)));
  };

  // Auto-Fill balance buttons
  const autoFillCash = () => {
    setPaymentMethod('split');
    const bal = Number(Math.max(0, netTotal - (cardAmount || 0) - (cliqAmount || 0)).toFixed(3));
    setCashAmount(bal);
  };

  const autoFillCard = () => {
    setPaymentMethod('split');
    const bal = Number(Math.max(0, netTotal - (cashAmount || 0) - (cliqAmount || 0)).toFixed(3));
    setCardAmount(bal);
  };

  const autoFillCliq = () => {
    setPaymentMethod('split');
    const bal = Number(Math.max(0, netTotal - (cashAmount || 0) - (cardAmount || 0)).toFixed(3));
    setCliqAmount(bal);
  };

  // --- Confirmation & Invoice Saving ---
  const handleConfirm = async () => {
    if (items.length === 0) return;

    let targetCustomerId: string | null = customer?.id || null;
    let targetCustomerName = customerName || 'زبون نقدي';
    let targetCustomerPhone = customerPhone || null;

    // If there is an unpaid remaining balance (يدفع جزء وجزء بعدين) or 100% credit
    if (remaining > 0 || paymentMethod === 'credit') {
      if (customerMode === 'existing' && selectedCustomerId) {
        const found = existingCustomers.find(c => c.id === selectedCustomerId);
        if (found) {
          targetCustomerId = found.id;
          targetCustomerName = found.name;
          targetCustomerPhone = found.phone || null;
          setCustomer(found);
        }
      } else if (quickName.trim() && quickName.trim() !== 'زبون نقدي') {
        // Automatically create or link this customer so store records their debt!
        targetCustomerName = quickName.trim();
        targetCustomerPhone = quickPhone.trim() || null;

        // Check if customer already exists by phone or name
        const match = existingCustomers.find(c => 
          (quickPhone.trim() && c.phone === quickPhone.trim()) || 
          c.name.toLowerCase() === targetCustomerName.toLowerCase()
        );

        if (match) {
          targetCustomerId = match.id;
          setCustomer(match);
        } else if (window.tigerAPI && window.tigerAPI.addCustomer) {
          try {
            const newCust = await window.tigerAPI.addCustomer({
              name: targetCustomerName,
              phone: targetCustomerPhone || '',
              idNumber: '',
              balance: 0,
              notes: dueDateNote ? `ذمة مؤجلة: ${dueDateNote}` : 'تمت إضافته من نافذة الدفع الجزئي'
            });
            targetCustomerId = newCust.id;
            setCustomer(newCust);
          } catch (e) {
            console.warn('Could not auto-create customer, saving on invoice name directly:', e);
          }
        }
      } else {
        // If cashier left name empty, ask for customer name
        addToast('يرجى تحديد اسم العميل أو كتابته لتسجيل المبلغ المتبقي على حسابه!', 'warning');
        return;
      }
    }

    setSubmitting(true);
    try {
      const discountAmt = getDiscountAmount();
      const taxAmt = getTaxAmount();

      // Combined final payment method label
      const determinedMethod = 
        paymentMethod === 'credit' ? 'credit' :
        remaining > 0 ? 'split' :
        (cashAmount > 0 && cardAmount > 0) || (cashAmount > 0 && cliqAmount > 0) || (cardAmount > 0 && cliqAmount > 0) ? 'split' :
        cardAmount > 0 ? 'card' :
        cliqAmount > 0 ? 'cliq' : 'cash';

      const invoiceNotes = [
        notes,
        remaining > 0 ? `المتبقي ذمة (${formatJOD(remaining)}): موعد السداد [${dueDateNote || 'غير محدد'}]` : '',
        changeDue > 0 ? `الباقي المرجع للعميل كاش: ${formatJOD(changeDue)}` : ''
      ].filter(Boolean).join(' | ');

      const invoiceData = {
        shiftId: activeShift ? activeShift.id : null,
        customerId: targetCustomerId,
        customerName: targetCustomerName,
        customerPhone: targetCustomerPhone,
        subtotal: getSubtotal(),
        discount: discountAmt,
        discountType,
        taxRate: taxEnabled ? taxRate : 0,
        taxAmount: taxAmt,
        tradeInDiscount: tradeIn ? tradeIn.purchasePrice : 0,
        totalAmount: netTotal,
        paidAmount: Math.min(totalPaid, netTotal),
        remainingAmount: remaining,
        paymentMethod: determinedMethod,
        cashAmount: Math.min(cashAmount || 0, netTotal),
        cardAmount: cardAmount || 0,
        cliqAmount: cliqAmount || 0,
        creditAmount: remaining,
        notes: invoiceNotes || null,
        cashierId: currentUser?.id || 'usr-1',
        cashierName: currentUser?.fullName || 'الكاشير'
      };

      const lineItems = items.map(it => ({
        itemType: it.itemType,
        itemId: it.itemId,
        name: it.name,
        barcodeOrImei: it.barcodeOrImei,
        unitPrice: it.unitPrice,
        costPrice: it.costPrice,
        quantity: it.quantity,
        itemDiscount: it.itemDiscount || 0,
        warrantyPeriod: it.warrantyPeriod || null,
        total: Math.max(0, (it.unitPrice * it.quantity) - (it.itemDiscount || 0))
      }));

      const createdInvoice = await window.tigerAPI.createInvoice(invoiceData as any, lineItems, tradeIn);
      addToast(`تم إتمام وحفظ الفاتورة رقم ${createdInvoice.invoiceNumber} بنجاح!`, 'success');
      clearCart();
      onConfirmSuccess(createdInvoice);
      onClose();
    } catch (err: any) {
      addToast(err.message || 'حدث خطأ أثناء حفظ الفاتورة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                إتمام الدفع والدفع المتعدد (Multi-Split Payment)
              </h3>
              <p className="text-[11px] text-slate-500">
                تسديد الفاتورة نقداً، فيزا، CliQ، مناصفة، أو جزء نقداً والمتبقي ذمة
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Due Banner */}
        <div className="my-3.5 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-200 dark:border-orange-800/60 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs text-orange-700 dark:text-orange-300 font-bold">المبلغ المطلوب سداده:</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              العميل: <b className="text-slate-900 dark:text-white">{customer?.name || quickName || customerName || 'زبون نقدي'}</b>
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-orange-600 dark:text-orange-400">
            {formatJOD(netTotal)}
          </div>
        </div>

        {/* 1. Full Payment Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button
            type="button"
            onClick={() => handleSelectFull('cash')}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
              paymentMethod === 'cash' && cashAmount === netTotal && cardAmount === 0 && cliqAmount === 0
                ? 'border-orange-500 bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span className="text-[11px]">نقداً بالكامل</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectFull('card')}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
              paymentMethod === 'card' && cardAmount === netTotal
                ? 'border-orange-500 bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-[11px]">فيزا / ماستر</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectFull('cliq')}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
              paymentMethod === 'cliq' && cliqAmount === netTotal
                ? 'border-orange-500 bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span className="text-[11px]">CliQ / تحويل</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectFull('credit')}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
              paymentMethod === 'credit'
                ? 'border-red-500 bg-red-600 text-white font-bold shadow-md shadow-red-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span className="text-[11px]">كامل المبلغ ذمة</span>
          </button>
        </div>

        {/* 2. Smart Quick-Split Presets Row */}
        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              أزرار التوزيع الذكي السريع بنقرة واحدة:
            </span>
            <span className="text-[10px] text-slate-400">تقسيم تلقائي فوري للمبلغ</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={handleSplitHalfCashCliq}
              className="bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200 transition text-center"
            >
              نصف كاش + نصف كليك
            </button>

            <button
              type="button"
              onClick={handleSplitHalfCashCard}
              className="bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200 transition text-center"
            >
              نصف كاش + نصف فيزا
            </button>

            <button
              type="button"
              onClick={handleSplitEqualThirds}
              className="bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200 transition text-center"
            >
              أثلاث (كاش + فيزا + كليك)
            </button>

            <button
              type="button"
              onClick={handleSplitHalfCardCliq}
              className="bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200 transition text-center"
            >
              نصف فيزا + نصف كليك
            </button>
          </div>
        </div>

        {/* 3. Detailed Input Boxes with Auto-Fill (+ الباقي) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-3 mb-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Split className="w-3.5 h-3.5 text-orange-500" />
              توزيع المبالغ يدوياً (أو اضغط "+ الباقي" لتعبئة التلقائي):
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Cash Input */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                <span className="font-semibold">نقداً (Cash):</span>
                <button
                  type="button"
                  onClick={autoFillCash}
                  className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 hover:text-orange-600 px-1.5 py-0.2 rounded font-bold"
                >
                  + الباقي
                </button>
              </div>
              <input
                type="number"
                step="0.001"
                min="0"
                value={cashAmount}
                onChange={(e) => {
                  setPaymentMethod('split');
                  setCashAmount(Number(e.target.value) || 0);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Card Input */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                <span className="font-semibold">بطاقة (Card):</span>
                <button
                  type="button"
                  onClick={autoFillCard}
                  className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 hover:text-orange-600 px-1.5 py-0.2 rounded font-bold"
                >
                  + الباقي
                </button>
              </div>
              <input
                type="number"
                step="0.001"
                min="0"
                value={cardAmount}
                onChange={(e) => {
                  setPaymentMethod('split');
                  setCardAmount(Number(e.target.value) || 0);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* CliQ Input */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                <span className="font-semibold">كليك (CliQ):</span>
                <button
                  type="button"
                  onClick={autoFillCliq}
                  className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 hover:text-orange-600 px-1.5 py-0.2 rounded font-bold"
                >
                  + الباقي
                </button>
              </div>
              <input
                type="number"
                step="0.001"
                min="0"
                value={cliqAmount}
                onChange={(e) => {
                  setPaymentMethod('split');
                  setCliqAmount(Number(e.target.value) || 0);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Balance summary */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              إجمالي المدفوع حالياً: <strong className="text-slate-900 dark:text-white font-mono">{formatJOD(totalPaid)}</strong>
            </span>
            {remaining > 0 ? (
              <span className="text-red-500 font-bold font-mono">
                المتبقي كذمة: {formatJOD(remaining)}
              </span>
            ) : changeDue > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                الباقي للعميل (كاش): {formatJOD(changeDue)}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                المبلغ مسدد بالكامل
              </span>
            )}
          </div>
        </div>

        {/* 4. Partial Payment / Debt Management Section (حل مشكلة "جزء وجزء بعدين") */}
        {(remaining > 0 || paymentMethod === 'credit') && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-3.5 mb-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>
                  تسجيل المبلغ المتبقي ({formatJOD(remaining > 0 ? remaining : netTotal)}) كذمة على العميل:
                </span>
              </div>

              {/* Toggle: Quick Customer vs Existing */}
              <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-lg text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                <button
                  type="button"
                  onClick={() => setCustomerMode('quick_new')}
                  className={`px-2 py-0.5 rounded-md transition ${customerMode === 'quick_new' ? 'bg-orange-500 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  تسجيل سريع
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  className={`px-2 py-0.5 rounded-md transition ${customerMode === 'existing' ? 'bg-orange-500 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  عميل مسجل
                </button>
              </div>
            </div>

            {customerMode === 'quick_new' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    اسم العميل (المدين): *
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: أحمد الزعبي"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    رقم الهاتف (للتواصل والواتساب):
                  </label>
                  <input
                    type="text"
                    placeholder="079xxxxxxx"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    موعد السداد المتوقع:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: اليوم مساءً / غداً"
                    value={dueDateNote}
                    onChange={(e) => setDueDateNote(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    اختر العميل المسجل مسبقاً:
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      const f = existingCustomers.find(c => c.id === e.target.value);
                      if (f) {
                        setQuickName(f.name);
                        setQuickPhone(f.phone || '');
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">-- اختر من قائمة العملاء المسجلين --</option>
                    {existingCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} - الرصيد الحالي: {formatJOD(c.balance || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    موعد السداد المتوقع:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: نهاية الشهر / الأحد القادم"
                    value={dueDateNote}
                    onChange={(e) => setDueDateNote(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
            <p className="text-[10px] text-amber-700 dark:text-amber-400">
              * سيتم توثيق الذمة المتبقية تلقائياً في حساب العميل وستظهر في تقرير الذمم والمستحقات دون أي تعقيد.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition active:scale-[0.98] disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'جاري حفظ الفاتورة وتوثيق العملية...' : 'تأكيد العملية وحفظ الفاتورة'}
          </button>
        </div>
      </div>
    </div>
  );
};
