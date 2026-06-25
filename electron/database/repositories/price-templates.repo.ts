/**
 * Repository bảng giá (price_templates): CRUD thuần SQL.
 */

import { getDb } from '../index';
import type { PriceTemplate } from '../../../src/shared/types';

export interface PriceTemplateInput {
   name: string;
   price: number;
   electric_unit_price: number;
   water_unit_price: number;
}

export type PriceTemplatePatch = Partial<PriceTemplateInput>;

export interface PriceTemplateWithCount extends PriceTemplate {
   room_count: number;
}

export function listAll(): PriceTemplateWithCount[] {
   const db = getDb();
   return db
      .prepare(`
         SELECT pt.*,
            COALESCE((SELECT COUNT(*) FROM rooms r WHERE r.price_template_id = pt.id), 0) AS room_count
         FROM price_templates pt
         ORDER BY pt.id ASC
      `)
      .all() as PriceTemplateWithCount[];
}

export function getById(id: number): PriceTemplate | null {
   const db = getDb();
   return (
      (db.prepare('SELECT * FROM price_templates WHERE id = ?').get(id) as PriceTemplate | undefined) ??
      null
   );
}

export function create(data: PriceTemplateInput): PriceTemplate {
   const db = getDb();
   const result = db
      .prepare(
         `
         INSERT INTO price_templates (name, price, electric_unit_price, water_unit_price)
         VALUES (@name, @price, @electric_unit_price, @water_unit_price)
      `
      )
      .run({
         name: data.name,
         price: data.price,
         electric_unit_price: data.electric_unit_price,
         water_unit_price: data.water_unit_price,
      });

   const template = getById(Number(result.lastInsertRowid));
   if (!template) throw new Error('Tạo bảng giá thất bại');
   return template;
}

export function update(id: number, patch: PriceTemplatePatch): PriceTemplate | null {
   const fields: string[] = [];
   const params: Record<string, string | number> = { id };
   const keys = ['name', 'price', 'electric_unit_price', 'water_unit_price'] as const;

   for (const key of keys) {
      if (patch[key] !== undefined) {
         fields.push(`${key} = @${key}`);
         params[key] = patch[key] as string | number;
      }
   }

   if (fields.length === 0) return getById(id);

   const db = getDb();
   db.prepare(`UPDATE price_templates SET ${fields.join(', ')} WHERE id = @id`).run(params);

   const updated = getById(id);
   if (updated) {
      // Tự động cập nhật giá tiền phòng, điện, nước cho tất cả các phòng liên kết
      db.prepare(`
         UPDATE rooms
         SET price = ?, electric_unit_price = ?, water_unit_price = ?
         WHERE price_template_id = ?
      `).run(updated.price, updated.electric_unit_price, updated.water_unit_price, id);
   }

   return updated;
}

export function deleteById(id: number): boolean {
   const db = getDb();
   // Hủy liên kết bảng giá của các phòng đang dùng bảng này (price_template_id = NULL)
   db.prepare('UPDATE rooms SET price_template_id = NULL WHERE price_template_id = ?').run(id);
   const result = db.prepare('DELETE FROM price_templates WHERE id = ?').run(id);
   return result.changes > 0;
}

export { deleteById as delete };
