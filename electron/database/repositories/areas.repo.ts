/**
 * Repository khu trọ: CRUD thuần SQL cho bảng areas.
 */

import { getDb } from '../index';
import type { Area } from '../../../src/shared/types';

export interface AreaInput {
   name: string;
   address?: string;
   description?: string;
   default_electric_price?: number;
   default_water_price?: number;
}

export type AreaPatch = Partial<AreaInput>;

export function listAll(): Area[] {
   const db = getDb();
   return db.prepare('SELECT * FROM areas ORDER BY id ASC').all() as Area[];
}

export function getById(id: number): Area | null {
   const db = getDb();
   return (db.prepare('SELECT * FROM areas WHERE id = ?').get(id) as Area | undefined) ?? null;
}

export function create(data: AreaInput): Area {
   const db = getDb();
   const result = db
      .prepare(
         `
         INSERT INTO areas (name, address, description, default_electric_price, default_water_price)
         VALUES (@name, @address, @description, @default_electric_price, @default_water_price)
      `
      )
      .run({
         name: data.name,
         address: data.address ?? '',
         description: data.description ?? '',
         default_electric_price: data.default_electric_price ?? 0,
         default_water_price: data.default_water_price ?? 0,
      });

   const area = getById(Number(result.lastInsertRowid));
   if (!area) throw new Error('Tạo khu trọ thất bại');
   return area;
}

export function update(id: number, patch: AreaPatch): Area | null {
   const fields: string[] = [];
   const params: Record<string, string | number> = { id };
   const stringKeys = ['name', 'address', 'description'] as const;
   const numberKeys = ['default_electric_price', 'default_water_price'] as const;

   for (const key of stringKeys) {
      if (patch[key] !== undefined) {
         fields.push(`${key} = @${key}`);
         params[key] = patch[key] ?? '';
      }
   }
   for (const key of numberKeys) {
      if (patch[key] !== undefined) {
         fields.push(`${key} = @${key}`);
         params[key] = patch[key] ?? 0;
      }
   }

   if (fields.length === 0) return getById(id);

   const db = getDb();
   db.prepare(`UPDATE areas SET ${fields.join(', ')} WHERE id = @id`).run(params);
   return getById(id);
}

export function deleteById(id: number): boolean {
   const db = getDb();
   const result = db.prepare('DELETE FROM areas WHERE id = ?').run(id);
   return result.changes > 0;
}

export { deleteById as delete };
