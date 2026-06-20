/**
 * Modal chi tiết / sửa khách thuê.
 *
 * Cho phép:
 *  - Sửa mọi thông tin tenant (kể cả ngày đi → trigger HĐ gia hạn nếu là đại diện)
 *  - Quản lý xe của tenant
 *  - Nút "Đặt làm đại diện phòng" → gọi `lifecycle.promotePrimary` → backend tự terminate HĐ cũ
 *    + tạo HĐ mới copy info, set old primary move_out_date = today.
 *
 * Lưu ý: chỉ tenant đang ở (move_out_date rỗng) và chưa phải đại diện mới hiện nút promote.
 */

import { useEffect, useState } from 'react';
import { Crown, Save } from 'lucide-react';
import type { TenantWithRoom } from '../../shared/types';
import Dialog from '../Dialog';
import MoneyInput from '../MoneyInput';
import VehicleManager from './VehicleManager';

interface TenantDetailModalProps {
   open: boolean;
   tenant: TenantWithRoom | null;
   onClose: () => void;
   onUpdated?: () => void;
}

interface EditForm {
   full_name: string;
   phone: string;
   cccd: string;
   dob: string;
   permanent_address: string;
   move_in_date: string;
   move_out_date: string;
   deposit: number;
}

function toForm(tenant: TenantWithRoom): EditForm {
   return {
      full_name: tenant.full_name,
      phone: tenant.phone,
      cccd: tenant.cccd,
      dob: tenant.dob,
      permanent_address: tenant.permanent_address,
      move_in_date: tenant.move_in_date,
      move_out_date: tenant.move_out_date,
      deposit: tenant.deposit,
   };
}

