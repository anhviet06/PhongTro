/**
 * Repository khách thuê: CRUD, danh sách theo phòng và xử lý người đại diện.
 */

import { getDb } from '../index';
import type { Tenant, TenantWithRoom } from '../../../src/shared/types';

export interface TenantInput {
   room_id?: number | null;
   full_name: string;
   cccd?: string;
   dob?: string;
   phone?: string;
   permanent_address?: string;
   is_primary?: number;
   move_in_date?: string;
   move_out_date?: string;
   deposit?: number;
   note?: string;
}

export type TenantPatch = Partial<TenantInput>;

const tenantWithRoomSelect = `
   SELECT
      t.*,
      r.name AS room_name,
      r.area_id AS area_id,
      a.name AS area_name
   FROM tenants t
   LEFT JOIN rooms r ON r.id = t.room_id
   LEFT JOIN areas a ON a.id = r.area_id
`;

export function listAll(): TenantWithRoom[] {
   const db = getDb();
   return db
      .prepare(`${tenantWithRoomSelect} ORDER BY t.created_at DESC, t.id DESC`)
      .all() as TenantWithRoom[];
}

export function listByRoom(roomId: number): Tenant[] {
   const db = getDb();
   return db
      .prepare('SELECT * FROM tenants WHERE room_id = ? ORDER BY is_primary DESC, id ASC')
      .all(roomId) as Tenant[];
}

export function getById(id: number): Tenant | null {
   const db = getDb();
   return (db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as Tenant | undefined) ?? null;
}

export function create(data: TenantInput): Tenant {
   const db = getDb();
   const trx = db.transaction(() => {
      const result = db
         .prepare(
            `
            INSERT INTO tenants (
               room_id, full_name, cccd, dob, phone, permanent_address,
               is_primary, move_in_date, move_out_date, deposit, note
            )
            VALUES (
               @room_id, @full_name, @cccd, @dob, @phone, @permanent_address,
               @is_primary, @move_in_date, @move_out_date, @deposit, @note
            )
         `
         )
         .run({
            room_id: data.room_id ?? null,
            full_name: data.full_name,
            cccd: data.cccd ?? '',
            dob: data.dob ?? '',
            phone: data.phone ?? '',
            permanent_address: data.permanent_address ?? '',
            is_primary: data.is_primary ?? 0,
            move_in_date: data.move_in_date ?? '',
            move_out_date: data.move_out_date ?? '',
            deposit: data.deposit ?? 0,
            note: data.note ?? '',
         });

      const id = Number(result.lastInsertRowid);
      if (data.room_id && data.is_primary) {
         db.prepare('UPDATE tenants SET is_primary = 0 WHERE room_id = ? AND id <> ?').run(
            data.room_id,
            id
         );
      }
      return id;
   });

   const tenant = getById(trx());
   if (!tenant) throw new Error('Tạo khách thuê thất bại');
   return tenant;
}

export function update(id: number, patch: TenantPatch): Tenant | null {
   const fields: string[] = [];
   const params: Record<string, number | string | null> = { id };
   const keys = [
      'room_id',
      'full_name',
      'cccd',
      'dob',
      'phone',
      'permanent_address',
      'is_primary',
      'move_in_date',
      'move_out_date',
      'deposit',
      'note',
   ] as const;

   for (const key of keys) {
      if (patch[key] !== undefined) {
         fields.push(`${key} = @${key}`);
         params[key] = patch[key] as number | string | null;
      }
   }

   if (fields.length === 0) return getById(id);

   const db = getDb();
   const trx = db.transaction(() => {
      db.prepare(`UPDATE tenants SET ${fields.join(', ')} WHERE id = @id`).run(params);
      const tenant = getById(id);
      if (tenant?.room_id && tenant.is_primary === 1) {
         db.prepare('UPDATE tenants SET is_primary = 0 WHERE room_id = ? AND id <> ?').run(
            tenant.room_id,
            id
         );
      }
   });
   trx();

   return getById(id);
}

/**
 * Đặt tenant làm người đại diện của phòng. Yêu cầu: tenant đang thuộc phòng đó.
 * KHÔNG dùng để chuyển tenant từ phòng khác sang — nếu muốn chuyển, dùng `update(id, { room_id })`
 * trước rồi mới setPrimary.
 */
export function setPrimary(roomId: number, tenantId: number): Tenant | null {
   const db = getDb();
   const tenant = getById(tenantId);
   if (!tenant) throw new Error('Khách thuê không tồn tại');
   if (tenant.room_id !== roomId) {
      throw new Error(
         `Khách thuê chưa thuộc phòng ${roomId}. Cập nhật room_id trước khi đặt làm người đại diện.`
      );
   }

   const trx = db.transaction(() => {
      db.prepare('UPDATE tenants SET is_primary = 0 WHERE room_id = ?').run(roomId);
      db.prepare('UPDATE tenants SET is_primary = 1 WHERE id = ?').run(tenantId);
   });
   trx();
   return getById(tenantId);
}

export function countActiveInRoom(roomId: number): number {
   const db = getDb();
   const row = db
      .prepare(
         `
         SELECT COUNT(*) AS total
         FROM tenants
         WHERE room_id = ? AND move_out_date = ''
      `
      )
      .get(roomId) as { total: number };
   return row.total;
}

export function deleteById(id: number): boolean {
   const db = getDb();
   const result = db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
   return result.changes > 0;
}

export { deleteById as delete };
