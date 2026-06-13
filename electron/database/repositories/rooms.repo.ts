/**
 * Repository phòng trọ: CRUD và thống kê trạng thái phòng.
 */

import { getDb } from '../index';
import type { Room, RoomStatus, RoomStatusCount, RoomWithArea } from '../../../src/shared/types';

export interface RoomInput {
   area_id: number;
   name: string;
   floor?: number;
   area_m2?: number;
   price?: number;
   electric_unit_price?: number;
   water_unit_price?: number;
   max_people?: number;
   status?: RoomStatus;
}

export type RoomPatch = Partial<RoomInput>;

const roomWithAreaSelect = `
   SELECT
      r.*,
      a.name AS area_name,
      a.address AS area_address,
      COALESCE(
         (SELECT COUNT(*) FROM tenants t WHERE t.room_id = r.id AND t.move_out_date = ''),
         0
      ) AS current_tenant_count,
      (
         SELECT t.full_name FROM tenants t
         WHERE t.room_id = r.id AND t.is_primary = 1 AND t.move_out_date = ''
         LIMIT 1
      ) AS primary_tenant_name
   FROM rooms r
   JOIN areas a ON a.id = r.area_id
`;

export function listByArea(areaId: number): RoomWithArea[] {
   const db = getDb();
   return db
      .prepare(`${roomWithAreaSelect} WHERE r.area_id = ? ORDER BY r.floor ASC, r.name ASC`)
      .all(areaId) as RoomWithArea[];
}

export function listAll(): RoomWithArea[] {
   const db = getDb();
   return db
      .prepare(`${roomWithAreaSelect} ORDER BY a.id ASC, r.floor ASC, r.name ASC`)
      .all() as RoomWithArea[];
}

export function listByStatus(status: RoomStatus, limit = 50): RoomWithArea[] {
   const db = getDb();
   return db
      .prepare(`${roomWithAreaSelect} WHERE r.status = ? ORDER BY r.id ASC LIMIT ?`)
      .all(status, limit) as RoomWithArea[];
}

export function getById(id: number): RoomWithArea | null {
   const db = getDb();
   return (
      (db.prepare(`${roomWithAreaSelect} WHERE r.id = ?`).get(id) as RoomWithArea | undefined) ??
      null
   );
}

export function create(data: RoomInput): RoomWithArea {
   const db = getDb();
   const result = db
      .prepare(
         `
         INSERT INTO rooms (
            area_id, name, floor, area_m2, price,
            electric_unit_price, water_unit_price, max_people, status
         )
         VALUES (
            @area_id, @name, @floor, @area_m2, @price,
            @electric_unit_price, @water_unit_price, @max_people, @status
         )
      `
      )
      .run({
         area_id: data.area_id,
         name: data.name,
         floor: data.floor ?? 1,
         area_m2: data.area_m2 ?? 0,
         price: data.price ?? 0,
         electric_unit_price: data.electric_unit_price ?? 0,
         water_unit_price: data.water_unit_price ?? 0,
         max_people: data.max_people ?? 4,
         status: data.status ?? 'vacant',
      });

   const room = getById(Number(result.lastInsertRowid));
   if (!room) throw new Error('Tạo phòng thất bại');
   return room;
}

export function update(id: number, patch: RoomPatch): RoomWithArea | null {
   const fields: string[] = [];
   const params: Record<string, number | string> = { id };
   const keys = [
      'area_id',
      'name',
      'floor',
      'area_m2',
      'price',
      'electric_unit_price',
      'water_unit_price',
      'max_people',
      'status',
   ] as const;

   for (const key of keys) {
      if (patch[key] !== undefined) {
         fields.push(`${key} = @${key}`);
         params[key] = patch[key] as number | string;
      }
   }

   if (fields.length === 0) return getById(id);

   const db = getDb();
   db.prepare(`UPDATE rooms SET ${fields.join(', ')} WHERE id = @id`).run(params);
   return getById(id);
}

export function updateStatus(id: number, status: RoomStatus): Room | null {
   const db = getDb();
   db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(status, id);
   return (db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room | undefined) ?? null;
}

/**
 * Tính lại room.status dựa trên dữ liệu thực tế (HĐ active + hóa đơn quá hạn).
 * Dùng raw SQL để tránh circular dep với contracts/invoices repo.
 *
 * Quy tắc (spec Mục 6.2):
 *  - Không có HĐ active            → 'vacant'
 *  - Có HĐ active + invoice quá hạn (unpaid/partial > overdueDays ngày từ created_at) → 'debt'
 *  - Có HĐ active + không quá hạn  → 'occupied'
 */
export function recomputeStatus(id: number, overdueDays = 5): Room | null {
   const db = getDb();
   const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room | undefined;
   if (!room) return null;

   const activeContract = db
      .prepare(`SELECT id FROM contracts WHERE room_id = ? AND status = 'active' LIMIT 1`)
      .get(id) as { id: number } | undefined;

   let newStatus: RoomStatus;
   if (!activeContract) {
      newStatus = 'vacant';
   } else {
      const overdue = db
         .prepare(
            `
            SELECT COUNT(*) AS n
            FROM invoices
            WHERE room_id = ?
              AND status <> 'paid'
              AND julianday('now') - julianday(created_at) > ?
         `
         )
         .get(id, overdueDays) as { n: number };
      newStatus = overdue.n > 0 ? 'debt' : 'occupied';
   }

   if (room.status !== newStatus) {
      db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(newStatus, id);
      return { ...room, status: newStatus };
   }
   return room;
}

export function countByStatus(): RoomStatusCount {
   const db = getDb();
   const rows = db
      .prepare(
         `
         SELECT status, COUNT(*) AS total
         FROM rooms
         GROUP BY status
      `
      )
      .all() as { status: RoomStatus; total: number }[];

   const result: RoomStatusCount = { total: 0, vacant: 0, occupied: 0, debt: 0 };
   for (const row of rows) {
      result[row.status] = row.total;
      result.total += row.total;
   }
   return result;
}

export function deleteById(id: number): boolean {
   const db = getDb();
   const result = db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
   return result.changes > 0;
}

export { deleteById as delete };
