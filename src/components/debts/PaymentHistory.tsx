/**
 * Lịch sử thanh toán của một hóa đơn.
 */

import type { Payment } from '../../shared/types';
import { formatDate, formatVND } from '../../lib/format';

interface PaymentHistoryProps {
   payments: Payment[];
}

export default function PaymentHistory({ payments }: PaymentHistoryProps) {
   return (
      <section className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
         <h4 className="text-headline-sm text-on-surface">Lịch sử thanh toán</h4>
         <div className="mt-md space-y-sm">
            {payments.length === 0 ? (
               <p className="text-body-md text-on-surface-variant">Chưa có thanh toán.</p>
            ) : (
               payments.map((payment) => (
                  <div
                     key={payment.id}
                     className="flex items-center justify-between gap-md rounded-lg bg-surface-container-lowest px-md py-sm"
                  >
                     <div>
                        <p className="font-semibold text-on-surface">{formatVND(payment.amount)}</p>
                        <p className="text-body-md text-on-surface-variant">
                           {formatDate(payment.paid_at)} · {payment.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                        </p>
                     </div>
                     {payment.note && (
                        <p className="max-w-40 truncate text-body-md text-on-surface-variant">
                           {payment.note}
                        </p>
                     )}
                  </div>
               ))
            )}
         </div>
      </section>
   );
}
