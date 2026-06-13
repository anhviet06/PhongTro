/**
 * Migration runner cho PhongTroApp.
 *
 * Khác với pattern OmniWare (copy file DB pre-built từ resources/), PhongTroApp
 * dùng folder `migrations/` chứa các file .sql đặt tên `001_xxx.sql`, `002_xxx.sql`...
 * Migration được chạy theo thứ tự tên file, idempotent qua bảng `_migrations`.
 *
 * Vị trí folder migrations:
 *   - Dev:        <appPath>/migrations
 *   - Packaged:   <resourcesPath>/migrations  (qua extraResources trong electron-builder)
 */

import fs from 'fs';
import path from 'path';
import type { Database as DatabaseInstanceType } from 'better-sqlite3';

const electronModule = require('electron') as typeof import('electron') | string;
const app =
   typeof electronModule === 'string'
      ? { isPackaged: false, getAppPath: () => process.cwd() }
      : electronModule.app;

interface MigrationRow {
   name: string;
}

export function runMigrations(db: DatabaseInstanceType): { applied: string[]; skipped: string[] } {
   // Đảm bảo bảng tracking tồn tại trước khi check applied.
   db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
         id         INTEGER PRIMARY KEY AUTOINCREMENT,
         name       TEXT NOT NULL UNIQUE,
         applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
   `);

   const migrationsDir = app.isPackaged
      ? path.join(process.resourcesPath, 'migrations')
      : path.join(app.getAppPath(), 'migrations');

   if (!fs.existsSync(migrationsDir)) {
      console.warn(`[Migrate] Không tìm thấy thư mục migrations: ${migrationsDir}`);
      return { applied: [], skipped: [] };
   }

   const applied = new Set(
      (db.prepare('SELECT name FROM _migrations').all() as MigrationRow[]).map((r) => r.name)
   );

   const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.toLowerCase().endsWith('.sql'))
      .sort();

   const appliedNow: string[] = [];
   const skipped: string[] = [];

   for (const file of files) {
      if (applied.has(file)) {
         skipped.push(file);
         continue;
      }
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      const trx = db.transaction(() => {
         db.exec(sql);
         db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      });

      try {
         trx();
         console.log(`[Migrate] Applied: ${file}`);
         appliedNow.push(file);
      } catch (err) {
         console.error(`[Migrate] FAILED applying ${file}:`, err);
         throw err;
      }
   }

   if (appliedNow.length === 0 && skipped.length > 0) {
      console.log(`[Migrate] All migrations up-to-date (${skipped.length} file(s) đã chạy)`);
   }

   return { applied: appliedNow, skipped };
}
