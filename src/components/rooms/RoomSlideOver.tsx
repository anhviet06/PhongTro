/**
 * Slide-over xem nhanh thông tin phòng.
 */

import { X, FileText, PenLine, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RoomWithArea, Tenant } from '../../shared/types';
import Chip from '../Chip';
import { formatVND } from '../../lib/format';

interface RoomSlideOverProps {
   room: RoomWithArea | null;
   tenants: Tenant[];
   open: boolean;
   onClose: () => void;
   onEdit: () => void;
}

function statusLabel(status: RoomWithArea['status']) {
   if (status === 'vacant') return 'Phòng trống';
   if (status === 'occupied') return 'Đã thuê';
   return 'Nợ tiền';
}

function statusTone(status: RoomWithArea['status']) {
   if (status === 'vacant') return 'primary';
   if (status === 'occupied') return 'success';
   return 'danger';
}

export default function RoomSlideOver({ room, tenants, open, onClose, onEdit }: RoomSlideOverProps) {
   const navigate = useNavigate();

   if (!open || !room) return null;

   const activeTenants = tenants.filter((tenant) => tenant.move_out_date === '');
   const primaryTenant =
      activeTenants.find((tenant) => tenant.is_primary === 1) ?? activeTenants[0];
   const otherTenants = activeTenants.filter((tenant) => tenant.id !== primaryTenant?.id);

   const handleViewContract = () => {
      // Navigate sang trang Hợp đồng kèm query roomId — Contracts.tsx có thể đọc query này
      // để filter/highlight HĐ của phòng này (giai đoạn đầu chỉ navigate, sau sẽ enhance).
      navigate(`/contracts?roomId=${room.id}`);
      onClose();
   };

   return (
      <div className="fixed inset-0 z-40">
         <button
            type="button"
            className="absolute inset-0 bg-black/20"
            onClick={onClose}
            aria-label="Đóng"
         />
         <aside
            className="animate-slide-over absolute bottom-0 right-0 top-0 w-full overflow-y-auto border-l border-outline-variant bg-surface-container-lowest p-lg shadow-xl"
            style={{ maxWidth: '480px' }}
         >
            <div className="flex items-start justify-between gap-md">
               <div>
                  <h3 className="text-4xl font-bold text-primary">{room.name}</h3>
                  <p className="mt-xs text-body-md text-on-surface-variant">
                     {room.area_name} · Tầng {room.floor}
                  </p>
               </div>
               <button
                  type="button"
                  onClick={onClose}
                  className="focus-ring grid h-10 w-10 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
                  title="Đóng"
               >
                  <X className="h-5 w-5" />
               </button>
            </div>

            <div className="mt-lg grid grid-cols-2 gap-sm">
               <div className="rounded-lg bg-surface-container-low p-md">
                  <p className="text-label-sm text-on-surface-variant">Giá phòng</p>
                  <p className="mt-xs text-headline-sm text-on-surface">{formatVND(room.price)}</p>
               </div>
               <div className="rounded-lg bg-surface-container-low p-md">
                  <p className="text-label-sm text-on-surface-variant">Diện tích</p>
                  <p className="mt-xs text-headline-sm text-on-surface">{room.area_m2 || 0} m²</p>
               </div>
            </div>

            <div className="mt-md">
               <Chip tone={statusTone(room.status)}>{statusLabel(room.status)}</Chip>
            </div>

            <section className="mt-lg rounded-lg border border-outline-variant bg-surface-container-low p-md">
               <div className="flex items-center justify-between gap-sm">
                  <h4 className="text-headline-sm text-on-surface">Khách thuê</h4>
                  <span className="flex items-center gap-xs rounded-full bg-surface-container-high px-sm py-xs text-label-sm text-on-surface-variant">
                     <Users className="h-4 w-4" />
                     {activeTenants.length}/{room.max_people} người
                  </span>
               </div>
               {primaryTenant ? (
                  <>
                     <div className="mt-md flex items-center gap-sm">
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-on-primary">
                           {primaryTenant.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-xs">
                              <p className="truncate text-body-lg font-semibold text-on-surface">
                                 {primaryTenant.full_name}
                              </p>
                              <span className="shrink-0 rounded-full bg-primary-fixed px-xs text-label-sm text-primary">
                                 Đại diện
                              </span>
                           </div>
                           <p className="text-body-md text-on-surface-variant">
                              {primaryTenant.phone || 'Chưa có SĐT'}
                           </p>
                        </div>
                     </div>
                     {otherTenants.length > 0 && (
                        <ul className="mt-sm space-y-xs border-t border-outline-variant pt-sm">
                           {otherTenants.map((tenant) => (
                              <li key={tenant.id} className="flex items-center gap-sm">
                                 <div className="grid h-8 w-8 place-items-center rounded-full bg-surface-container-high text-on-surface-variant">
                                    {tenant.full_name.charAt(0).toUpperCase()}
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <p className="truncate text-body-md text-on-surface">
                                       {tenant.full_name}
                                    </p>
                                    <p className="truncate text-label-sm text-on-surface-variant">
                                       {tenant.phone || 'Chưa có SĐT'}
                                    </p>
                                 </div>
                              </li>
                           ))}
                        </ul>
                     )}
                  </>
               ) : (
                  <p className="mt-md text-body-md text-on-surface-variant">
                     Phòng chưa có khách thuê.
                  </p>
               )}
            </section>

            <div className="mt-lg grid gap-sm">
               <button
                  type="button"
                  onClick={handleViewContract}
                  disabled={room.status === 'vacant'}
                  className="focus-ring flex h-11 items-center justify-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                  title={room.status === 'vacant' ? 'Phòng trống chưa có hợp đồng' : 'Xem chi tiết hợp đồng'}
               >
                  <FileText className="h-5 w-5" />
                  <span>Xem chi tiết hợp đồng</span>
               </button>
               <button
                  type="button"
                  onClick={onEdit}
                  className="focus-ring flex h-11 items-center justify-center gap-sm rounded-lg border border-outline-variant px-md font-semibold text-primary hover:bg-primary-fixed"
               >
                  <PenLine className="h-5 w-5" />
                  <span>Chỉnh sửa thông tin</span>
               </button>
            </div>
         </aside>
      </div>
   );
}
