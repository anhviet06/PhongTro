/**
 * Repository dịch vụ chung: CRUD và bật/tắt dịch vụ đang áp dụng.
 */

import { getDb } from '../index';
import type { Service } from '../../../src/shared/types';

export interface ServiceInput {
   name: string;
   unit_price?: number;
   per_person?: number;
   icon?: string;
   is_active?: number;
}

export type ServicePatch = Partial<ServiceInput>;

export function listActive(): Service[] {
   const db = getDb();
   return db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY id ASC').all() as Service[];
}

export function listAll(): Service[] {
   const db = getDb();
   return db.prepare('SELECT * FROM services ORDER BY is_active DESC, id ASC').all() as Service[];
}

export function getById(id: number): Service | null {
   const db = getDb();
   return (db.prepare('SELECT * FROM services WHERE id = ?').get(id) as Service | undefined) ?? null;
}

export function create(data: ServiceInput): Service {
   const db = getDb();
   const result = db
      .prepare(
         `
         INSERT INTO services (name, unit_price, per_person, icon, is_active)
         VALUES (@name, @unit_price, @per_person, @icon, @is_active)
      `
      )
      .run({
         name: data.name,
         unit_price: data.unit_price ?? 0,
         per_person: data.per_person ?? 1,
         icon: data.icon ?? '',
         is_active: data.is_active ?? 1,
      });

   const service = getById(Number(result.lastInsertRowid));
   if (!service) throw new Error('Tạo dịch vụ thất bại');
   return service;
}

export function update(id: number, patch: ServicePatch): Service | null {
   const fields: string[] = [];
   const params: Record<string, number | string> = { id };

   for (const key of ['name', 'unit_price', 'per_person', 'icon', 'is_active'] as const) {
      if (patch[key] !== undefined) {
         fields.push(`${key} = @${key}`);
         params[key] = patch[key] as number | string;
      }
   }

   if (fields.length === 0) return getById(id);

   const db = getDb();
   db.prepare(`UPDATE services SET ${fields.join(', ')} WHERE id = @id`).run(params);
   return getById(id);
}

export function setActive(id: number, active: boolean): Service | null {
   const db = getDb();
   db.prepare('UPDATE services SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id);
   return getById(id);
}

export function deleteById(id: number): boolean {
   const db = getDb();
   const result = db.prepare('DELETE FROM services WHERE id = ?').run(id);
   return result.changes > 0;
}

export { deleteById as delete };
