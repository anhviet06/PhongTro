/**
 * Bảng danh sách hợp đồng.
 */

import { Download, FileText, Trash2, XCircle } from 'lucide-react';
import type { ContractWithDetails } from '../../shared/types';
import Chip from '../Chip';
import { formatDate, formatVND } from '../../lib/format';

interface ContractListProps {
   contracts: ContractWithDetails[];
   onExport: (contract: ContractWithDetails) => void;
   onView: (contract: ContractWithDetails) => void;
   onTerminate: (contract: ContractWithDetails) => void;
   onDelete?: (contract: ContractWithDetails) => void;
}

function statusText(status: ContractWithDetails['status']) {
   if (status === 'active') return 'Đang hiệu lực';
   if (status === 'expired') return 'Hết hạn';
   return 'Đã kết thúc';
}

function statusTone(status: ContractWithDetails['status']) {
   if (status === 'active') return 'success';
   if (status === 'expired') return 'warning';
   return 'danger';
}

export default function ContractList({ contracts, onExport, onView, onTerminate, onDelete }: ContractListProps) {
   return (
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
               <thead className="bg-surface-container-low">
                  <tr className="text-label-md uppercase text-on-surface-variant">
                     <th className="px-md py-sm">Phòng</th>
                     <th className="px-md py-sm">Khách đại diện</th>
                     <th className="px-md py-sm">Giá thuê</th>
                     <th className="px-md py-sm">Thời hạn</th>
                     <th className="px-md py-sm">Trạng thái</th>
                     <th className="px-md py-sm text-right">Thao tác</th>
                  </tr>
               </thead>
               <tbody>
                  {contracts.map((contract) => (
                     <tr
                        key={contract.id}
                        className="border-t border-outline-variant hover:bg-surface-container-low"
                     >
                        <td className="px-md py-sm">
                           <p className="font-semibold text-primary">{contract.room_name}</p>
                           <p className="text-body-md text-on-surface-variant">{contract.area_name}</p>
                        </td>
                        <td className="px-md py-sm">
                           <p className="font-medium text-on-surface">{contract.tenant_name ?? '-'}</p>
                           <p className="text-body-md text-on-surface-variant">{contract.tenant_phone ?? ''}</p>
                        </td>
                        <td className="px-md py-sm text-on-surface">{formatVND(contract.rent_price)}</td>
                        <td className="px-md py-sm text-on-surface-variant">
                           {formatDate(contract.start_date)} - {formatDate(contract.end_date) || 'Không thời hạn'}
                        </td>
                        <td className="px-md py-sm">
                           <Chip tone={statusTone(contract.status)}>{statusText(contract.status)}</Chip>
                        </td>
                        <td className="px-md py-sm">
                           <div className="flex justify-end gap-xs">
                              <button
                                 type="button"
                                 onClick={() => onExport(contract)}
                                 className="focus-ring grid h-9 w-9 place-items-center rounded-full text-primary hover:bg-primary-fixed"
                                 title="Xuất hợp đồng"
                              >
                                 <Download className="h-4 w-4" />
                              </button>
                              <button
                                 type="button"
                                 onClick={() => onView(contract)}
                                 className="focus-ring grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
                                 title="Xem hợp đồng"
                              >
                                 <FileText className="h-4 w-4" />
                              </button>
                              <button
                                 type="button"
                                 onClick={() => onTerminate(contract)}
                                 className="focus-ring grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                                 title="Kết thúc hợp đồng"
                              >
                                 <XCircle className="h-4 w-4" />
                              </button>
                              {onDelete && (
                                 <button
                                    type="button"
                                    onClick={() => onDelete(contract)}
                                    className="focus-ring grid h-9 w-9 place-items-center rounded-full text-error hover:bg-error-container hover:text-on-error-container"
                                    title="Xóa hợp đồng"
                                 >
                                    <Trash2 className="h-4 w-4" />
                                 </button>
                              )}
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
}
