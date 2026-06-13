/**
 * Repository hóa đơn: query, tạo invoice kèm dịch vụ và cập nhật trạng thái thanh toán.
 */

import { getDb } from '../index';
import type {
   Invoice,
   InvoiceService,
   InvoiceStatus,
   InvoiceWithDetails,
} from '../../../src/shared/types';

export interface InvoiceInput {
   room_id: number;
   contract_id?: number | null;
   period: string;
   room_fee?: number;
   electric_fee?: number;
   water_fee?: number;
   service_fee?: number;
   total?: number;
   paid_amount?: number;
   status?: InvoiceStatus;
   note?: string;
}

export interface InvoiceServiceInput {
   service_id?: number | null;
   service_name: string;
   quantity?: number;
   unit_price?: number;
   amount?: number;
}

export type InvoicePatch = Partial<Omit<InvoiceInput, 'room_id' | 'period'>>;

const invoiceWithDetailsSelect = `
   SELECT
      i.*,
      r.name AS room_name,
      r.area_id AS area_id,
      a.name AS area_name,
      t.full_name AS tenant_name,
      t.phone AS tenant_phone
   FROM invoices i
   JOIN rooms r ON r.id = i.room_id
   JOIN areas a ON a.id = r.area_id
   LEFT JOIN tenants t ON t.room_id = r.id AND t.is_primary = 1 AND t.move_out_date = ''
`;

function listServices(invoiceId: number): InvoiceService[] {
   const db = getDb();
   return db
      .prepare('SELECT * FROM invoice_services WHERE invoice_id = ? ORDER BY id ASC')
      .all(invoiceId) as InvoiceService[];
}

export function listByPeriod(period: string): InvoiceWithDetails[] {
   const db = getDb();
   return db
      .prepare(`${invoiceWithDetailsSelect} WHERE i.period = ? ORDER BY r.name ASC`)
      .all(period) as InvoiceWithDetails[];
}

export function listByRoom(roomId: number): InvoiceWithDetails[] {
   const db = getDb();
   return db
      .prepare(`${invoiceWithDetailsSelect} WHERE i.room_id = ? ORDER BY i.period DESC`)
      .all(roomId) as InvoiceWithDetails[];
}

export function listUnpaid(): InvoiceWithDetails[] {
   const db = getDb();
   return db
      .prepare(
         `
         ${invoiceWithDetailsSelect}
         WHERE i.status <> 'paid'
         ORDER BY date(i.created_at) ASC, i.id ASC
      `
      )
      .all() as InvoiceWithDetails[];
}

export function getById(id: number): InvoiceWithDetails | null {
   const db = getDb();
   const invoice =
      (db.prepare(`${invoiceWithDetailsSelect} WHERE i.id = ?`).get(id) as
         | InvoiceWithDetails
         | undefined) ?? null;

   if (!invoice) return null;
   invoice.services = listServices(id);
   return invoice;
}

export function create(invoice: InvoiceInput, services: InvoiceServiceInput[] = []): InvoiceWithDetails {
   const db = getDb();
   const trx = db.transaction(() => {
      const result = db
         .prepare(
            `
            INSERT INTO invoices (
               room_id, contract_id, period, room_fee, electric_fee, water_fee,
               service_fee, total, paid_amount, status, note
            )
            VALUES (
               @room_id, @contract_id, @period, @room_fee, @electric_fee, @water_fee,
               @service_fee, @total, @paid_amount, @status, @note
            )
         `
         )
         .run({
            room_id: invoice.room_id,
            contract_id: invoice.contract_id ?? null,
            period: invoice.period,
            room_fee: invoice.room_fee ?? 0,
            electric_fee: invoice.electric_fee ?? 0,
            water_fee: invoice.water_fee ?? 0,
            service_fee: invoice.service_fee ?? 0,
            total: invoice.total ?? 0,
            paid_amount: invoice.paid_amount ?? 0,
            status: invoice.status ?? 'unpaid',
            note: invoice.note ?? '',
         });

      const invoiceId = Number(result.lastInsertRowid);
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

      for (const service of services) {
         insertService.run({
            invoice_id: invoiceId,
            service_id: service.service_id ?? null,
            service_name: service.service_name,
            quantity: service.quantity ?? 1,
            unit_price: service.unit_price ?? 0,
            amount: service.amount ?? (service.quantity ?? 1) * (service.unit_price ?? 0),
         });
      }

      return invoiceId;
   });

   const created = getById(trx());
   if (!created) throw new Error('Tạo hóa đơn thất bại');
   return created;
}

export function update(id: number, patch: InvoicePatch): InvoiceWithDetails | null {
   const fields: string[] = [];
   const params: Record<string, number | string | null> = { id };
   const keys = [
      'contract_id',
      'room_fee',
      'electric_fee',
      'water_fee',
      'service_fee',
      'total',
      'paid_amount',
      'status',
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
   db.prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE id = @id`).run(params);
   return getById(id);
}

export function recalcStatus(invoiceId: number): InvoiceWithDetails | null {
   const db = getDb();
   const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as
      | Invoice
      | undefined;
   if (!invoice) return null;

   const row = db
      .prepare('SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE invoice_id = ?')
      .get(invoiceId) as { total_paid: number };

   const paidAmount = row.total_paid;
   const status: InvoiceStatus =
      paidAmount >= invoice.total && invoice.total >= 0
         ? 'paid'
         : paidAmount > 0
           ? 'partial'
           : 'unpaid';

   db.prepare('UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?').run(
      paidAmount,
      status,
      invoiceId
   );

   return getById(invoiceId);
}
