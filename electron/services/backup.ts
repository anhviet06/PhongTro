/**
 * Backup/restore service: dump toàn bộ dữ liệu nghiệp vụ ra JSON và khôi phục trong transaction.
 */

import fs from 'fs/promises';
import { getDb } from '../database';

const electronModule = require('electron') as typeof import('electron') | string;
const dialog = typeof electronModule === 'string' ? null : electronModule.dialog;
const app = typeof electronModule === 'string' ? null : electronModule.app;

const tables = [
   'areas',
   'rooms',
   'services',
   'tenants',
   'vehicles',
   'contracts',
   'meter_readings',
   'invoices',
   'invoice_services',
   'payments',
   'settings',
] as const;

type TableName = (typeof tables)[number];
type BackupData = Record<TableName, Record<string, unknown>[]>;

async function chooseBackupPath(): Promise<string | null> {
   if (!dialog) throw new Error('Không thể mở hộp thoại lưu file trong môi trường hiện tại');
   const result = await dialog.showSaveDialog({
      title: 'Sao lưu dữ liệu',
      defaultPath: `phongtro-backup-${Date.now()}.json`,
      filters: [{ name: 'Backup JSON', extensions: ['json'] }],
   });
   if (result.canceled || !result.filePath) return null;
   return result.filePath;
}

async function chooseRestorePath(): Promise<string | null> {
   if (!dialog) throw new Error('Không thể mở hộp thoại chọn file trong môi trường hiện tại');
   const result = await dialog.showOpenDialog({
      title: 'Khôi phục dữ liệu',
      filters: [{ name: 'Backup JSON', extensions: ['json'] }],
      properties: ['openFile'],
   });
   if (result.canceled || !result.filePaths[0]) return null;
   return result.filePaths[0];
}

function insertRows(table: TableName, rows: Record<string, unknown>[]): void {
   if (rows.length === 0) return;

   const db = getDb();
   const columns = Object.keys(rows[0]);
   const columnSql = columns.map((column) => `"${column}"`).join(', ');
   const valueSql = columns.map((column) => `@${column}`).join(', ');
   const stmt = db.prepare(`INSERT INTO ${table} (${columnSql}) VALUES (${valueSql})`);

   for (const row of rows) {
      stmt.run(row);
   }
}

export async function backupData(savePath?: string) {
   const filePath = savePath ?? (await chooseBackupPath());
   if (!filePath) return { canceled: true };

   const db = getDb();
   const data = tables.reduce<BackupData>((acc, table) => {
      acc[table] = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      return acc;
   }, {} as BackupData);

   const backup = {
      meta: {
         app: 'PhongTroApp',
         version: app?.getVersion?.() ?? 'dev',
         created_at: new Date().toISOString(),
      },
      data,
   };

   await fs.writeFile(filePath, JSON.stringify(backup, null, 2), 'utf-8');
   return { success: true, filePath };
}

export async function restoreData(openPath?: string) {
   const filePath = openPath ?? (await chooseRestorePath());
   if (!filePath) return { canceled: true };

   const content = await fs.readFile(filePath, 'utf-8');
   const backup = JSON.parse(content) as { data: Partial<BackupData> };
   const db = getDb();

   // Pragma `foreign_keys` KHÔNG đổi được bên trong transaction (better-sqlite3/SQLite limitation)
   // → phải gọi OFF trước, ON sau commit. Try/finally đảm bảo bật lại ngay cả khi restore lỗi.
   db.pragma('foreign_keys = OFF');
   const restoreTransaction = db.transaction(() => {
      db.exec(`
         DELETE FROM payments;
         DELETE FROM invoice_services;
         DELETE FROM invoices;
         DELETE FROM meter_readings;
         DELETE FROM contracts;
         DELETE FROM vehicles;
         DELETE FROM tenants;
         DELETE FROM services;
         DELETE FROM rooms;
         DELETE FROM areas;
         DELETE FROM settings;
      `);

      for (const table of tables) {
         insertRows(table, backup.data[table] ?? []);
      }
   });

   try {
      restoreTransaction();
   } finally {
      db.pragma('foreign_keys = ON');
   }

   return { success: true, filePath };
}

/**
 * Reset dữ liệu kinh doanh — xoá tenants/contracts/invoices/payments/meters/vehicles,
 * GIỮ areas (tên + đơn giá khu), rooms (giá phòng), services, settings (landlord info).
 *
 * Yêu cầu password để tránh xoá nhầm. Pass mặc định "474747".
 * Sau reset: tất cả phòng về status='vacant'.
 */
export function resetBusinessData(password: string): { success: boolean; tablesCleared: string[] } {
   if (password !== '474747') {
      throw new Error('Mật khẩu không đúng. Reset bị huỷ.');
   }

   const db = getDb();
   const cleared: string[] = [];

   db.pragma('foreign_keys = OFF');
   const trx = db.transaction(() => {
      // Xoá theo thứ tự dependency (children trước parent)
      const tablesToClear = [
         'payments',
         'invoice_services',
         'invoices',
         'meter_readings',
         'contracts',
         'vehicles',
         'tenants',
      ];

      for (const table of tablesToClear) {
         const result = db.prepare(`DELETE FROM ${table}`).run();
         cleared.push(`${table} (${result.changes} rows)`);
      }

      // Reset room.status về 'vacant' cho mọi phòng (vì không còn HĐ/khách)
      db.prepare("UPDATE rooms SET status = 'vacant'").run();
      cleared.push('rooms.status → vacant');
   });

   try {
      trx();
   } finally {
      db.pragma('foreign_keys = ON');
   }

   return { success: true, tablesCleared: cleared };
}