export default function TenantDetailModal({
   open,
   tenant,
   onClose,
   onUpdated,
}: TenantDetailModalProps) {
   const [form, setForm] = useState<EditForm | null>(null);
   const [saving, setSaving] = useState(false);
   const [promoting, setPromoting] = useState(false);
   const [message, setMessage] = useState<string | null>(null);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (open && tenant) {
         setForm(toForm(tenant));
         setMessage(null);
         setError(null);
      }
   }, [open, tenant]);

   const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
      setForm((current) => (current ? { ...current, [key]: value } : current));
   };

   const save = async () => {
      if (!tenant || !form) return;
      setError(null);
      setMessage(null);
      setSaving(true);
      try {
         await window.api.tenants.update(tenant.id, {
            full_name: form.full_name.trim(),
            phone: form.phone.trim(),
            cccd: form.cccd.trim(),
            dob: form.dob,
            permanent_address: form.permanent_address.trim(),
            move_in_date: form.move_in_date,
            move_out_date: form.move_out_date,
            deposit: form.deposit,
         });
         setMessage('Đã lưu');
         onUpdated?.();
      } catch (err) {
         setError(err instanceof Error ? err.message : String(err));
      } finally {
         setSaving(false);
      }
   };

   const promote = async () => {
      if (!tenant) return;
      const ok = window.confirm(
         `Đặt "${tenant.full_name}" làm đại diện phòng ${tenant.room_name}?\n\n` +
            `Hệ thống sẽ:\n` +
            `- Đại diện hiện tại → đặt ngày đi = hôm nay\n` +
            `- HĐ hiện tại → kết thúc\n` +
            `- Sinh HĐ mới (copy giá, cọc, điều khoản) bắt đầu hôm nay\n\n` +
            `Tiếp tục?`
      );
      if (!ok) return;
      setError(null);
      setMessage(null);
      setPromoting(true);
      try {
         await window.api.lifecycle.promotePrimary(tenant.id);
         setMessage(`Đã đặt ${tenant.full_name} làm đại diện. HĐ mới đã sinh.`);
         onUpdated?.();
      } catch (err) {
         setError(err instanceof Error ? err.message : String(err));
      } finally {
         setPromoting(false);
      }
   };

   const today = new Date().toISOString().slice(0, 10);
   const hasLeft = tenant?.move_out_date && tenant.move_out_date <= today;
   const willLeave = tenant?.move_out_date && tenant.move_out_date > today;

   const canPromote =
      tenant && !hasLeft && tenant.is_primary !== 1 && !!tenant.room_id;

   return (
      <Dialog open={open} title="Chi tiết / Sửa khách thuê" size="lg" onClose={onClose}>
         {tenant && form && (
            <div className="space-y-md">
               {/* Status banner */}
               <div className="flex flex-wrap items-center gap-sm">
                  <span
                     className={`rounded-full px-sm py-xs text-label-sm font-semibold ${
                        tenant.is_primary === 1
                           ? 'bg-primary text-on-primary'
                           : 'bg-surface-container-high text-on-surface-variant'
                     }`}
                  >
                     {tenant.is_primary === 1 ? 'Người đại diện' : 'Người ở cùng'}
                  </span>
                  <span className="rounded-full bg-surface-container-high px-sm py-xs text-label-sm text-on-surface-variant">
                     Phòng: {tenant.room_name ?? 'Chưa gán'} · Khu: {tenant.area_name ?? '-'}
                  </span>
                  {hasLeft && (
                     <span className="rounded-full bg-error-container px-sm py-xs text-label-sm text-on-error-container">
                        Đã rời ngày {tenant.move_out_date}
                     </span>
                  )}
                  {willLeave && (
                     <span className="rounded-full bg-tertiary-container px-sm py-xs text-label-sm text-on-tertiary-container">
                        Dự kiến rời ngày {tenant.move_out_date}
                     </span>
                  )}
               </div>

               {/* Edit form */}
               <section className="grid gap-md md:grid-cols-2">
                  <Field label="Họ tên" value={form.full_name} onChange={(v) => set('full_name', v)} />
                  <Field label="Số điện thoại" value={form.phone} onChange={(v) => set('phone', v)} />
                  <Field label="CCCD" value={form.cccd} onChange={(v) => set('cccd', v)} />
                  <Field label="Ngày sinh" type="date" value={form.dob} onChange={(v) => set('dob', v)} />
                  <Field
                     label="Ngày vào"
                     type="date"
                     value={form.move_in_date}
                     onChange={(v) => set('move_in_date', v)}
                  />
                  <Field
                     label="Ngày đi (gia hạn HĐ nếu đại diện)"
                     type="date"
                     value={form.move_out_date}
                     onChange={(v) => set('move_out_date', v)}
                  />
                  <label className="block md:col-span-2">
                     <span className="text-label-sm text-on-surface-variant">Thường trú</span>
                     <textarea
                        value={form.permanent_address}
                        onChange={(event) => set('permanent_address', event.target.value)}
                        className="mt-xs min-h-16 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm outline-none focus:border-primary"
                     />
                  </label>
                  <label className="block">
                     <span className="text-label-sm text-on-surface-variant">Tiền cọc cá nhân</span>
                     <MoneyInput
                        value={form.deposit}
                        onChange={(v) => set('deposit', v)}
                        className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                     />
                  </label>
               </section>

               {/* Notifications */}
               {message && (
                  <div className="rounded-lg border border-tertiary/40 bg-tertiary-container/30 p-sm text-body-md text-on-tertiary-container">
                     {message}
                  </div>
               )}
               {error && (
                  <div className="rounded-lg border border-error/40 bg-error-container/30 p-sm text-body-md text-on-error-container">
                     {error}
                  </div>
               )}

               {/* Actions */}
               <div className="flex flex-wrap gap-sm">
                  <button
                     type="button"
                     onClick={save}
                     disabled={saving}
                     className="focus-ring inline-flex h-10 items-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
                  >
                     <Save className="h-4 w-4" />
                     {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  {canPromote && (
                     <button
                        type="button"
                        onClick={promote}
                        disabled={promoting}
                        className="focus-ring inline-flex h-10 items-center gap-sm rounded-lg border border-primary px-md font-semibold text-primary hover:bg-primary-fixed disabled:opacity-50"
                        title="Tick lên làm đại diện phòng — tự terminate HĐ cũ + sinh HĐ mới"
                     >
                        <Crown className="h-4 w-4" />
                        {promoting ? 'Đang xử lý...' : 'Đặt làm đại diện phòng'}
                     </button>
                  )}
               </div>

               {/* Vehicles */}
               <VehicleManager tenantId={tenant.id} />
            </div>
         )}
      </Dialog>
   );
}

function Field({
   label,
   value,
   onChange,
   type = 'text',
}: {
   label: string;
   value: string;
   onChange: (value: string) => void;
   type?: string;
}) {
   return (
      <label className="block">
         <span className="text-label-sm text-on-surface-variant">{label}</span>
         <input
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
         />
      </label>
   );
}
