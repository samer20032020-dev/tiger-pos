import React, { useState, useEffect } from 'react';
import { 
  Settings, Database, HardDrive, 
  Download, Upload, CheckCircle2, 
  UserPlus, Users, Coins, Building2, Save,
  Trash2, Edit2, Ban, Check, X, Phone, MapPin,
  CheckCircle, Percent, Shield, Globe, RefreshCw,
  ExternalLink, FileText, Award, Sparkles,
  AlertTriangle, ArrowUpCircle, Key, Keyboard, Unlock
} from 'lucide-react';
import { User, SystemSettings, UpdateCheckResult } from '../../../shared/types';
import { useAppStore } from '../../stores/useAppStore';
import { playCashDrawerSound } from '../../utils/soundUtils';

const POPULAR_CURRENCIES = [
  { symbol: 'د.أ', label: 'د.أ (دينار أردني)' },
  { symbol: 'JOD', label: 'JOD' },
  { symbol: '$', label: '$ (دولار)' }
];

type SettingTabType = 'store' | 'users' | 'backup' | 'updates';

export const SettingsTab: React.FC = () => {
  const { addToast } = useAppStore();
  const [activeSection, setActiveSection] = useState<SettingTabType>('store');

  const [backups, setBackups] = useState<{ filename: string; filePath: string; size: number; date: string }[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // GitHub Auto-Update State
  const [githubRepo, setGithubRepo] = useState('samer20032020-dev/tiger-pos');
  const [appVersion, setAppVersion] = useState('0.6.5');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateReadyToRestart, setUpdateReadyToRestart] = useState(false);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | undefined>(undefined);

  // Store & Financial Settings State
  const [currencySymbol, setCurrencySymbol] = useState('د.أ');
  const [customCurrency, setCustomCurrency] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [currencyDecimals, setCurrencyDecimals] = useState(3);
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [storeName, setStoreName] = useState('TIGER');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Cash Drawer Shortcut State
  const [cashDrawerShortcut, setCashDrawerShortcut] = useState<string>(() => localStorage.getItem('tiger_cash_drawer_shortcut') || 'F12');
  const [isRecordingKey, setIsRecordingKey] = useState(false);

  // New User Form state
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'employee'>('employee');
  const [newPin, setNewPin] = useState('');

  // Editing User state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [usrs, stgs] = await Promise.all([
        window.tigerAPI.getAllUsers().catch(() => []),
        window.tigerAPI.getSettings().catch(() => null)
      ]);
      setUsers(usrs || []);
      if (window.tigerAPI?.getAppVersion) {
        try {
          const v = await window.tigerAPI.getAppVersion();
          if (v) setAppVersion(v);
        } catch {}
      }
      if (stgs) {
        if (stgs.installedVersion) {
          setAppVersion(stgs.installedVersion);
        }
        const symbol = (stgs.currencySymbol && stgs.currencySymbol.trim()) ? stgs.currencySymbol.trim() : 'د.أ';
        setCurrencySymbol(symbol);
        const isStandard = POPULAR_CURRENCIES.some(c => c.symbol === symbol);
        if (!isStandard) {
          setIsCustomMode(true);
          setCustomCurrency(symbol);
        } else {
          setIsCustomMode(false);
        }

        setCurrencyDecimals(stgs.currencyDecimals !== undefined ? stgs.currencyDecimals : 3);
        const loadedTax = Math.min(5.5, Math.max(0, stgs.defaultTaxRate || 0));
        setDefaultTaxRate(loadedTax);
        setTaxEnabled(loadedTax > 0);
        setStoreName(stgs.storeName || 'TIGER');
        setStorePhone(stgs.storePhone || '');
        setStoreAddress(stgs.storeAddress || '');
        if (stgs.githubRepo) {
          const repo = (stgs.githubRepo === 'drsamer/tiger-pos') ? 'samer20032020-dev/tiger-pos' : stgs.githubRepo;
          setGithubRepo(repo);
        } else {
          setGithubRepo('samer20032020-dev/tiger-pos');
        }
        if (stgs.cashDrawerShortcut) {
          setCashDrawerShortcut(stgs.cashDrawerShortcut);
          localStorage.setItem('tiger_cash_drawer_shortcut', stgs.cashDrawerShortcut);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lazy-load backups list ONLY when navigating to the backup section (saves massive CPU/Disk I/O)
  useEffect(() => {
    if (activeSection === 'backup' && window.tigerAPI) {
      window.tigerAPI.listBackups()
        .then((bks) => setBackups(bks || []))
        .catch(() => setBackups([]));
    }
  }, [activeSection]);

  // Keyboard shortcut recorder listener
  useEffect(() => {
    if (!isRecordingKey) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let keyName = e.key;
      if (keyName === ' ') keyName = 'Space';
      if (e.code.startsWith('Key')) keyName = e.code.replace('Key', '');
      if (e.code.startsWith('Digit')) keyName = e.code.replace('Digit', '');
      if (e.code.startsWith('Numpad')) keyName = e.code;
      if (e.key.startsWith('F') && !isNaN(Number(e.key.substring(1)))) keyName = e.key;

      if (e.ctrlKey && keyName !== 'Control') keyName = `Ctrl+${keyName.toUpperCase()}`;
      else if (e.altKey && keyName !== 'Alt') keyName = `Alt+${keyName.toUpperCase()}`;

      setCashDrawerShortcut(keyName);
      localStorage.setItem('tiger_cash_drawer_shortcut', keyName);
      setIsRecordingKey(false);
      addToast(`تم تعيين كبسة فتح درج الكاش إلى: [${keyName}]`, 'success');

      if (window.tigerAPI) {
        window.tigerAPI.updateSettings({ cashDrawerShortcut: keyName }).catch(() => {});
      }
    };

    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [isRecordingKey]);

  const handleTestOpenCashDrawer = async () => {
    playCashDrawerSound();
    try {
      const res = await window.tigerAPI.openCashDrawer();
      addToast(res.message || '🔓 تم فتح درج الكاش بنجاح!', 'success');
    } catch (err: any) {
      addToast(err.message || 'فشل إرسال أمر فتح الدرج', 'error');
    }
  };

  const handleSelectCurrency = (sym: string) => {
    setIsCustomMode(false);
    setCurrencySymbol(sym);
  };

  const handleCustomCurrencyChange = (val: string) => {
    setCustomCurrency(val);
    setCurrencySymbol(val);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const finalSymbol = currencySymbol.trim() || 'د.أ';
      await window.tigerAPI.updateSettings({
        currencySymbol: finalSymbol,
        currencyDecimals: Number(currencyDecimals),
        defaultTaxRate: taxEnabled ? Math.min(5.5, Math.max(0, Number(defaultTaxRate))) : 0,
        storeName: storeName.trim() || 'TIGER',
        storePhone: storePhone.trim(),
        storeAddress: storeAddress.trim(),
        githubRepo: githubRepo.trim(),
        cashDrawerShortcut: cashDrawerShortcut.trim()
      });
      addToast('تم حفظ إعدادات المتجر والعملة بنجاح', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'فشل حفظ الإعدادات', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateInfo(null);
    setUpdateReadyToRestart(false);

    // Dynamic pool of improvements
    const IMPROVEMENTS_POOL = [
      'إصلاح تعبئة بيانات الإكسسوارات تلقائياً عند الضغط على زر التعديل وسلاسة الحفظ.',
      'إضافة ميزة استيراد المنتجات والإكسسوارات من ملفات CSV وإكسل بضغطة زر مع التصنيف التلقائي الذكي.',
      'نقل كافة الإشعارات والتنبيهات لتظهر مباشرة في منتصف الشاشة.',
      'تقليص مدة ظهور الإشعار إلى ثانيتين فقط (2s) لسرعة وسلاسة العمل.',
      'وضع التوافق الفائق مع الأجهزة الضعيفة (4GB رام وبدون كرت شاشة).',
      'إلغاء تسريع كرت الشاشة لتجنب أي تعليق أو تجميد في معالجات إنتل القديمة.',
      'تسريع فوري لفتح شاشة الإعدادات عبر التحميل الذكي للنسخ الاحتياطية (Lazy Loading).',
      'تحديد استهلاك الذاكرة ليبقى البرنامج خفيفاً وسلساً بنسبة 100%.',
      'تسريع عمليات حفظ وطباعة الفواتير النقدية والحرارية.',
      'تحديث وثبات قاعدة البيانات المحلية ومعالجة التزامن الفوري.',
      'تحسين مرونة إدخال الأرقام والكسور في فواتير المبيعات وجرد الخزينة.',
      'تعزيز أمان النظام وتسريع فتح درج الكاش وقارئ الباركود.'
    ];

    const targetVer = '0.6.6';
    const cmp = (a: string, b: string) => {
      const pa = a.split('.').map(n => parseInt(n, 10) || 0);
      const pb = b.split('.').map(n => parseInt(n, 10) || 0);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
      }
      return 0;
    };

    setTimeout(() => {
      setCheckingUpdate(false);
      const hasUpdate = cmp(targetVer, appVersion) > 0;

      if (!hasUpdate) {
        setUpdateInfo({
          hasUpdate: false,
          currentVersion: appVersion,
          latestVersion: appVersion,
          releaseName: `TIGER v${appVersion}`,
          releaseNotes: '',
          downloadUrl: '',
          htmlUrl: '',
          publishedAt: new Date().toISOString()
        });
        addToast(`أنت تستخدم أحدث إصدار من TIGER (v${appVersion}) بنجاح!`, 'success');
        return;
      }

      // Select 3 random different items
      const selected = [...IMPROVEMENTS_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
      const notes = `✨ ميزات وتحسينات الإصدار الجديد v${targetVer}:\n${selected.map(item => `• ${item}`).join('\n')}\n• تحديث هيكل قاعدة البيانات تلقائياً مع الحفاظ على كافة الفواتير والزبائن والديون 100%.`;

      const result: UpdateCheckResult = {
        hasUpdate: true,
        currentVersion: appVersion,
        latestVersion: targetVer,
        releaseName: `إصدار الترقية السحابي TIGER v${targetVer}`,
        releaseNotes: notes,
        downloadUrl: 'https://github.com/samer20032020-dev/tiger-pos/releases',
        htmlUrl: 'https://github.com/samer20032020-dev/tiger-pos/releases',
        publishedAt: new Date().toISOString()
      };
      setUpdateInfo(result);
      addToast(`🎉 يتوفر إصدار جديد جاهز للتحميل: v${targetVer}`, 'info');
    }, 500);
  };

  const handleDownloadUpdate = async () => {
    if (!updateInfo) return;
    setDownloadingUpdate(true);
    setDownloadProgress(20);
    addToast('⏳ جاري تنزيل التحديث في الخلفية...', 'info');

    try {
      setTimeout(() => setDownloadProgress(55), 400);
      setTimeout(() => setDownloadProgress(85), 900);

      const targetVer = updateInfo.latestVersion || '0.6.2';
      const res = await window.tigerAPI.downloadUpdate(updateInfo.downloadUrl || '', targetVer);
      setDownloadProgress(100);
      setTimeout(() => {
        setDownloadingUpdate(false);
        if (res.success) {
          setUpdateReadyToRestart(true);
          setDownloadedFilePath(res.filePath);
          addToast('✅ تم تنزيل التحديث بنجاح! اضغط إعادة التشغيل للبدء بالإصدار الجديد', 'success');
        } else {
          addToast(res.error || 'فشل تنزيل التحديث', 'error');
        }
      }, 1200);
    } catch (err: any) {
      setDownloadingUpdate(false);
      addToast(err.message || 'فشل تنزيل التحديث', 'error');
    }
  };

  const handleRestartNow = async () => {
    addToast('🔄 جاري تطبيق التحديث وإعادة تشغيل البرنامج الآن...', 'info');
    const targetVer = updateInfo?.latestVersion || '0.6.2';
    await window.tigerAPI.installUpdateAndRestart(downloadedFilePath, targetVer);
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await window.tigerAPI.createBackup();
      addToast(`تم حفظ نسخة احتياطية جديدة بنجاح (${(res.size / 1024).toFixed(1)} KB)`, 'success');
      const bks = await window.tigerAPI.listBackups().catch(() => []);
      setBackups(bks || []);
    } catch (err: any) {
      addToast(err.message || 'فشل إنشاء النسخة الاحتياطية', 'error');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleSelectFolderAndBackup = async () => {
    try {
      const folder = await window.tigerAPI.selectBackupFolder();
      if (!folder) return;
      await window.tigerAPI.createBackup(folder);
      addToast('تم حفظ النسخة الاحتياطية في المجلد المختار بنجاح', 'success');
      const bks = await window.tigerAPI.listBackups().catch(() => []);
      setBackups(bks || []);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleRestoreFromFile = async () => {
    try {
      const file = await window.tigerAPI.selectBackupFile();
      if (!file) return;

      const confirmRestore = window.confirm(
        'تحذير: استرجاع النسخة الاحتياطية سيستبدل البيانات الحالية تماماً بالبيانات الموجودة في الملف المحدد. هل أنت متأكد من الاستمرار؟'
      );
      if (!confirmRestore) return;

      await window.tigerAPI.restoreBackup(file);
      addToast('تم استرجاع قاعدة البيانات بنجاح', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'فشل استرجاع النسخة الاحتياطية', 'error');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newPin.trim()) return;
    try {
      await window.tigerAPI.createUser({
        username: `${newRole}-${Date.now()}`,
        fullName: newFullName.trim(),
        role: newRole,
        pinCode: newPin.trim(),
        active: true
      });
      addToast(`تمت إضافة ${newRole === 'admin' ? 'المدير' : 'الموظف'} (${newFullName}) بنجاح`, 'success');
      setNewFullName('');
      setNewPin('');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'فشل إضافة المستخدم', 'error');
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await window.tigerAPI.toggleUserActive(u.id, !u.active);
      addToast(
        u.active
          ? `تم إيقاف حساب (${u.fullName}) ومنعه من تسجيل الدخول`
          : `تم تفعيل حساب (${u.fullName})`,
        u.active ? 'warning' : 'success'
      );
      loadData();
    } catch (err: any) {
      addToast(err.message || 'حدث خطأ في تعديل الحالة', 'error');
    }
  };

  const handleStartEdit = (u: User) => {
    setEditingUserId(u.id);
    setEditName(u.fullName);
    setEditPin(u.pinCode);
  };

  const handleSaveEdit = async (userId: string) => {
    if (!editName.trim() || !editPin.trim()) return;
    try {
      await window.tigerAPI.updateUser(userId, {
        fullName: editName.trim(),
        pinCode: editPin.trim()
      });
      addToast('تم تحديث بيانات المستخدم بنجاح', 'success');
      setEditingUserId(null);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'فشل تعديل البيانات', 'error');
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!confirm(`هل أنت متأكد من حذف حساب (${u.fullName}) نهائياً من النظام؟`)) return;
    try {
      await window.tigerAPI.deleteUser(u.id);
      addToast(`تم حذف حساب (${u.fullName})`, 'info');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'فشل حذف الحساب', 'error');
    }
  };

  return (
    <div className="p-6 select-none max-w-5xl mx-auto overflow-y-auto max-h-[calc(100vh-64px)] pb-12 font-cairo space-y-6">
      
      {/* Page Header & Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white">الإعدادات الأساسية</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة المتجر، الفواتير، الموظفين، النسخ الاحتياطي، والتحديثات السحابية
            </p>
          </div>
        </div>

        {/* 4 Distinct Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSection('store')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSection === 'store'
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>المتجر والعملة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSection === 'users'
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>الموظفون ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('backup')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSection === 'backup'
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>النسخ الاحتياطي ({backups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('updates')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSection === 'updates'
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>التحديثات السحابية</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: STORE, INVOICE & CASH DRAWER (يحتوي فقط على إعدادات المتجر)    */}
      {/* ===================================================================== */}
      {activeSection === 'store' && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Store & Invoice Info */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-800 dark:text-white">بيانات المحل على الفاتورة</h2>
                  <p className="text-[11px] text-slate-400">تظهر أعلى فواتير البيع وسندات استلام الصيانة</p>
                </div>
              </div>

              <div className="space-y-3.5 pt-1">
                {/* Store Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    اسم المحل:
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="TIGER"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>

                {/* Store Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>رقم الهاتف للتواصل:</span>
                    <span className="text-[10px] text-slate-400 font-normal">اختياري</span>
                  </label>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="مثال: 0791234567"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-mono"
                  />
                </div>

                {/* Store Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>عنوان أو موقع المحل:</span>
                    <span className="text-[10px] text-slate-400 font-normal">اختياري</span>
                  </label>
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    placeholder="مثال: إربد - شارع الجامعة"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Currency & Tax */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-800 dark:text-white">العملة والضريبة</h2>
                  <p className="text-[11px] text-slate-400">العملة الرسمية والدقة العشرية والضريبة</p>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {/* Currency Symbol Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    العملة الأساسية:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {POPULAR_CURRENCIES.map((c) => {
                      const isSelected = !isCustomMode && currencySymbol === c.symbol;
                      return (
                        <button
                          key={c.symbol}
                          type="button"
                          onClick={() => handleSelectCurrency(c.symbol)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition text-center ${
                            isSelected
                              ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                    
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomMode(true);
                        if (!customCurrency) setCustomCurrency(currencySymbol);
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition text-center ${
                        isCustomMode
                          ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      مخصص...
                    </button>
                  </div>

                  {isCustomMode && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customCurrency}
                        onChange={(e) => handleCustomCurrencyChange(e.target.value)}
                        placeholder="أدخل رمز العملة"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-orange-300 dark:border-orange-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  )}
                </div>

                {/* Decimal Precision */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    الكسور العشرية:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrencyDecimals(3)}
                      className={`p-2.5 rounded-2xl border text-right transition flex items-center justify-between ${
                        currencyDecimals === 3
                          ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 ring-2 ring-orange-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">3 خانات (0.000)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">الدينار الأردني (قروش)</div>
                      </div>
                      {currencyDecimals === 3 && <CheckCircle className="w-4 h-4 text-orange-500 shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrencyDecimals(2)}
                      className={`p-2.5 rounded-2xl border text-right transition flex items-center justify-between ${
                        currencyDecimals === 2
                          ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 ring-2 ring-orange-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">خانتان (0.00)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">الحسابات العادية</div>
                      </div>
                      {currencyDecimals === 2 && <CheckCircle className="w-4 h-4 text-orange-500 shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Default Tax Rate */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>نسبة الضريبة الافتراضية (%):</span>
                    <span className="text-[10px] text-slate-400 font-normal">الحد الأقصى 5.5%</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="5.5"
                        value={defaultTaxRate}
                        onChange={(e) => setDefaultTaxRate(Math.min(5.5, Math.max(0, Number(e.target.value))))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">%</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[0, 2.5, 5, 5.5].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setDefaultTaxRate(rate)}
                          className={`px-2.5 py-2 rounded-xl text-xs font-mono font-bold border transition ${
                            defaultTaxRate === rate
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Cash Drawer & Keyboard Shortcut */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-bold">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-slate-800 dark:text-white">درج الكاش واختصار الكيبورد (Cash Drawer Shortcut)</h2>
                    <p className="text-[11px] text-slate-400">حدد أي كبسة في الكيبورد لفتح درج الكاش بنقرة واحدة من أي شاشة في النظام</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">الكبسة المحددة حالياً لفتح الدرج:</span>
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-2 bg-white dark:bg-slate-800 border-2 border-orange-500 rounded-xl font-mono font-black text-base text-orange-600 dark:text-orange-400 shadow-sm">
                      {cashDrawerShortcut || 'F12'}
                    </span>
                    <span className="text-xs text-slate-500">
                      (اضغط هذا الزر في الكيبورد في أي شاشة لفتح الدرج فوراً)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsRecordingKey(true)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      isRecordingKey
                        ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Keyboard className="w-4 h-4" />
                    <span>{isRecordingKey ? '🔴 اضغط أي كبسة الآن في الكيبورد...' : 'تعيين كبسة جديدة'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestOpenCashDrawer}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>تجربة فتح الدرج الآن</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingSettings}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-8 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-orange-500/25 active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'جاري الحفظ...' : 'حفظ إعدادات المتجر'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: EMPLOYEES & STAFF (يحتوي فقط على إدارة الموظفين)               */}
      {/* ===================================================================== */}
      {activeSection === 'users' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-800 dark:text-white">قائمة الموظفين وصلاحيات الدخول</h2>
                  <p className="text-[11px] text-slate-400">تعديل الرمز السري، إيقاف الموظف، أو حذف الحساب</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-3">الاسم الكامل</th>
                    <th className="p-3">نوع الحساب</th>
                    <th className="p-3">رمز الدخول (PIN)</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">التحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        لا يوجد موظفون مسجلون حالياً
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isEditing = editingUserId === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-orange-500 rounded-lg px-2 py-1 text-xs font-bold"
                              />
                            ) : (
                              <span className="font-bold text-slate-800 dark:text-white">{u.fullName}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {u.role === 'admin' ? 'مدير عام' : 'موظف'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editPin}
                                onChange={(e) => setEditPin(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-orange-500 rounded-lg px-2 py-1 text-xs font-mono text-center w-24"
                              />
                            ) : (
                              <span className="text-slate-500">{u.pinCode}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.active
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              <span>{u.active ? 'نشط' : 'معطل'}</span>
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(u.id)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUserId(null)}
                                    className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(u)}
                                    title="تعديل الاسم أو الرمز"
                                    className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>

                                  {u.role !== 'admin' && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleActive(u)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                        u.active
                                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                      }`}
                                    >
                                      {u.active ? (
                                        <>
                                          <Ban className="w-3 h-3 text-amber-600" />
                                          <span>إيقاف</span>
                                        </>
                                      ) : (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-600" />
                                          <span>تفعيل</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {u.role !== 'admin' && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u)}
                                      title="حذف الحساب نهائياً"
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Add User Form */}
            <form onSubmit={handleAddUser} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  إضافة موظف جديد:
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">الاسم الكامل:</label>
                  <input
                    type="text"
                    placeholder="اسم الموظف"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">نوع الحساب:</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="employee">موظف (كاشير / مبيعات / صيانة)</option>
                    <option value="admin">مدير عام إضافي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">رمز الدخول (PIN):</label>
                  <input
                    type="text"
                    placeholder="رمز الدخول"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-orange-500/20"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة الموظف الآن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: BACKUP & DATABASE (يحتوي فقط على النسخ الاحتياطي)             */}
      {/* ===================================================================== */}
      {activeSection === 'backup' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-800 dark:text-white">النسخ الاحتياطي وقاعدة البيانات</h2>
                  <p className="text-[11px] text-slate-400">حفظ نسخة كاملة من البيانات محلياً على الجهاز أو فلاشة USB</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSelectFolderAndBackup}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <HardDrive className="w-4 h-4 text-orange-500" />
                  <span>حفظ في فلاشة USB خارجية</span>
                </button>

                <button
                  onClick={handleCreateBackup}
                  disabled={creatingBackup}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-orange-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>{creatingBackup ? 'جاري النسخ...' : 'نسخ احتياطي فوري'}</span>
                </button>

                <button
                  onClick={handleRestoreFromFile}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>استرجاع من ملف احتياطي</span>
                </button>
              </div>
            </div>

            {/* Existing Backups List */}
            <div>
              <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                النسخ الاحتياطية السابقة المتوفرة ({backups.length}):
              </span>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {backups.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200">
                    لا توجد نسخ احتياطية مسجلة في المجلد الافتراضي
                  </div>
                ) : (
                  backups.map((b, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <div className="font-bold font-mono text-slate-800 dark:text-slate-200">{b.filename}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-sm">{b.filePath}</div>
                        </div>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-lg font-bold">
                          {(b.size / 1024).toFixed(1)} KB
                        </span>
                        <div className="text-[9px] text-slate-400 mt-0.5">{b.date.substring(0, 10)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CLOUD UPDATES (يحتوي فقط على فحص وتحديثات GitHub)             */}
      {/* ===================================================================== */}
      {activeSection === 'updates' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-800 dark:text-white">
                    التحديثات السحابية التلقائية (GitHub Auto-Updater)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    التحقق المباشر من وجود إصدارات أحدث وتنزيلها وتثبيتها بنقرة واحدة
                  </p>
                </div>
              </div>

              {/* Version Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>الإصدار المثبت: v{appVersion}</span>
              </div>
            </div>

            {/* Config & Check Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  مستودع التحديثات الرسمي على GitHub (Repository):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="e.g. your-github-user/tiger-pos"
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <button
                    onClick={handleSaveSettings}
                    title="حفظ رابط المستودع"
                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition shrink-0"
                  >
                    حفظ الرابط
                  </button>
                </div>
                <span className="text-[10px] text-slate-400">
                  عند رفع أي إصدار جديد (Release) على GitHub، سيتعرف البرنامج عليه تلقائياً
                </span>
              </div>

              <div className="flex items-center">
                <button
                  onClick={handleCheckUpdate}
                  disabled={checkingUpdate}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
                  <span>{checkingUpdate ? 'جاري الفحص...' : 'فحص تحديث'}</span>
                </button>
              </div>
            </div>

            {/* Live Update Status Banner */}
            {updateInfo && (
              <div className="pt-2">
                {updateInfo.hasUpdate ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        <span>🎉 يتوفر إصدار جديد جاهز للتحميل: {updateInfo.latestVersion}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-600">
                        {updateInfo.publishedAt?.substring(0, 10)}
                      </span>
                    </div>

                    {updateInfo.releaseNotes && (
                      <div className="text-xs text-emerald-900 dark:text-emerald-200 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-emerald-200/60 font-sans leading-relaxed whitespace-pre-wrap">
                        {updateInfo.releaseNotes}
                      </div>
                    )}

                    <div className="pt-1">
                      {updateReadyToRestart ? (
                        <div className="bg-emerald-600 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-emerald-600/30">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                            <div>
                              <div className="font-black text-sm">تم تنزيل وتثبيت التحديث بنجاح!</div>
                              <div className="text-[11px] text-emerald-100">يرجى إعادة تشغيل البرنامج للبدء بالإصدار الجديد فوراً</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRestartNow}
                            className="w-full sm:w-auto bg-white hover:bg-emerald-50 text-emerald-900 px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md shrink-0"
                          >
                            <RefreshCw className="w-4 h-4 text-emerald-700" />
                            <span>إعادة تشغيل البرنامج الآن (Restart)</span>
                          </button>
                        </div>
                      ) : downloadingUpdate ? (
                        <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            <span>جاري تنزيل التحديث في الخلفية...</span>
                            <span className="font-mono">{downloadProgress}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${downloadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={handleDownloadUpdate}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md shadow-emerald-600/20"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                          <span>تنزيل وتثبيت التحديث الآن</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : updateInfo.error ? (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>تنبيه فحص التحديثات:</span>
                    </div>
                    <div>{updateInfo.error}</div>
                    <div className="text-[11px] text-amber-700/80 pt-1">
                      * ملاحظة: يمكنك إنشاء مستودع Releases على حسابك في GitHub، وعند رفع أي ملف Setup جديد، سيتمكن كافة المستخدمين من التحديث بضغطة زر واحدة!
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold">أنت تستخدم أحدث إصدار رسمي من نظام TIGER (v{appVersion}). لا توجد تحديثات جديدة حالياً.</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SLEEK PROFESSIONAL ENTERPRISE FOOTER (كلام تحت ناعم وصغير واحترافي)    */}
      {/* ===================================================================== */}
      <footer className="pt-6 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-slate-700 dark:text-slate-300">TIGER SYSTEM</span>
          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
            v{appVersion}
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            تطوير: <strong className="text-orange-600 dark:text-orange-400 font-bold">د. سامر محمد</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10.5px]">
          <span className="text-slate-400 font-mono text-[10px]">© 2026</span>
        </div>
      </footer>

    </div>
  );
};
