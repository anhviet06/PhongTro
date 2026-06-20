/**
 * SQLite init cho PhongTroApp.
 *
 * **DB path:** `%APPDATA%/phongtro-app/Database.sqlite3` (qua `app.getPath('userData')`).
 *
 * Trước v1.0.5: DB nằm cùng folder với `PhongTroApp.exe` (Install Dir).
 * Vấn đề: NSIS auto-update xoá sạch Install Dir trước khi extract → DB bị xoá → demo data quay về.
 * Từ v1.0.5: DB chuyển sang `userData` — NSIS không động vào folder này.
 *
 * **Auto-migrate DB cũ:** nếu phát hiện `<InstallDir>/Database.sqlite3` còn tồn tại nhưng
 * `<userData>/Database.sqlite3` chưa có → tự copy sang để user không mất data khi nâng cấp.
 *
 * Pragmas: WAL + foreign_keys ON + tối ưu cache/temp.
 */

import fs from 'fs';
import path from 'path';
import type { Database as DatabaseInstanceType } from 'better-sqlite3';
import { runMigrations } from './migrate';

const electronModule = require('electron') as typeof import('electron') | string;
const app =
   typeof electronModule === 'string'
      ? {
           isPackaged: false,
           getAppPath: () => process.cwd(),
           getPath: (_name: string) => process.cwd(),
        }
      : electronModule.app;
const Database = require('better-sqlite3') as unknown as typeof import('better-sqlite3');

let db: DatabaseInstanceType | null = null;
let dbPath = '';

/**
 * Migrate DB từ Install Dir → userData (chỉ chạy 1 lần cho user nâng cấp từ ≤ v1.0.4).
 * Sau khi copy thành công, đổi tên file cũ thành `.legacy` để rõ ràng.
 */
function migrateLegacyDb(newPath: string): void {
   if (fs.existsSync(newPath)) return; // đã có DB ở userData → không cần migrate
   const legacyRoot = app.isPackaged ? path.dirname(process.execPath) : app.getAppPath();
   const legacyPath = path.join(legacyRoot, 'Database.sqlite3');
   if (!fs.existsSync(legacyPath)) return;

   try {
      // Đảm bảo folder userData tồn tại
      fs.mkdirSync(path.dirname(newPath), { recursive: true });
      fs.copyFileSync(legacyPath, newPath);
      // Đổi tên file cũ để tránh đọc nhầm sau này
      try {
         fs.renameSync(legacyPath, `${legacyPath}.legacy`);
      } catch {
         // không rename được cũng OK — DB mới đã ở userData
      }
      console.log(`[DB] Đã migrate DB cũ từ ${legacyPath} → ${newPath}`);
   } catch (error) {
      console.error('[DB] Migrate legacy DB thất bại:', error);
   }
}

export function initDb(): { db: DatabaseInstanceType; dbPath: string } {
   const userDataDir = app.isPackaged
      ? app.getPath('userData')
      : app.getPath('userData'); // dev mode cũng dùng userData để consistent
   dbPath = path.join(userDataDir, 'Database.sqlite3');

   // Auto-migrate DB cũ (Install Dir → userData) cho user nâng cấp từ ≤ v1.0.4
   migrateLegacyDb(dbPath);

   db = new Database(dbPath);

   // Pragmas
   db.pragma('foreign_keys = ON');
   db.pragma('journal_mode = WAL');
   db.pragma('synchronous = NORMAL');
   db.pragma('temp_store = MEMORY');
   db.pragma('cache_size = -2000'); // ~2MB cache

   // Áp dụng schema + seed
   const result = runMigrations(db);
   console.log(
      `[DB] Initialized at ${dbPath} — applied ${result.applied.length} new migration(s)`
   );

   return { db, dbPath };
}

export function getDb(): DatabaseInstanceType {
   if (!db) throw new Error('DB chưa init — gọi initDb() trước.');
   return db;
}

export function getDbPath(): string {
   return dbPath;
}

export function closeDb(): void {
   if (db) {
      db.close();
      db = null;
   }
}
