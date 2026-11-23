export const REPAIR_PART_CATEGORIES = [
  'بطاريات صيانة (Battery)',
  'شاشات صيانة (LCD)',
  'جدلات وكونكترات شحن (UI)',
  'باكات وهاوسنج آيفون (iPhone Backs)',
  'قطع غيار ومواد صيانة'
];

export const ACCESSORY_CATEGORIES = [
  'شواحن وكوابل',
  'كفرات وحافظات',
  'شاشات حماية (سكرينات)',
  'سماعات وإيربودز',
  'بطاريات وبنك طاقة',
  ...REPAIR_PART_CATEGORIES,
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
