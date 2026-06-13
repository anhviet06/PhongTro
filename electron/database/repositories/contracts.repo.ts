/**
 * Repository hợp đồng thuê phòng.
 */

import { getDb } from '../index';
import type { Contract, ContractStatus, ContractWithDetails } from '../../../src/shared/types';

export interface ContractInput {
   room_id: number;
   primary_tenant_id?: number | null;
   deposit?: number;
   rent_price?: number;
   start_date: string;
   end_date?: string;
   terms?: string;
   landlord_name?: string;
   landlord_cccd?: string;
   landlord_phone?: string;
   landlord_address?: string;
   status?: ContractStatus;
}

export type ContractPatch = Partial<ContractInput>;

const contractWithDetailsSelect = `
   SELECT
      c.*,
      r.name AS room_name,
      r.area_id AS area_id,
      a.name AS area_name,
      t.full_name AS tenant_name,
      t.phone AS tenant_phone
   FROM contracts c
   JOIN rooms r ON r.id = c.room_id
   JOIN areas a ON a.id = r.area_id
   LEFT JOIN tenants t ON t.id = c.primary_tenant_id
`;

export function listAll(): ContractWithDetails[] {
   const db = getDb();
   return db
      .prepare(`${contractWithDetailsSelect} ORDER BY c.created_at DESC, c.id DESC`)
      .all() as ContractWithDetails[];
}

export function listByRoom(roomId: number): ContractWithDetails[] {
   const db = getDb();
   return db
      .prepare(
         `${contractWithDetailsSelect} WHERE c.room_id = ? ORDER BY c.created_at DESC, c.id DESC`
      )
      .all(roomId) as ContractWithDetails[];
}

export function getById(id: number): ContractWithDetails | null {
   const db = getDb();
   return (
      (db.prepare(`${contractWithDetailsSelect} WHERE c.id = ?`).get(id) as
         | ContractWithDetails
         | undefined) ?? null
   );
}

export function create(data: ContractInput): ContractWithDetails {
   const db = getDb();
   const result = db
      .prepare(
         `
         INSERT INTO contracts (
            room_id, primary_tenant_id, deposit, rent_price, start_date, end_date,
            terms, landlord_name, landlord_cccd, landlord_phone, landlord_address, status
         )
         VALUES (
            @room_id, @primary_tenant_id, @deposit, @rent_price, @start_date, @end_date,
            @terms, @landlord_name, @landlord_cccd, @landlord_phone, @landlord_address, @status
         )
      `
      )
      .run({
         room_id: data.room_id,
         primary_tenant_id: data.primary_tenant_id ?? null,
         deposit: data.deposit ?? 0,
         rent_price: data.rent_price ?? 0,
         start_date: data.start_date,
         end_date: data.end_date ?? '',
         terms: data.terms ?? '',
         landlord_name: data.landlord_name ?? '',
         landlord_cccd: data.landlord_cccd ?? '',
         landlord_phone: data.landlord_phone ?? '',
         landlord_address: data.landlord_address ?? '',
         status: data.status ?? 'active',
      });

   const contract = getById(Number(result.lastInsertRowid));
   if (!contract) throw new Error('Tạo hợp đồng thất bại');
   return contract;
}

export function update(id: number, patch: ContractPatch): ContractWithDetails | null {
   const fields: string[] = [];
   const params: Record<string, number | string | null> = { id };
   const keys = [
      'room_id',
      'primary_tenant_id',
      'deposit',
      'rent_price',
      'start_date',
      'end_date',
      'terms',
      'landlord_name',
      'landlord_cccd',
      'landlord_phone',
      'landlord_address',
      'status',
   ] as const;

   for (const key of keys) {
      if (patch[key] !== undefined) {
         fields.push(`${key} = @${key}`);
         params[key] = patch[key] as number | string | null;
      }
   }

   if (fields.length === 0) return getById(id);

   const db = getDb();
   db.prepare(`UPDATE contracts SET ${fields.join(', ')} WHERE id = @id`).run(params);
   return getById(id);
}

export function terminate(id: number): ContractWithDetails | null {
   return update(id, { status: 'terminated' });
}

export function expiringSoon(days: number): ContractWithDetails[] {
   const db = getDb();
   return db
      .prepare(
         `
         ${contractWithDetailsSelect}
         WHERE c.status = 'active'
            AND c.end_date <> ''
            AND date(c.end_date) <= date('now', '+' || ? || ' days')
         ORDER BY date(c.end_date) ASC, c.id ASC
      `
      )
      .all(days) as ContractWithDetails[];
}

export function deleteById(id: number): boolean {
   const db = getDb();
   const result = db.prepare('DELETE FROM contracts WHERE id = ?').run(id);
   return result.changes > 0;
}

export { deleteById as delete };
