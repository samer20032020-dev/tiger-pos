const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function run() {
  const dbPath = path.join(process.env.APPDATA, 'tiger-pos-system', 'tiger_pos.db');
  if (!fs.existsSync(dbPath)) {
    console.log('Database not found at', dbPath);
    return;
  }

  const SQL = await initSqlJs();
  const filebuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(filebuffer);

  // Check what accessories exist with صافي or صيانة
  const res = db.exec("SELECT id, barcode, sku, name, category, current_stock FROM accessories WHERE name LIKE '%صافي%' OR category LIKE '%صيانة%' OR category LIKE '%قطع%'");
  console.log('Matching items before delete:', JSON.stringify(res, null, 2));

  // Delete 'صافي الصيانه' or id 'acc-1795435646203-78'
  db.run("DELETE FROM accessories WHERE id = 'acc-1795435646203-78' OR name LIKE '%صافي الصيانه%'");
  
  const after = db.exec("SELECT id, barcode, sku, name, category, current_stock FROM accessories WHERE name LIKE '%صافي%' OR category LIKE '%صيانة%' OR category LIKE '%قطع%'");
  console.log('Matching items after delete:', JSON.stringify(after, null, 2));

  // Save database back
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  console.log('Database updated successfully!');
}

run().catch(console.error);
