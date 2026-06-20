/**
 * Tenant lifecycle service — quản lý các thao tác phức tạp liên quan đến đại diện phòng:
 *
 * `promoteToPrimary(newPrimaryId)`: tick 1 tenant lên làm đại diện. Hệ quả:
 *   - Đại diện CŨ (nếu có) → `move_out_date = today` (đã rời)
 *   - Tất cả HĐ active của phòng trỏ về đại diện cũ → `status = terminated`
 *   - Tenant mới → `is_primary = 1` (tự unset các tenant khác cùng phòng)
 *   - Tạo HĐ mới: copy info HĐ cũ vừa terminate (giá, cọc, terms, Bên A), `start_date = today`,
 *     `end_date` = end_date HĐ cũ (giữ thời hạn) HOẶC today + 12 tháng nếu HĐ cũ không có
 *   - Room.status recompute → 'occupied' (vì có HĐ active mới)
 *
 * Service chỉ dùng cho promote — KHÔNG dùng khi tạo tenant mới (luồng đó dùng repo trực tiếp).
 */

import { getDb } from '../database';
import * as contractsRepo from '../database/repositories/contracts.repo';
import * as tenantsRepo from '../database/repositories/tenants.repo';
import * as roomsRepo from '../database/repositories/rooms.repo';
import type { ContractWithDetails, Tenant } from '../../src/shared/types';

