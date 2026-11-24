export const REPAIR_PART_CATEGORIES = [
  'شاشات الصيانة',
  'بطاريات الصيانة',
  'باكات وظواهر',
  'جدلات وكونكترات شحن (UI)',
  'قطع غيار ومواد صيانة'
];

export const isRepairCategory = (category: string = '', name: string = ''): boolean => {
  const c = (category || '').trim().toLowerCase();
  const n = (name || '').trim().toLowerCase();

  // 1. Explicit exclusion: standard consumer accessories
  if (
    c.includes('حماية') ||
    c.includes('سكرين') ||
    c.includes('كفر') ||
    c.includes('جراب') ||
    c.includes('سماعة') ||
    c.includes('سماعات') ||
    c.includes('إيربود') ||
    c.includes('ايربود') ||
    c.includes('شواحن') ||
    c.includes('كيبل') ||
    c.includes('كوابل') ||
    c.includes('بنك طاقة') ||
    c.includes('حوامل') ||
    c.includes('سيارة') ||
    c.includes('محول') ||
    n.includes('حماية') ||
    n.includes('سكرين') ||
    n.includes('عدسة') ||
    n.includes('عدسات') ||
    n.includes('كفر') ||
    n.includes('جراب') ||
    n.includes('سماعة') ||
    n.includes('سماعات') ||
    n.includes('إيربود') ||
    n.includes('ايربود') ||
    n.includes('باور بانك') ||
    n.includes('بنك طاقة')
  ) {
    return false;
  }

  // 2. Direct match with standard repair part categories
  if (REPAIR_PART_CATEGORIES.some(rpc => rpc.toLowerCase() === c)) {
    return true;
  }

  // 3. Category keywords specific to internal maintenance/hardware
  if (
    c === 'شاشات الصيانة' ||
    c === 'بطاريات الصيانة' ||
    c === 'باكات وظواهر' ||
    c === 'جدلات وكونكترات شحن (ui)' ||
    c === 'قطع غيار ومواد صيانة' ||
    c.includes('قطع غيار') ||
    c.includes('مواد صيانة')
  ) {
    return true;
  }

  // 4. Specific internal repair part keywords
  return (
    c.includes('جدلات') ||
    c.includes('كونكتر') ||
    c.includes('هاوسنج') ||
    n.includes('هاوسنج') ||
    n.includes('فلكس') ||
    n.includes('كونكتر شحن') ||
    n.includes('اي سي') ||
    n.includes('ic ')
  );
};

export const ACCESSORY_CATEGORIES = [
  'شواحن وكوابل',
  'كفرات وحافظات',
  'شاشات حماية (سكرينات)',
  'سماعات وإيربودز',
  'بطاريات وبنك طاقة',
  'حوامل وسكسوارات سيارة',
  'محولات وتوصيلات',
  'أخرى'
];

export const PHONE_BRANDS = [
  'Apple iPhone',
  'Samsung',
  'Xiaomi',
  'Honor',
  'Huawei',
  'Realme',
  'Infinix',
  'Tecno',
  'Google Pixel',
  'Nokia',
  'OnePlus',
  'أخرى'
];

export const PHONE_STORAGE_OPTIONS = [
  '32GB',
  '64GB',
  '128GB',
  '256GB',
  '512GB',
  '1TB'
];

export const PHONE_RAM_OPTIONS = [
  '3GB',
  '4GB',
  '6GB',
  '8GB',
  '12GB',
  '16GB'
];

export const WARRANTY_OPTIONS = [
  'ضمان سنة وكيل رسمي',
  'ضمان فحص 7 أيام للمستعمل',
  'ضمان 30 يوم صيانة وقطع',
  'ضمان 6 شهور بطاريات وشواحن',
  'بدون ضمان (بناءً على طلب الزبون)'
];

export const EXPENSE_CATEGORIES = [
  { key: 'rent', label: 'إيجار المحل' },
  { key: 'electricity', label: 'كهرباء وإنترنت ومياه' },
  { key: 'salaries', label: 'رواتب وسلف موظفين' },
  { key: 'tools', label: 'معدات صيانة وأدوات' },
  { key: 'hospitality', label: 'ضيافة ومستلزمات عامة' },
  { key: 'write_off', label: 'خسائر وتوالف بضاعة تالفة' },
  { key: 'other', label: 'مصاريف نثرية أخرى' }
];

export const REPAIR_STATUS_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  received: { label: 'تم الاستلام', color: 'blue', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  diagnosing: { label: 'قيد الفحص والتشخيص', color: 'amber', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  waiting_for_parts: { label: 'بانتظار قطع الغيار', color: 'purple', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  ready_for_pickup: { label: 'جاهز للاستلام', color: 'emerald', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  delivered: { label: 'تم التسليم للزبون', color: 'slate', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  cancelled: { label: 'ملغى / غير قابل للإصلاح', color: 'red', badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

/**
 * Jordanian Dinar (JOD) 3 decimal places formatting helper
 */
export function formatJOD(amount: number, symbol: string = 'د.أ', decimals: number = 3): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `0.${'0'.repeat(decimals)} ${symbol}`;
  }
  return `${Number(amount).toFixed(decimals)} ${symbol}`;
}

/**
 * Normalizes Arabic-Indic (٠-٩) and Persian digits to Western ASCII (0-9),
 * handles Arabic comma (،) and normal comma (,) as decimal point (.),
 * and removes any illegal non-numeric characters.
 */
export function cleanNumberInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[،,]/g, '.')
    .replace(/[^0-9.]/g, '')
    .replace(/(\..*?)\..*/g, '$1');
}

export function parseNumberInput(input: string | number): number {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  if (!input) return 0;
  const cleaned = cleanNumberInput(String(input));
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}
