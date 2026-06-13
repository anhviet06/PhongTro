/**
 * Repository settings key-value: landlord info và cấu hình mặc định.
 */

import { getDb } from '../index';
import type { Setting, Settings } from '../../../src/shared/types';

export function get(key: string): string | null {
   const db = getDb();
   const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
   return row?.value ?? null;
}

export function getMany(keys: string[]): Settings {
   if (keys.length === 0) return {};

   const db = getDb();
   const placeholders = keys.map(() => '?').join(', ');
   const rows = db
      .prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`)
      .all(...keys) as Pick<Setting, 'key' | 'value'>[];

   return rows.reduce<Settings>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
   }, {});
}

export function getAll(): Setting[] {
   const db = getDb();
   return db.prepare('SELECT * FROM settings ORDER BY key ASC').all() as Setting[];
}

export function set(key: string, value: string): Setting {
   const db = getDb();
   db.prepare(
      `
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = datetime('now')
   `
   ).run(key, value);

   const row = db.prepare('SELECT * FROM settings WHERE key = ?').get(key) as Setting | undefined;
   if (!row) throw new Error(`Lưu settings thất bại: ${key}`);
   return row;
}

export function setMany(values: Settings): Setting[] {
   const db = getDb();
   const trx = db.transaction(() => {
      const stmt = db.prepare(
         `
         INSERT INTO settings (key, value, updated_at)
         VALUES (@key, @value, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = datetime('now')
      `
      );

      for (const [key, value] of Object.entries(values)) {
         stmt.run({ key, value });
      }
   });

   trx();
   return getAll();
}
