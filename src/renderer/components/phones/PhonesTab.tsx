import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Plus, Search, Battery, History, 
  Printer, Tag, Filter, CheckCircle2, AlertCircle, 
  Trash2, ShieldCheck, Briefcase 
} from 'lucide-react';
import { Phone, PhoneStatus, PhoneCondition } from '../../../shared/types';
import { PHONE_BRANDS, formatJOD } from '../../../shared/constants';
import { PhoneModal } from './PhoneModal';
import { ImeiHistoryModal } from './ImeiHistoryModal';
import { BarcodeStickerModal } from '../common/BarcodeStickerModal';
import { DamagedItemModal } from '../common/DamagedItemModal';
import { useAppStore } from '../../stores/useAppStore';

export const PhonesTab: React.FC = () => {
  const { addToast, currentUser } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';
  const [phones, setPhones] = useState<Phone[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddOpen, setAddOpen] = useState(false);
  const [historyImei, setHistoryImei] = useState<{ imei: string; title: string } | null>(null);
  const [barcodePhone, setBarcodePhone] = useState<Phone | null>(null);
  const [damagedPhone, setDamagedPhone] = useState<Phone | null>(null);

  const loadPhones = async () => {
    setLoading(true);
    try {
      const data = await window.tigerAPI.getAllPhones();
      setPhones(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhones();
  }, []);

  const filtered = phones.filter(p => {
    const matchSearch = search === '' ||
      p.model.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.imei1.includes(search) ||
      (p.imei2 && p.imei2.includes(search));

    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchBrand = brandFilter === 'all' || p.brand === brandFilter;
    const matchCondition = conditionFilter === 'all' || p.condition === conditionFilter;

    return matchSearch && matchStatus && matchBrand && matchCondition;
  });

  const getStatusBadge = (status: PhoneStatus) => {
    switch (status) {
      case 'in_stock':
        return <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">بالمخزون</span>;
      case 'sold':
        return <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-bold">تم البيع</span>;
      case 'in_repair':
        return <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">في الصيانة</span>;
      case 'returned':
        return <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full text-[10px] font-bold">مرتجع</span>;
    }
  };

  return (
    <div className="p-6 space-y-4 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between select-none">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-orange-500" />
            مخزون الهواتف الذكية وتتبع الـ IMEI
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة كل جهاز كقطعة فريدة بـ IMEI منفصل، سعر مفرق وجملة، كفالة معتمدة، وسجل دورة حياة كامل
          </p>
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          إضافة هاتف جديد (F3)
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm select-none">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالموديل، الماركة، أو الـ IMEI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-semibold"
          >
            <option value="all">كل الحالات</option>
            <option value="in_stock">المتوفر بالمحل</option>
            <option value="sold">المباع</option>
            <option value="in_repair">تحت الصيانة</option>
            <option value="returned">المرتجع</option>
          </select>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-semibold"
          >
            <option value="all">كل الشركات</option>
            {PHONE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-semibold"
          >
            <option value="all">كل الحالات (جديد/مستعمل)</option>
            <option value="new">جديد كرتونة</option>
            <option value="used">مستعمل</option>
            <option value="refurbished">مجدد</option>
          </select>
        </div>
      </div>

      {/* Phones Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden select-none">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">الهاتف والموديل</th>
                <th className="p-3.5">المواصفات والضمان</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5">البطارية</th>
                <th className="p-3.5">IMEI 1</th>
                <th className="p-3.5">التكلفة</th>
                <th className="p-3.5">سعر المفرق</th>
                <th className="p-3.5">سعر الجملة</th>
                <th className="p-3.5">حالة المخزون</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    جاري تحميل الهواتف...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    لا توجد أجهزة مطابقة للبحث أو الفلتر
                  </td>
                </tr>
              ) : (
                filtered.map((phone) => (
                  <tr key={phone.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{phone.brand} {phone.model}</div>
                      <div className="text-[10px] text-slate-400">{phone.supplierName || 'شراء محلي'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {phone.storage} {phone.ram ? `| ${phone.ram}` : ''} | {phone.color}
                      </div>
                      {phone.warrantyPeriod && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3 h-3" />
                          {phone.warrantyPeriod}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {phone.condition === 'new' ? 'جديد وكالة' : phone.condition === 'used' ? 'مستعمل' : 'مجدد'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">
                      {phone.batteryHealth ? (
                        <span className={`flex items-center gap-1 font-bold ${
                          phone.batteryHealth >= 85 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                        }`}>
                          <Battery className="w-3.5 h-3.5" />
                          {phone.batteryHealth}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {phone.imei1}
                      {phone.imei2 && <div className="text-[10px] text-slate-400 font-normal">2: {phone.imei2}</div>}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {formatJOD(phone.costPrice)}
                    </td>
                    <td className="p-3.5 font-mono font-black text-orange-600 dark:text-orange-400">
                      {formatJOD(phone.sellingPrice)}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {formatJOD(phone.wholesalePrice || phone.sellingPrice)}
                    </td>
                    <td className="p-3.5">
                      {getStatusBadge(phone.status)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setBarcodePhone(phone)}
                          title="طباعة استيكر الباركود والـ IMEI"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setHistoryImei({ imei: phone.imei1, title: `${phone.brand} ${phone.model}` })}
                          title="عرض دورة حياة الجهاز وسجل الحركات"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {isAdmin && phone.status === 'in_stock' && (
                          <button
                            onClick={() => setDamagedPhone(phone)}
                            title="تسجيل جهاز تالف / شطب أو مرتجع للمورد"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <PhoneModal
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={loadPhones}
      />

      {historyImei && (
        <ImeiHistoryModal
          imei={historyImei.imei}
          phoneTitle={historyImei.title}
          isOpen={true}
          onClose={() => setHistoryImei(null)}
        />
      )}

      {barcodePhone && (
        <BarcodeStickerModal
          isOpen={true}
          onClose={() => setBarcodePhone(null)}
          title={`${barcodePhone.brand} ${barcodePhone.model}`}
          code={barcodePhone.imei1}
          price={barcodePhone.sellingPrice}
        />
      )}

      {damagedPhone && (
        <DamagedItemModal
          isOpen={true}
          onClose={() => setDamagedPhone(null)}
          onSuccess={loadPhones}
          itemType="phone"
          itemId={damagedPhone.id}
          name={`${damagedPhone.brand} ${damagedPhone.model}`}
          barcodeOrImei={damagedPhone.imei1}
          costPrice={damagedPhone.costPrice}
          availableQuantity={1}
        />
      )}
    </div>
  );
};
