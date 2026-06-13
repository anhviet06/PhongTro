/**
 * Bảng danh sách khách thuê.
 */

import { Eye } from 'lucide-react';
import type { TenantWithRoom } from '../../shared/types';
import Chip from '../Chip';
import { formatDate } from '../../lib/format';

interface TenantTableProps {
   tenants: TenantWithRoom[];
   onDetail: (tenant: TenantWithRoom) => void;
}

export default function TenantTable({ tenants, onDetail }: TenantTableProps) {
   return (
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
               <thead className="bg-surface-container-low">
                  <tr className="text-label-md uppercase text-on-surface-variant">
                     <th className="px-md py-sm">Họ và tên</th>
                     <th className="px-md py-sm">Số điện thoại</th>
                     <th className="px-md py-sm">Phòng</th>
                     <th className="px-md py-sm">Ngày bắt đầu</th>
                     <th className="px-md py-sm">Trạng thái</th>
                     <th className="px-md py-sm text-right">Thao tác</th>
                  </tr>
               </thead>
               <tbody>
                  {tenants.map((tenant) => {
                     const active = !tenant.move_out_date;
                     return (
                        <tr
                           key={tenant.id}
                           className="border-t border-outline-variant hover:bg-surface-container-low"
                        >
                           <td className="px-md py-sm">
                              <p className="font-semibold text-on-surface">{tenant.full_name}</p>
                              <p className="text-body-md text-on-surface-variant">
                                 {tenant.is_primary ? 'Người đại diện' : 'Người ở cùng'}
                              </p>
                           </td>
                           <td className="px-md py-sm text-on-surface-variant">{tenant.phone || '-'}</td>
                           <td className="px-md py-sm">
                              <span className="rounded-full bg-surface-container-high px-sm py-xs text-body-md text-on-surface">
                                 {tenant.room_name ?? 'Chưa gán phòng'}
                              </span>
                           </td>
                           <td className="px-md py-sm text-on-surface-variant">
                              {formatDate(tenant.move_in_date) || '-'}
                           </td>
                           <td className="px-md py-sm">
                              <Chip tone={active ? 'success' : 'danger'}>
                                 {active ? 'Đang thuê' : 'Hết hạn'}
                              </Chip>
                           </td>
                           <td className="px-md py-sm text-right">
                              <button
                                 type="button"
                                 onClick={() => onDetail(tenant)}
                                 className="focus-ring inline-flex h-9 items-center gap-xs rounded-lg px-sm text-primary hover:bg-primary-fixed"
                              >
                                 <Eye className="h-4 w-4" />
                                 <span>Chi tiết</span>
                              </button>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>
   );
}
