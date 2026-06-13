/**
 * Billing service: tính tiền điện/nước/dịch vụ và tạo hóa đơn theo kỳ.
 */

import { getDb } from '../database';
import * as roomsRepo from '../database/repositories/rooms.repo';
import * as servicesRepo from '../database/repositories/services.repo';
import * as tenantsRepo from '../database/repositories/tenants.repo';
import * as contractsRepo from '../database/repositories/contracts.repo';
import * as metersRepo from '../database/repositories/meters.repo';
import * as invoicesRepo from '../database/repositories/invoices.repo';
import type {
   BillingResult,
   BillingServiceLine,
} from '../../src/shared/types';

export interface BillingServiceInput {
   service_id?: number | null;
   service_name: string;
   quantity?: number;
   unit_price?: number;
   amount?: number;
}

export interface CreateInvoiceInput {
   room_id: number;
   period: string;
   electric_end: number;
   water_end: number;
   electric_start?: number;
   water_start?: number;
   override_services?: BillingServiceInput[];
   note?: string;
}

export interface UpdateInvoiceInput {
   room_fee?: number;
   electric_fee?: number;
   water_fee?: number;
   service_fee?: number;
   total?: number;
   note?: string;
   services?: BillingServiceInput[];
}

function assertPeriod(period: string): void {
   if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new Error('Kỳ hóa đơn phải đúng định dạng YYYY-MM');
   }
}

function resolveMeterStarts(input: CreateInvoiceInput): { electric_start: number; water_start: number } {
   const previous = metersRepo.getPrevious(input.room_id, input.period);
   if (previous) {
      return {
         electric_start: previous.electric_end,
         water_start: previous.water_end,
      };
   }

   if (input.electric_start === undefined || input.water_start === undefined) {
      throw new Error('Lần đầu tạo hóa đơn cần nhập chỉ số điện/nước đầu kỳ');
   }

   return {
      electric_start: input.electric_start,
      water_start: input.water_start,
   };
}

function getActiveContractId(roomId: number): number | null {
   const contracts = contractsRepo.listByRoom(roomId);
   return contracts.find((contract) => contract.status === 'active')?.id ?? null;
}

function buildServiceLines(
   roomId: number,
   overrides?: BillingServiceInput[]
): BillingServiceLine[] {
   if (overrides?.length) {
      return overrides.map((service) => {
         const quantity = service.quantity ?? 1;
         const unitPrice = service.unit_price ?? 0;
         return {
            service_id: service.service_id ?? null,
            service_name: service.service_name,
            quantity,
            unit_price: unitPrice,
            amount: service.amount ?? quantity * unitPrice,
         };
      });
   }

   const peopleCount = tenantsRepo.countActiveInRoom(roomId);
   return servicesRepo.listActive().map((service) => {
      const quantity = service.per_person ? peopleCount : 1;
      return {
         service_id: service.id,
         service_name: service.name,
         quantity,
         unit_price: service.unit_price,
         amount: quantity * service.unit_price,
      };
   });
}

export function previewInvoice(input: CreateInvoiceInput): BillingResult {
   assertPeriod(input.period);

   const room = roomsRepo.getById(input.room_id);
   if (!room) throw new Error('Phòng không tồn tại');

   const starts = resolveMeterStarts(input);
   if (input.electric_end < starts.electric_start) {
      throw new Error('Chỉ số điện mới không được nhỏ hơn chỉ số cũ');
   }
   if (input.water_end < starts.water_start) {
      throw new Error('Chỉ số nước mới không được nhỏ hơn chỉ số cũ');
   }

   const serviceLines = buildServiceLines(input.room_id, input.override_services);
   const roomFee = room.price;
   const electricFee = (input.electric_end - starts.electric_start) * room.electric_unit_price;
   const waterFee = (input.water_end - starts.water_start) * room.water_unit_price;
   const serviceFee = serviceLines.reduce((sum, service) => sum + service.amount, 0);
   const total = roomFee + electricFee + waterFee + serviceFee;

   return {
      room_id: input.room_id,
      contract_id: getActiveContractId(input.room_id),
      period: input.period,
      room_fee: roomFee,
      electric_fee: electricFee,
      water_fee: waterFee,
      service_fee: serviceFee,
      total,
      meter: {
         room_id: input.room_id,
         period: input.period,
         electric_start: starts.electric_start,
         electric_end: input.electric_end,
         water_start: starts.water_start,
         water_end: input.water_end,
      },
      services: serviceLines,
   };
}

