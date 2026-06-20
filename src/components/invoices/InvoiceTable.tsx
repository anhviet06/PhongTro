/**
 * Bảng hóa đơn theo kỳ.
 */

import { Eye, FileSpreadsheet, FileText, Send } from 'lucide-react';
import type { InvoiceStatus, InvoiceWithDetails } from '../../shared/types';
import Chip from '../Chip';
import { formatDate, formatVND } from '../../lib/format';

interface InvoiceTableProps {
   invoices: InvoiceWithDetails[];
   filter: InvoiceStatus | 'all';
   onFilterChange: (filter: InvoiceStatus | 'all') => void;
   onDetail: (invoice: InvoiceWithDetails) => void;
   onNotify: (invoice: InvoiceWithDetails) => void;
   onExportPdf: (invoice: InvoiceWithDetails) => void;
   onExportExcel: (invoice: InvoiceWithDetails) => void;
}

export default function InvoiceTable({
   invoices,
   filter,
   onFilterChange,
   onDetail,
   onNotify,
   onExportPdf,
   onExportExcel,
}: InvoiceTableProps) {
   const filtered =
      filter === 'all' ? invoices : invoices.filter((invoice) => invoice.status === filter);

   return (
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
         <div className="flex flex-wrap items-center justify-between gap-md border-b border-outline-variant p-md">
            <div>
               <h3 className="text-headline-sm text-on-surface">Hóa đơn tháng hiện tại</h3>
               <p className="text-body-md text-on-surface-variant">{filtered.length} hóa đơn</p>
            </div>
            <div className="flex rounded-lg bg-surface-container-high p-xs">
               {[
                  ['all', 'Tất cả'],
                  ['unpaid', 'Chưa thu'],
                  ['paid', 'Đã thu'],
               ].map(([value, label]) => (
                  <button
                     key={value}
                     type="button"
                     onClick={() => onFilterChange(value as InvoiceStatus | 'all')}
                     className={[
                        'h-9 rounded-lg px-sm text-body-md font-medium',
                        filter === value ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant',
                     ].join(' ')}
                  >
                     {label}
                  </button>
               ))}
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
               <thead className="bg-surface-container-low">
                  <tr className="text-label-md uppercase text-on-surface-variant">
                     <th className="px-md py-sm">Phòng</th>
                     <th className="px-md py-sm">Khách thuê</th>
                     <th className="px-md py-sm text-center">Ngày lập</th>
                     <th className="px-md py-sm text-right">Tổng tiền</th>
                     <th className="px-md py-sm">Trạng thái</th>
                     <th className="px-md py-sm text-right">Hành động</th>
                  </tr>
               </thead>
               <tbody>
                  {filtered.map((invoice) => (
                     <tr
                        key={invoice.id}
                        className="group border-t border-outline-variant hover:bg-surface-container-low"
                     >
                        <td className="px-md py-sm">
                           <p className="font-semibold text-primary">{invoice.room_name}</p>
                           <p className="text-body-md text-on-surface-variant">{invoice.area_name}</p>
                        </td>
                        <td className="px-md py-sm text-on-surface">{invoice.tenant_name ?? '-'}</td>
                        <td className="px-md py-sm text-center text-on-surface-variant">
                           {formatDate(invoice.created_at)}
                        </td>
                        <td className="px-md py-sm text-right font-bold text-on-surface">
                           {formatVND(invoice.total)}
                        </td>
                        <td className="px-md py-sm">
                           <Chip tone={invoice.status === 'paid' ? 'success' : invoice.status === 'partial' ? 'warning' : 'danger'}>
                              {invoice.status === 'paid'
                                 ? 'Đã thanh toán'
                                 : invoice.status === 'partial'
                                   ? 'Trả một phần'
                                   : 'Chưa thanh toán'}
                           </Chip>
                        </td>
                        <td className="px-md py-sm">
                           <div className="flex justify-end gap-xs opacity-60 transition group-hover:opacity-100">
                              <Action title="Xem" onClick={() => onDetail(invoice)} icon={Eye} />
                              <Action title="Gửi" onClick={() => onNotify(invoice)} icon={Send} />
                              <Action
                                 title="Xuất PDF"
                                 onClick={() => onExportPdf(invoice)}
                                 icon={FileText}
                              />
                              <Action
                                 title="Xuất Excel"
                                 onClick={() => onExportExcel(invoice)}
                                 icon={FileSpreadsheet}
                              />
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </section>
   );
}

function Action({
   title,
   onClick,
   icon: Icon,
}: {
   title: string;
   onClick: () => void;
   icon: typeof Eye;
}) {
   return (
      <button
         type="button"
         title={title}
         onClick={onClick}
         className="focus-ring grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-primary-fixed hover:text-primary"
      >
         <Icon className="h-4 w-4" />
      </button>
   );
}
