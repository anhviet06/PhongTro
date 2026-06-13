/**
 * Modal chuẩn bị nội dung thông báo hóa đơn.
 */

import type { InvoiceWithDetails } from '../../shared/types';
import Dialog from '../Dialog';
import { formatVND } from '../../lib/format';

interface SendNotifyModalProps {
   invoice: InvoiceWithDetails | null;
   open: boolean;
   onClose: () => void;
}

export default function SendNotifyModal({ invoice, open, onClose }: SendNotifyModalProps) {
   const message = invoice
      ? `Thông báo hóa đơn phòng ${invoice.room_name} kỳ ${invoice.period}: tổng tiền ${formatVND(invoice.total)}, đã thu ${formatVND(invoice.paid_amount)}, còn nợ ${formatVND(invoice.total - invoice.paid_amount)}.`
      : '';

   return (
      <Dialog open={open} title="Nội dung thông báo" onClose={onClose}>
         <div className="space-y-md">
            <p className="text-body-md text-on-surface-variant">
               Số điện thoại: {invoice?.tenant_phone || 'Chưa có'}
            </p>
            <textarea
               readOnly
               value={message}
               className="min-h-32 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm outline-none"
            />
         </div>
      </Dialog>
   );
}
