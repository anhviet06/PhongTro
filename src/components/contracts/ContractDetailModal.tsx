/**
 * Modal xem chi tiết hợp đồng — hiển thị toàn bộ thông tin Bên A, Bên B, phòng,
 * giá thuê, thời hạn, điều khoản. Có nút xuất file ở footer.
 */

import { Download, Printer } from 'lucide-react';
import type { ContractWithDetails } from '../../shared/types';
import Dialog from '../Dialog';
import { formatDate, formatVND } from '../../lib/format';

interface ContractDetailModalProps {
   open: boolean;
   contract: ContractWithDetails | null;
   onClose: () => void;
   onExport: () => void;
}

function statusLabel(status: ContractWithDetails['status']): { text: string; tone: string } {
   if (status === 'active') return { text: 'Đang hiệu lực', tone: 'bg-secondary-container text-on-secondary-fixed' };
   if (status === 'expired') return { text: 'Hết hạn', tone: 'bg-tertiary-container text-on-tertiary-container' };
   return { text: 'Đã kết thúc', tone: 'bg-surface-container-high text-on-surface-variant' };
}

export default function ContractDetailModal({
   open,
   contract,
   onClose,
   onExport,
}: ContractDetailModalProps) {
   return (
      <Dialog
         open={open}
         title="Chi tiết hợp đồng"
         size="lg"
         onClose={onClose}
         footer={
            <>
               <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-lg border border-outline-variant px-md text-on-surface hover:bg-surface-container-high"
               >
                  Đóng
               </button>
               <button
                  type="button"
                  onClick={onExport}
                  className="flex h-10 items-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
               >
                  <Download className="h-4 w-4" />
                  Xuất file
               </button>
            </>
         }
      >
         {contract && (
            <div className="space-y-md">
               <div className="flex items-start justify-between gap-md rounded-lg bg-surface-container-low p-md">
                  <div>
                     <p className="text-label-sm uppercase text-on-surface-variant">Hợp đồng số</p>
                     <p className="text-headline-sm text-primary">HĐ-{String(contract.id).padStart(4, '0')}</p>
                     <p className="mt-xs text-body-md text-on-surface-variant">
                        Phòng {contract.room_name} · {contract.area_name}
                     </p>
                  </div>
                  <span
                     className={`shrink-0 rounded-full px-sm py-xs text-label-sm font-medium ${statusLabel(contract.status).tone}`}
                  >
                     {statusLabel(contract.status).text}
                  </span>
               </div>

               <section className="grid gap-md md:grid-cols-2">
                  <Card title="Bên A (Chủ trọ)">
                     <Field label="Họ tên" value={contract.landlord_name || '—'} />
                     <Field label="CCCD" value={contract.landlord_cccd || '—'} />
                     <Field label="Số điện thoại" value={contract.landlord_phone || '—'} />
                     <Field label="Địa chỉ" value={contract.landlord_address || '—'} />
                  </Card>
                  <Card title="Bên B (Khách thuê)">
                     <Field label="Họ tên" value={contract.tenant_name ?? '—'} />
                     <Field label="Số điện thoại" value={contract.tenant_phone ?? '—'} />
                  </Card>
               </section>

               <Card title="Thông tin thuê">
                  <div className="grid gap-sm md:grid-cols-3">
                     <Field label="Giá thuê / tháng" value={formatVND(contract.rent_price)} highlight />
                     <Field label="Tiền cọc" value={formatVND(contract.deposit)} />
                     <Field
                        label="Thời hạn"
                        value={`${formatDate(contract.start_date)} - ${
                           contract.end_date ? formatDate(contract.end_date) : 'Không thời hạn'
                        }`}
                     />
                  </div>
               </Card>

               {contract.terms && (
                  <Card title="Điều khoản bổ sung">
                     <p className="whitespace-pre-line text-body-md text-on-surface">
                        {contract.terms}
                     </p>
                  </Card>
               )}

               <p className="flex items-center gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-sm text-label-sm text-on-surface-variant">
                  <Printer className="h-4 w-4" />
                  Bấm "Xuất file" để in hoặc lưu PDF/Word bản đầy đủ có chữ ký.
               </p>
            </div>
         )}
      </Dialog>
   );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
   return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
         <h4 className="mb-sm text-label-md uppercase tracking-wide text-on-surface-variant">
            {title}
         </h4>
         <div className="space-y-xs">{children}</div>
      </div>
   );
}

function Field({
   label,
   value,
   highlight = false,
}: {
   label: string;
   value: string;
   highlight?: boolean;
}) {
   return (
      <div>
         <p className="text-label-sm text-on-surface-variant">{label}</p>
         <p
            className={
               highlight
                  ? 'mt-xs text-body-lg font-semibold text-primary'
                  : 'mt-xs text-body-md text-on-surface'
            }
         >
            {value}
         </p>
      </div>
   );
}
