/**
 * Preview tổng tiền hóa đơn trước khi tạo.
 */

import type { BillingResult } from '../../shared/types';
import { formatVND } from '../../lib/format';

interface BillingPreviewProps {
   preview: BillingResult | null;
   peopleCount: number;
}

export default function BillingPreview({ preview, peopleCount }: BillingPreviewProps) {
   return (
      <section className="rounded-lg bg-surface-container-low p-md">
         <h4 className="text-headline-sm text-on-surface">Phí dịch vụ cố định</h4>
         <div className="mt-md space-y-sm">
            {!preview || preview.services.length === 0 ? (
               <p className="text-body-md text-on-surface-variant">Chưa có dịch vụ đang áp dụng.</p>
            ) : (
               preview.services.map((service, index) => (
                  <div key={`${service.service_name}-${index}`} className="flex items-center justify-between gap-md">
                     <div>
                        <p className="font-medium text-on-surface">{service.service_name}</p>
                        <p className="text-body-md text-on-surface-variant">
                           {service.quantity === peopleCount ? `${peopleCount} người` : 'Theo phòng'}
                        </p>
                     </div>
                     <p className="font-semibold text-on-surface">{formatVND(service.amount)}</p>
                  </div>
               ))
            )}
         </div>

         <div className="mt-md space-y-xs border-t border-outline-variant pt-md">
            <Summary label="Tiền phòng" value={preview?.room_fee ?? 0} />
            <Summary label="Tiền điện" value={preview?.electric_fee ?? 0} />
            <Summary label="Tiền nước" value={preview?.water_fee ?? 0} />
            <Summary label="Dịch vụ" value={preview?.service_fee ?? 0} />
            <div className="flex items-center justify-between gap-md pt-sm">
               <span className="text-headline-sm text-on-surface">Tổng dự kiến</span>
               <span className="text-headline-sm font-bold text-primary">
                  {formatVND(preview?.total ?? 0)}
               </span>
            </div>
         </div>
      </section>
   );
}

function Summary({ label, value }: { label: string; value: number }) {
   return (
      <div className="flex items-center justify-between gap-md text-body-md">
         <span className="text-on-surface-variant">{label}</span>
         <span className="font-medium text-on-surface">{formatVND(value)}</span>
      </div>
   );
}