export function createInvoice(input: CreateInvoiceInput): BillingResult {
   const preview = previewInvoice(input);
   const db = getDb();

   // Check trùng kỳ trước khi insert — schema có UNIQUE(room_id, period) trên cả
   // meter_readings và invoices, sẽ throw raw SQLite error nếu trùng. Báo lỗi thân thiện hơn.
   const existing = db
      .prepare('SELECT id FROM invoices WHERE room_id = ? AND period = ?')
      .get(input.room_id, input.period) as { id: number } | undefined;
   if (existing) {
      throw new Error(
         `Phòng đã có hóa đơn kỳ ${input.period} (ID #${existing.id}). Vào trang Hóa đơn để chỉnh sửa.`
      );
   }

   const createTransaction = db.transaction(() => {
      db.prepare(
         `
         INSERT INTO meter_readings (
            room_id, period, electric_start, electric_end, water_start, water_end
         )
         VALUES (
            @room_id, @period, @electric_start, @electric_end, @water_start, @water_end
         )
      `
      ).run(preview.meter);

      const invoiceResult = db
         .prepare(
            `
            INSERT INTO invoices (
               room_id, contract_id, period, room_fee, electric_fee, water_fee,
               service_fee, total, paid_amount, status, note
            )
            VALUES (
               @room_id, @contract_id, @period, @room_fee, @electric_fee, @water_fee,
               @service_fee, @total, 0, 'unpaid', @note
            )
         `
         )
         .run({
            room_id: preview.room_id,
            contract_id: preview.contract_id,
            period: preview.period,
            room_fee: preview.room_fee,
            electric_fee: preview.electric_fee,
            water_fee: preview.water_fee,
            service_fee: preview.service_fee,
            total: preview.total,
            note: input.note ?? '',
         });

      const invoiceId = Number(invoiceResult.lastInsertRowid);
      const insertService = db.prepare(
         `
         INSERT INTO invoice_services (
            invoice_id, service_id, service_name, quantity, unit_price, amount
         )
         VALUES (
            @invoice_id, @service_id, @service_name, @quantity, @unit_price, @amount
         )
      `
      );

      for (const service of preview.services) {
         insertService.run({ invoice_id: invoiceId, ...service });
      }

      return invoiceId;
   });

   const invoice = invoicesRepo.getById(createTransaction());
   if (!invoice) throw new Error('Tạo hóa đơn thất bại');

   // Cập nhật room.status theo spec Mục 6.2: lần đầu có HĐ → 'occupied'; có quá hạn → 'debt'.
   // Dùng helper recomputeStatus (raw SQL) — single source of truth, không circular dep.
   roomsRepo.recomputeStatus(input.room_id);

   return { ...preview, invoice };
}

export function updateInvoice(id: number, patch: UpdateInvoiceInput) {
   const db = getDb();
   const updateTransaction = db.transaction(() => {
      const fields: string[] = [];
      const params: Record<string, number | string> = { id };

      for (const key of ['room_fee', 'electric_fee', 'water_fee', 'service_fee', 'total', 'note'] as const) {
         if (patch[key] !== undefined) {
            fields.push(`${key} = @${key}`);
            params[key] = patch[key] as number | string;
         }
      }

      if (fields.length) {
         db.prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE id = @id`).run(params);
      }

      if (patch.services) {
         db.prepare('DELETE FROM invoice_services WHERE invoice_id = ?').run(id);
         const insertService = db.prepare(
            `
            INSERT INTO invoice_services (
               invoice_id, service_id, service_name, quantity, unit_price, amount
            )
            VALUES (
               @invoice_id, @service_id, @service_name, @quantity, @unit_price, @amount
            )
         `
         );

         for (const service of patch.services) {
            const quantity = service.quantity ?? 1;
            const unitPrice = service.unit_price ?? 0;
            insertService.run({
               invoice_id: id,
               service_id: service.service_id ?? null,
               service_name: service.service_name,
               quantity,
               unit_price: unitPrice,
               amount: service.amount ?? quantity * unitPrice,
            });
         }
      }
   });

   updateTransaction();
   return invoicesRepo.getById(id);
}
