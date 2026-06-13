/**
 * Repository thanh toán: ghi nhận tiền thu và cập nhật trạng thái hóa đơn.
 */

import { getDb } from '../index';
import type { Payment, PaymentMethod } from '../../../src/shared/types';
import * as invoicesRepo from './invoices.repo';
import * as roomsRepo from './rooms.repo';

export interface PaymentInput {
   invoice_id: number;
   amount: number;
   method?: PaymentMethod;
   paid_at?: string;
   note?: string;
}

export function listByInvoice(invoiceId: number): Payment[] {
   const db = getDb();
   return db
      .prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC, id DESC')
      .all(invoiceId) as Payment[];
}

export function getById(id: number): Payment | null {
   const db = getDb();
   return (db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment | undefined) ?? null;
}

export function create(data: PaymentInput): Payment {
   const db = getDb();

   // Chuẩn hóa paid_at: nếu user truyền YYYY-MM-DD (từ date picker) thì pad thành full datetime
   // để ORDER BY paid_at DESC ổn định (nếu mix YYYY-MM-DD và YYYY-MM-DD HH:MM:SS sẽ sort sai).
   let normalizedPaidAt: string | null = null;
   if (data.paid_at) {
      normalizedPaidAt = /^\d{4}-\d{2}-\d{2}$/.test(data.paid_at)
         ? `${data.paid_at} 00:00:00`
         : data.paid_at;
   }

   const result = db
      .prepare(
         `
         INSERT INTO payments (invoice_id, amount, method, paid_at, note)
         VALUES (@invoice_id, @amount, @method, COALESCE(@paid_at, datetime('now')), @note)
      `
      )
      .run({
         invoice_id: data.invoice_id,
         amount: data.amount,
         method: data.method ?? 'cash',
         paid_at: normalizedPaidAt,
         note: data.note ?? '',
      });

   // Cập nhật invoice status + paid_amount
   const updatedInvoice = invoicesRepo.recalcStatus(data.invoice_id);

   // Cập nhật room status: nếu invoice giờ paid → có thể chuyển 'debt' → 'occupied'
   if (updatedInvoice) {
      roomsRepo.recomputeStatus(updatedInvoice.room_id);
   }

   const payment = getById(Number(result.lastInsertRowid));
   if (!payment) throw new Error('Tạo thanh toán thất bại');
   return payment;
}
