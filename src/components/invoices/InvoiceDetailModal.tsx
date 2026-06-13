/**
 * Modal xem chi tiết hóa đơn.
 */

import type { InvoiceWithDetails } from '../../shared/types';
import Dialog from '../Dialog';
import Chip from '../Chip';
import { formatVND } from '../../lib/format';

interface InvoiceDetailModalProps {
   invoice: InvoiceWithDetails | null;
   open: boolean;
   onClose: () => void;
}

export default function InvoiceDetailModal({ invoice, open, onClose }: InvoiceDetailModalProps) {
   return (
      <Dialog open={open} title="Chi tiết hóa đơn" onClose={onClose}>
         {invoice && (
            <div className="space-y-md">
               <div className="flex flex-wrap items-center justify-between gap-md rounded-lg bg-surface-container-low p-md">
                  <div>
                     <p className="text-headline-sm text-primary">{invoice.room_name}</p>
                     <p className="text-body-md text-on-surface-variant">
                        {invoice.area_name} · {invoice.period}
                     </p>
                  </div>
                  <Chip tone={invoice.status === 'paid' ? 'success' : invoice.status === 'partial' ? 'warning' : 'danger'}>
                     {invoice.status}
                  </Chip>
               </div>

               <div className="space-y-sm">
                  <Line label="Tiền phòng" value={invoice.room_fee} />
                  <Line label="Tiền điện" value={invoice.electric_fee} />
                  <Line label="Tiền nước" value={invoice.water_fee} />
                  <Line label="Dịch vụ" value={invoice.service_fee} />
                  {invoice.services?.map((service) => (
                     <div
                        key={service.id}
                        className="flex items-center justify-between gap-md rounded-lg bg-surface-container-low px-md py-sm text-body-md"
                     >
                        <span className="text-on-surface-variant">
                           {service.service_name} x {service.quantity}
                        </span>
                        <span className="font-medium text-on-surface">{formatVND(service.amount)}</span>
                     </div>
                  ))}
               </div>

               <div className="rounded-lg bg-primary-fixed p-md">
                  <div className="flex items-center justify-between gap-md">
                     <span className="text-headline-sm text-primary">Tổng tiền</span>
                     <span className="text-headline-sm font-bold text-primary">{formatVND(invoice.total)}</span>
                  </div>
                  <div className="mt-xs flex items-center justify-between gap-md text-body-md text-on-primary-fixed-variant">
                     <span>Đã thu</span>
                     <span>{formatVND(invoice.paid_amount)}</span>
                  </div>
               </div>
            </div>
         )}
      </Dialog>
   );
}

function Line({ label, value }: { label: string; value: number }) {
   return (
      <div className="flex items-center justify-between gap-md rounded-lg bg-surface-container-low px-md py-sm text-body-md">
         <span className="text-on-surface-variant">{label}</span>
         <span className="font-medium text-on-surface">{formatVND(value)}</span>
      </div>
   );
}
