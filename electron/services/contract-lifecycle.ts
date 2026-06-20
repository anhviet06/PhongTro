/**
 * Contract lifecycle service — chạy on app startup để xử lý các HĐ tới hạn:
 *
 * 1. **Auto-terminate:** HĐ active nào có primary tenant `move_out_date <= today`
 *    → set HĐ status='terminated', recompute room status.
 *
 * 2. **Auto-expire + renew:** HĐ active có `end_date < today`:
 *    - Nếu primary tenant đã đi (`move_out_date <= today`) → expired (không tạo HĐ mới)
 *    - Nếu primary còn ở (`move_out_date` rỗng HOẶC > today) → HĐ cũ expired, tạo HĐ mới:
 *        - start_date = end_date + 1 ngày
 *        - end_date = move_out_date (nếu có) HOẶC end_date cũ + 12 tháng
 *        - copy nguyên giá thuê, cọc, điều khoản, Bên A snapshot
 *        - primary_tenant_id giữ nguyên
 *
 * Service trả về list HĐ đã xử lý để Dashboard hiển thị thông báo.
 */

import { getDb } from '../database';
import * as contractsRepo from '../database/repositories/contracts.repo';
import * as roomsRepo from '../database/repositories/rooms.repo';
import type { ContractWithDetails, Tenant } from '../../src/shared/types';

interface ProcessResult {
   renewed: ContractWithDetails[];
   terminated: ContractWithDetails[];
   expired: ContractWithDetails[];
}

/** Hàm helper format YYYY-MM-DD. */
function todayIso(): string {
   const d = new Date();
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Cộng N ngày vào date YYYY-MM-DD. */
function addDays(isoDate: string, days: number): string {
   const d = new Date(isoDate);
   if (Number.isNaN(d.getTime())) return isoDate;
   d.setDate(d.getDate() + days);
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Cộng N tháng vào date YYYY-MM-DD. */
function addMonths(isoDate: string, months: number): string {
   const d = new Date(isoDate);
   if (Number.isNaN(d.getTime())) return isoDate;
   d.setMonth(d.getMonth() + months);
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Quét và xử lý các HĐ tới hạn. Idempotent — gọi nhiều lần cùng ngày không tạo dup.
 */
export function processLifecycle(): ProcessResult {
   const db = getDb();
   const today = todayIso();
   const renewed: ContractWithDetails[] = [];
   const terminated: ContractWithDetails[] = [];
   const expired: ContractWithDetails[] = [];

   // --- 1. Terminate: HĐ active có primary tenant đã/sắp đi ---
   const movedOutActive = db
      .prepare(
         `
         SELECT c.id, c.room_id
         FROM contracts c
         JOIN tenants t ON t.id = c.primary_tenant_id
         WHERE c.status = 'active'
           AND t.move_out_date <> ''
           AND date(t.move_out_date) <= date(?)
         `
      )
      .all(today) as Array<{ id: number; room_id: number }>;

   for (const row of movedOutActive) {
      const updated = contractsRepo.update(row.id, { status: 'terminated' });
      if (updated) {
         roomsRepo.recomputeStatus(row.room_id);
         terminated.push(updated);
      }
   }

   // --- 2. Expire/renew: HĐ active có end_date < today ---
   const dueContracts = db
      .prepare(
         `
         SELECT c.*
         FROM contracts c
         WHERE c.status = 'active'
           AND c.end_date <> ''
           AND date(c.end_date) < date(?)
         `
      )
      .all(today) as Array<{
      id: number;
      room_id: number;
      primary_tenant_id: number | null;
      deposit: number;
      rent_price: number;
      start_date: string;
      end_date: string;
      terms: string;
      landlord_name: string;
      landlord_cccd: string;
      landlord_phone: string;
      landlord_address: string;
   }>;

   for (const old of dueContracts) {
      // Lookup primary tenant để quyết định renew hay không
      const tenant = old.primary_tenant_id
         ? (db.prepare('SELECT * FROM tenants WHERE id = ?').get(old.primary_tenant_id) as
              | Tenant
              | undefined)
         : null;

      const moveOut = tenant?.move_out_date ?? '';
      const tenantStillStaying = !moveOut || moveOut > today;

      if (!tenant || !tenantStillStaying) {
         // Không còn ở → chỉ expire HĐ cũ
         const updated = contractsRepo.update(old.id, { status: 'expired' });
         if (updated) {
            roomsRepo.recomputeStatus(old.room_id);
            expired.push(updated);
         }
         continue;
      }

      // Còn ở → renew. End date mới = move_out_date (nếu có) HOẶC end_date cũ + 12 tháng
      const newStartDate = addDays(old.end_date, 1);
      const newEndDate = moveOut || addMonths(old.end_date, 12);

      // Set HĐ cũ expired
      contractsRepo.update(old.id, { status: 'expired' });
      expired.push(contractsRepo.getById(old.id)!);

      // Tạo HĐ mới copy info
      const newContract = contractsRepo.create({
         room_id: old.room_id,
         primary_tenant_id: old.primary_tenant_id,
         deposit: old.deposit,
         rent_price: old.rent_price,
         start_date: newStartDate,
         end_date: newEndDate,
         terms: old.terms,
         landlord_name: old.landlord_name,
         landlord_cccd: old.landlord_cccd,
         landlord_phone: old.landlord_phone,
         landlord_address: old.landlord_address,
         status: 'active',
      });
      roomsRepo.recomputeStatus(old.room_id);
      renewed.push(newContract);
   }

   return { renewed, terminated, expired };
}
