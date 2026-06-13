/**
 * SQLite init cho PhongTroApp.
 *
 * - File DB nằm ở root cài đặt (`Database.sqlite3`), tự tạo nếu chưa có.
 * - Sau khi mở connection sẽ chạy migration runner để áp dụng schema/seed mới nhất.
 * - Pragmas: WAL + foreign_keys ON + tối ưu cache/temp.
 *
 * Pattern khác OmniWare: không copy pre-built DB nữa, schema do migrations/ định nghĩa.
 */

import path from 'path';
import type { Database as DatabaseInstanceType } from 'better-sqlite3';
import { runMigrations } from './migrate';

const electronModule = require('electron') as typeof import('electron') | string;
const app =
   typeof electronModule === 'string'
      ? { isPackaged: false, getAppPath: () => process.cwd() }
      : electronModule.app;
const Database = require('better-sqlite3') as unknown as typeof import('better-sqlite3');

let db: DatabaseInstanceType | null = null;
let dbPath = '';

export function initDb(): { db: DatabaseInstanceType; dbPath: string } {
   const rootPath = app.isPackaged ? path.dirname(process.execPath) : app.getAppPath();
   dbPath = path.join(rootPath, 'Database.sqlite3');

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
