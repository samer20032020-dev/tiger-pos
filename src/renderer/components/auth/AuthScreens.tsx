import React, { useState, useEffect } from 'react';
import { ShieldCheck, User as UserIcon, Lock, Eye, EyeOff, AlertCircle, Check, UserPlus } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { User } from '../../../shared/types';
import { TIGER_LOGO } from '../../assets/logoData';

export const AuthScreen: React.FC = () => {
  const { setCurrentUser, setScreen, addToast } = useAppStore();

  const [selectedRole, setSelectedRole] = useState<'admin' | 'employee'>('employee');
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [isAddingNewEmp, setIsAddingNewEmp] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form states for login
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Form states for registration
  const [registerName, setRegisterName] = useState('');
  const [registerPin, setRegisterPin] = useState('');
  const [registerPinConfirm, setRegisterPinConfirm] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load existing users from DB
  const loadUsers = async () => {
    if (!window.tigerAPI) return;
    try {
      const all = await window.tigerAPI.getAllUsers();
      const admin = all.find((u) => u.role === 'admin' && u.active) || null;
      // Only active employees appear for login
      const emps = all.filter((u) => u.role === 'employee' && u.active);
      setAdminUser(admin);
      setEmployees(emps);
      if (emps.length > 0) {
        setSelectedEmpId(emps[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSelectRole = (role: 'admin' | 'employee') => {
    setSelectedRole(role);
    setIsAddingNewEmp(false);
    setPin('');
    setRegisterName('');
    setRegisterPin('');
    setRegisterPinConfirm('');
    setError('');
  };

  // Determine which user is currently active for login
  const currentEmployee = employees.find((e) => e.id === selectedEmpId) || null;
  const currentTargetUser = selectedRole === 'admin' ? adminUser : currentEmployee;

  const isRegistrationMode =
    selectedRole === 'admin'
      ? !adminUser
      : employees.length === 0 || isAddingNewEmp;

  // Handle Login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (!pin) {
      setError('يرجى إدخال رمز الدخول');
      return;
    }
    setSubmitting(true);
    try {
      const user = await window.tigerAPI.getUserByPin(pin);
      if (!user || user.id !== currentTargetUser?.id) {
        setError('رمز الدخول غير صحيح');
        setPin('');
        return;
      }
      setCurrentUser(user);
      setScreen('app');
      addToast(`مرحباً ${user.fullName} 👋`, 'success');
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ في تسجيل الدخول');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Register (Admin or New Employee)
  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (!registerName.trim()) {
      setError('يرجى إدخال الاسم');
      return;
    }
    if (registerPin.length < 4) {
      setError('رمز الدخول يجب أن يتكون من 4 أرقام أو أكثر');
      return;
    }
    if (registerPin !== registerPinConfirm) {
      setError('تأكيد رمز الدخول غير متطابق');
      return;
    }

    setSubmitting(true);
    try {
      const newUser = await window.tigerAPI.createUser({
        username: `${selectedRole}-${Date.now()}`,
        fullName: registerName.trim(),
        role: selectedRole,
        pinCode: registerPin,
        active: true,
      });

      if (selectedRole === 'admin') {
        setAdminUser(newUser);
      } else {
        const updated = [...employees, newUser];
        setEmployees(updated);
        setSelectedEmpId(newUser.id);
        setIsAddingNewEmp(false);
      }

      setCurrentUser(newUser);
      setScreen('app');
      addToast(`تم حفظ حساب ${newUser.fullName} بنجاح`, 'success');
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ الحساب');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUsers) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-cairo">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 select-none font-cairo">
      <div className="w-full max-w-md">
        {/* Brand Header with Store Logo */}
        <div className="text-center mb-6">
          <img
            src={TIGER_LOGO}
            alt="TIGER MOBILE"
            className="w-36 h-36 object-contain mx-auto drop-shadow-md"
          />
        </div>

        {/* Main Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100">
          <div className="text-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              اختر نوع الحساب للمتابعة
            </span>
          </div>

          {/* TWO MAIN OPTIONS: موظف / مدير */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* 1. موظف */}
            <button
              type="button"
              onClick={() => handleSelectRole('employee')}
              className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 relative ${
                selectedRole === 'employee'
                  ? 'border-orange-500 bg-orange-50/60 shadow-sm ring-2 ring-orange-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-600'
              }`}
            >
              {selectedRole === 'employee' && (
                <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  selectedRole === 'employee' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <div className={`font-black text-sm ${selectedRole === 'employee' ? 'text-orange-700' : 'text-slate-700'}`}>
                  موظف
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[130px]">
                  {employees.length === 0
                    ? 'غير مسجل بعد'
                    : employees.length === 1
                    ? employees[0].fullName
                    : `${employees.length} موظفين`}
                </div>
              </div>
            </button>

            {/* 2. مدير */}
            <button
              type="button"
              onClick={() => handleSelectRole('admin')}
              className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 relative ${
                selectedRole === 'admin'
                  ? 'border-orange-500 bg-orange-50/60 shadow-sm ring-2 ring-orange-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-600'
              }`}
            >
              {selectedRole === 'admin' && (
                <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  selectedRole === 'admin' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className={`font-black text-sm ${selectedRole === 'admin' ? 'text-orange-700' : 'text-slate-700'}`}>
                  مدير
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[130px]">
                  {adminUser ? adminUser.fullName : 'غير مسجل بعد'}
                </div>
              </div>
            </button>
          </div>

          {/* If Employee Role has multiple employees, show employee selector + Add button */}
          {selectedRole === 'employee' && employees.length > 0 && (
            <div className="mb-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-slate-500">اختر الموظف:</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewEmp(!isAddingNewEmp);
                    setPin('');
                    setError('');
                  }}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{isAddingNewEmp ? 'العودة للدخول' : '+ إضافة موظف جديد'}</span>
                </button>
              </div>

              {!isAddingNewEmp && (
                <div className="flex flex-wrap gap-1.5">
                  {employees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmpId(emp.id);
                        setPin('');
                        setError('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        selectedEmpId === emp.id
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {emp.fullName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC FORM */}
          {isRegistrationMode ? (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-amber-800 text-xs font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>
                  {selectedRole === 'admin'
                    ? 'تسجيل حساب المدير (يتم لمرة واحدة)'
                    : 'تسجيل موظف جديد في النظام'}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  اسم {selectedRole === 'admin' ? 'المدير' : 'الموظف'}
                </label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => {
                    setRegisterName(e.target.value);
                    setError('');
                  }}
                  placeholder=""
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  رمز الدخول (PIN / كلمة السر)
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={registerPin}
                    onChange={(e) => {
                      setRegisterPin(e.target.value);
                      setError('');
                    }}
                    placeholder=""
                    className="w-full border border-slate-200 rounded-xl pr-3.5 pl-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">تأكيد رمز الدخول</label>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={registerPinConfirm}
                  onChange={(e) => {
                    setRegisterPinConfirm(e.target.value);
                    setError('');
                  }}
                  placeholder=""
                  className="w-full border border-slate-200 rounded-xl pr-3.5 pl-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 font-mono tracking-widest"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2.5 rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm shadow-orange-500/20 mt-2"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ الحساب وبدء العمل ←'}
              </button>
            </form>
          ) : (
            /* Normal Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-medium">الحساب المحدد:</div>
                  <div className="text-sm font-bold text-slate-800">{currentTargetUser?.fullName}</div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700">
                  {selectedRole === 'admin' ? 'صلاحيات مدير' : 'صلاحيات موظف'}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">رمز الدخول (PIN)</label>
                <div className="relative">
                  <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setError('');
                    }}
                    placeholder=""
                    className="w-full border border-slate-200 rounded-xl pr-10 pl-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 font-mono tracking-widest text-center"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2.5 rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !pin}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm shadow-orange-500/20"
              >
                {submitting ? 'جاري التحقق...' : 'تسجيل الدخول ←'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