function todayIso(): string {
   const d = new Date();
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMonths(isoDate: string, months: number): string {
   const d = new Date(isoDate);
   if (Number.isNaN(d.getTime())) return isoDate;
   d.setMonth(d.getMonth() + months);
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface PromoteResult {
   oldContract: ContractWithDetails | null;
   newContract: ContractWithDetails;
   oldPrimary: Tenant | null;
}

/**
 * Promote tenant lên đại diện phòng.
 * Bắt buộc: tenant phải thuộc 1 phòng (room_id != null) và phòng đó tồn tại HĐ active hoặc tenant đang ở.
 *
 * Lưu ý: nếu tenant đang đã là đại diện rồi → throw lỗi (no-op, tránh tạo HĐ trùng).
 */
export function promoteToPrimary(newPrimaryId: number): PromoteResult {
   const db = getDb();
   const today = todayIso();

   const newPrimary = tenantsRepo.getById(newPrimaryId);
   if (!newPrimary) throw new Error('Không tìm thấy khách thuê');
   if (!newPrimary.room_id) throw new Error('Khách thuê chưa thuộc phòng nào');
   if (newPrimary.is_primary === 1) {
      throw new Error('Khách thuê đã là người đại diện. Không cần thao tác.');
   }
   if (newPrimary.move_out_date) {
      throw new Error('Khách thuê đã rời phòng. Không thể đặt làm đại diện.');
   }

   const roomId = newPrimary.room_id;

   // --- Tìm đại diện cũ + HĐ active hiện tại của phòng ---
   const oldPrimary = db
      .prepare(
         `
         SELECT * FROM tenants
         WHERE room_id = ? AND is_primary = 1 AND move_out_date = ''
         LIMIT 1
         `
      )
      .get(roomId) as Tenant | undefined;

   const oldContract = db
      .prepare(
         `
         SELECT id, deposit, rent_price, end_date, terms,
                landlord_name, landlord_cccd, landlord_phone, landlord_address
         FROM contracts
         WHERE room_id = ? AND status = 'active'
         ORDER BY created_at DESC, id DESC
         LIMIT 1
         `
      )
      .get(roomId) as
      | {
           id: number;
           deposit: number;
           rent_price: number;
           end_date: string;
           terms: string;
           landlord_name: string;
           landlord_cccd: string;
           landlord_phone: string;
           landlord_address: string;
        }
      | undefined;

   // --- Run trong transaction ---
   const trx = db.transaction(() => {
      // 1. Đại diện cũ rời (move_out_date = today, is_primary = 0)
      if (oldPrimary) {
         db.prepare(
            'UPDATE tenants SET move_out_date = ?, is_primary = 0 WHERE id = ?'
         ).run(today, oldPrimary.id);
      }

      // 2. HĐ active cũ → terminated
      if (oldContract) {
         db.prepare("UPDATE contracts SET status = 'terminated' WHERE id = ?").run(
            oldContract.id
         );
      }

      // 3. Set tenant mới làm đại diện (trigger unset các tenant khác cùng phòng đã có)
      db.prepare('UPDATE tenants SET is_primary = 1 WHERE id = ?').run(newPrimaryId);
      db.prepare(
         'UPDATE tenants SET is_primary = 0 WHERE room_id = ? AND id <> ?'
      ).run(roomId, newPrimaryId);
   });

   trx();

   // --- 4. Tạo HĐ mới (ngoài transaction để dùng helper create) ---
   const newEndDate =
      oldContract?.end_date && oldContract.end_date > today
         ? oldContract.end_date
         : addMonths(today, 12);

   const newContract = contractsRepo.create({
      room_id: roomId,
      primary_tenant_id: newPrimaryId,
      deposit: oldContract?.deposit ?? 0,
      rent_price: oldContract?.rent_price ?? 0,
      start_date: today,
      end_date: newEndDate,
      terms: oldContract?.terms ?? '',
      landlord_name: oldContract?.landlord_name ?? '',
      landlord_cccd: oldContract?.landlord_cccd ?? '',
      landlord_phone: oldContract?.landlord_phone ?? '',
      landlord_address: oldContract?.landlord_address ?? '',
      status: 'active',
   });

   // 5. Recompute room status
   roomsRepo.recomputeStatus(roomId);

   return {
      oldContract: oldContract ? contractsRepo.getById(oldContract.id) : null,
      newContract,
      oldPrimary: oldPrimary ?? null,
   };
}

/**
 * Service combo: tạo khách thuê + xe + HĐ trong 1 transaction.
 * - tenantsData[0] = người đại diện (is_primary = 1)
 * - tenantsData[1..2] = người ở cùng (is_primary = 0)
 * - Mỗi tenant kèm list vehicles (0-n)
 *
 * Sau khi tạo: set room.status = 'occupied'.
 */
export interface AddTenantContractInput {
   room_id: number;
   tenants: Array<{
      full_name: string;
      dob?: string;
      phone?: string;
      cccd?: string;
      permanent_address?: string;
      move_in_date?: string;
      move_out_date?: string;
      vehicles?: Array<{ plate_number: string; vehicle_type: string }>;
   }>;
   contract: {
      rent_price: number;
      deposit: number;
      start_date: string;
      end_date: string;
      terms?: string;
      landlord_name: string;
      landlord_cccd: string;
      landlord_phone: string;
      landlord_address: string;
   };
}

export function createTenantsWithContract(
   data: AddTenantContractInput
): { tenant_ids: number[]; contract: ContractWithDetails } {
   if (!data.tenants.length) throw new Error('Phải có ít nhất 1 khách thuê');
   if (!data.tenants[0].full_name?.trim()) throw new Error('Người đại diện phải có họ tên');

   const db = getDb();
   const tenantIds: number[] = [];

   const trx = db.transaction(() => {
      // 1. Insert tenants — người đầu là primary, còn lại không
      data.tenants.forEach((t, idx) => {
         if (!t.full_name?.trim()) return; // skip rỗng
         const result = db
            .prepare(
               `
               INSERT INTO tenants (
                  room_id, full_name, cccd, dob, phone, permanent_address,
                  is_primary, move_in_date, move_out_date, deposit, note
               ) VALUES (
                  @room_id, @full_name, @cccd, @dob, @phone, @permanent_address,
                  @is_primary, @move_in_date, @move_out_date, 0, ''
               )
               `
            )
            .run({
               room_id: data.room_id,
               full_name: t.full_name.trim(),
               cccd: t.cccd ?? '',
               dob: t.dob ?? '',
               phone: t.phone ?? '',
               permanent_address: t.permanent_address ?? '',
               is_primary: idx === 0 ? 1 : 0,
               move_in_date: t.move_in_date ?? data.contract.start_date,
               move_out_date: t.move_out_date ?? '',
            });
         const tenantId = Number(result.lastInsertRowid);
         tenantIds.push(tenantId);

         // 2. Insert vehicles cho tenant này
         for (const v of t.vehicles ?? []) {
            if (!v.plate_number?.trim()) continue;
            db.prepare(
               `INSERT INTO vehicles (tenant_id, plate_number, vehicle_type, note) VALUES (?, ?, ?, '')`
            ).run(tenantId, v.plate_number.trim(), v.vehicle_type || 'motorbike');
         }
      });

      // 3. Đặt room status = 'occupied'
      db.prepare("UPDATE rooms SET status = 'occupied' WHERE id = ?").run(data.room_id);
   });

   trx();

   if (!tenantIds.length) throw new Error('Không tạo được khách thuê nào (tên rỗng?)');

   // 4. Tạo HĐ (ngoài transaction để dùng helper create — vẫn an toàn vì tenants đã commit)
   const contract = contractsRepo.create({
      room_id: data.room_id,
      primary_tenant_id: tenantIds[0],
      deposit: data.contract.deposit,
      rent_price: data.contract.rent_price,
      start_date: data.contract.start_date,
      end_date: data.contract.end_date,
      terms: data.contract.terms ?? '',
      landlord_name: data.contract.landlord_name,
      landlord_cccd: data.contract.landlord_cccd,
      landlord_phone: data.contract.landlord_phone,
      landlord_address: data.contract.landlord_address,
      status: 'active',
   });

   return { tenant_ids: tenantIds, contract };
}
