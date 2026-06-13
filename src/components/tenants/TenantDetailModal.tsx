/**
 * Modal chi tiết khách thuê.
 */

import type { TenantWithRoom } from '../../shared/types';
import Dialog from '../Dialog';
import { formatDate, formatVND } from '../../lib/format';
import VehicleManager from './VehicleManager';

interface TenantDetailModalProps {
   open: boolean;
   tenant: TenantWithRoom | null;
   onClose: () => void;
}

export default function TenantDetailModal({ open, tenant, onClose }: TenantDetailModalProps) {
   return (
      <Dialog open={open} title="Chi tiết khách thuê" onClose={onClose}>
         {tenant && (
            <div className="space-y-md">
               <section className="grid gap-sm md:grid-cols-2">
                  <Info label="Họ tên" value={tenant.full_name} />
                  <Info label="Số điện thoại" value={tenant.phone || '-'} />
                  <Info label="CCCD" value={tenant.cccd || '-'} />
                  <Info label="Ngày sinh" value={formatDate(tenant.dob) || '-'} />
                  <Info label="Phòng" value={tenant.room_name ?? 'Chưa gán phòng'} />
                  <Info label="Khu" value={tenant.area_name ?? '-'} />
                  <Info label="Ngày vào" value={formatDate(tenant.move_in_date) || '-'} />
                  <Info label="Tiền cọc" value={formatVND(tenant.deposit)} />
                  <div className="md:col-span-2">
                     <Info label="Thường trú" value={tenant.permanent_address || '-'} />
                  </div>
               </section>

               <VehicleManager tenantId={tenant.id} />
            </div>
         )}
      </Dialog>
   );
}

function Info({ label, value }: { label: string; value: string }) {
   return (
      <div className="rounded-lg bg-surface-container-low p-sm">
         <p className="text-label-sm text-on-surface-variant">{label}</p>
         <p className="mt-xs text-body-md font-medium text-on-surface">{value}</p>
      </div>
   );
}
