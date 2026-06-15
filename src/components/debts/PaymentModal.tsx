/**
 * Modal ghi nhận thanh toán cho hóa đơn nợ.
 */

import { useEffect, useState } from 'react';
import type { InvoiceWithDetails, Payment, PaymentMethod } from '../../shared/types';
import Dialog from '../Dialog';
import MoneyInput from '../MoneyInput';
import { formatVND } from '../../lib/format';
import PaymentHistory from './PaymentHistory';

interface PaymentModalProps {
   open: boolean;
   invoice: InvoiceWithDetails | null;
   onClose: () => void;
   onPaid: () => void;
}

export default function PaymentModal({ open, invoice, onClose, onPaid }: PaymentModalProps) {
   const [amount, setAmount] = useState(0);
   const [method, setMethod] = useState<PaymentMethod>('cash');
   const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
   const [note, setNote] = useState('');
   const [payments, setPayments] = useState<Payment[]>([]);
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      if (!open || !invoice) return;
      const debt = Math.max(0, invoice.total - invoice.paid_amount);
      setAmount(debt);
      setMethod('cash');
      setPaidAt(new Date().toISOString().slice(0, 10));
      setNote('');
      window.api.payments.listByInvoice(invoice.id).then(setPayments);
   }, [invoice, open]);

   const submit = async () => {
      if (!invoice || amount <= 0) return;
      setSaving(true);
      try {
         await window.api.payments.create({
            invoice_id: invoice.id,
            amount,
            method,
            paid_at: paidAt,
            note,
         });
         onPaid();
         onClose();
      } finally {
         setSaving(false);
      }
   };

   const debt = invoice ? Math.max(0, invoice.total - invoice.paid_amount) : 0;

   return (
      <Dialog
         open={open}
         title="Ghi nhận thanh toán"
         size="lg"
         onClose={onClose}
         footer={
            <>
               <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-lg border border-outline-variant px-md text-on-surface hover:bg-surface-container-high"
               >
                  Hủy
               </button>
               <button
                  type="button"
                  onClick={submit}
                  disabled={saving || amount <= 0}
                  className="h-10 rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
               >
                  Ghi nhận
               </button>
            </>
         }
      >
         {invoice && (
            <div className="space-y-md">
               <section className="grid gap-sm md:grid-cols-3">
                  <Info label="Phòng" value={invoice.room_name} />
                  <Info label="Tổng tiền" value={formatVND(invoice.total)} />
                  <Info label="Còn nợ" value={formatVND(debt)} />
               </section>

               <section className="grid gap-md md:grid-cols-2">
                  <label className="block">
                     <span className="text-label-sm text-on-surface-variant">Số tiền thanh toán (đ)</span>
                     <MoneyInput
                        value={amount}
                        onChange={setAmount}
                        className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                     />
                  </label>
                  <label className="block">
                     <span className="text-label-sm text-on-surface-variant">Ngày thanh toán</span>
                     <input
                        type="date"
                        value={paidAt}
                        onChange={(event) => setPaidAt(event.target.value)}
                        className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                     />
                  </label>
                  <label className="block md:col-span-2">
                     <span className="text-label-sm text-on-surface-variant">Hình thức</span>
                     <div className="mt-xs flex gap-sm">
                        {[
                           ['cash', 'Tiền mặt'],
                           ['transfer', 'Chuyển khoản'],
                        ].map(([value, label]) => (
                           <button
                              key={value}
                              type="button"
                              onClick={() => setMethod(value as PaymentMethod)}
                              className={[
                                 'h-10 rounded-lg border px-md font-medium',
                                 method === value
                                    ? 'border-primary bg-primary-fixed text-primary'
                                    : 'border-outline-variant text-on-surface hover:bg-surface-container-high',
                              ].join(' ')}
                           >
                              {label}
                           </button>
                        ))}
                     </div>
                  </label>
                  <label className="block md:col-span-2">
                     <span className="text-label-sm text-on-surface-variant">Ghi chú</span>
                     <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        className="mt-xs min-h-20 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm outline-none focus:border-primary"
                     />
                  </label>
               </section>

               <PaymentHistory payments={payments} />
            </div>
         )}
      </Dialog>
   );
}

function Info({ label, value }: { label: string; value: string }) {
   return (
      <div className="rounded-lg bg-surface-container-low p-sm">
         <p className="text-label-sm text-on-surface-variant">{label}</p>
         <p className="mt-xs font-semibold text-on-surface">{value}</p>
      </div>
   );
}
