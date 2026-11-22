import { LocalDatabase } from './database';

export async function seedDemoData(db: LocalDatabase): Promise<void> {
  // Ensure default system settings exist (clean setup with zero pre-registered records)
  const existingSettings = db.query('SELECT COUNT(*) as count FROM system_settings');
  if (existingSettings[0]?.count === 0) {
    db.run(`
      INSERT INTO system_settings (key, value) VALUES
        ('currencySymbol', 'د.أ'),
        ('currencyDecimals', '3'),
        ('defaultTaxRate', '0'),
        ('enableTaxByDefault', '0'),
        ('storeName', 'TIGER'),
        ('storePhone', ''),
        ('storeAddress', '')
    `);
    db.saveToDiskSync();
  }
}
