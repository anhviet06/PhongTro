/**
 * Modal tạo hợp đồng mới.
 */

import { useEffect, useMemo, useState } from 'react';
import { FileText, X } from 'lucide-react';
import type { RoomWithArea, Settings, TenantWithRoom } from '../../shared/types';
import MoneyInput from '../MoneyInput';

interface CreateContractModalProps {
   open: boolean;
   rooms: RoomWithArea[];
   tenants: TenantWithRoom[];
   settings: Settings;
   onClose: () => void;
   onCreated: (contractId: number) => void;
}

interface ContractForm {
   room_id: number;
   primary_tenant_id: number | null;
   landlord_name: string;
   landlord_cccd: string;
   landlord_phone: string;
   landlord_address: string;
   rent_price: number;
   deposit: number;
   start_date: string;
   end_date: string;
   terms: string;
}

export default function CreateContractModal({
   open,
   rooms,
   tenants,
   settings,
   onClose,
   onCreated,
}: CreateContractModalProps) {
   const [saving, setSaving] = useState(false);
   const [form, setForm] = useState<ContractForm>(() => defaultForm(rooms, tenants, settings));

   useEffect(() => {
      if (open) setForm(defaultForm(rooms, tenants, settings));
   }, [open, rooms, tenants, settings]);

   const primaryTenants = useMemo(
      () => tenants.filter((tenant) => tenant.is_primary === 1 || !tenant.move_out_date),
      [tenants]
   );

   const set = <K extends keyof ContractForm>(key: K, value: ContractForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
   };

   const submit = async () => {
      if (!form.room_id || !form.start_date) return;
      setSaving(true);
      try {
         const contract = await window.api.contracts.create({
            room_id: form.room_id,
            primary_tenant_id: form.primary_tenant_id,
            landlord_name: form.landlord_name,
            landlord_cccd: form.landlord_cccd,
            landlord_phone: form.landlord_phone,
            landlord_address: form.landlord_address,
            rent_price: form.rent_price,
            deposit: form.deposit,
            start_date: form.start_date,
            end_date: form.end_date,
            terms: form.terms,
            status: 'active',
         });
         await window.api.rooms.updateStatus(form.room_id, 'occupied');
         onCreated(contract.id);
         onClose();
      } finally {
         setSaving(false);
      }
   };

   if (!open) return null;

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-md">
         <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-lg bg-surface-container-lowest shadow-xl">
            <div className="flex items-center justify-between bg-primary px-lg py-md text-on-primary">
               <div>
                  <h3 className="text-headline-sm">Hợp Đồng Thuê Phòng</h3>
                  <p className="text-body-md opacity-90">Mẫu hợp đồng pháp lý chuẩn</p>
               </div>
               <button
                  type="button"
                  onClick={onClose}
                  className="focus-ring grid h-10 w-10 place-items-center rounded-full hover:bg-white/15"
                  title="Đóng"
               >
                  <X className="h-5 w-5" />
               </button>
            </div>

            <div className="max-h-[calc(92vh-140px)] overflow-y-auto p-lg">
               <section className="grid gap-md md:grid-cols-2">
                  <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
                     <h4 className="mb-md text-headline-sm text-on-surface">Bên A</h4>
                     <div className="space-y-sm">
                        <TextInput label="Họ tên" value={form.landlord_name} onChange={(value) => set('landlord_name', value)} />
                        <TextInput label="Số CCCD" value={form.landlord_cccd} onChange={(value) => set('landlord_cccd', value)} />
                        <TextInput label="Số điện thoại" value={form.landlord_phone} onChange={(value) => set('landlord_phone', value)} />
                        <TextInput label="Địa chỉ" value={form.landlord_address} onChange={(value) => set('landlord_address', value)} />
                     </div>
                  </div>

                  <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
                     <h4 className="mb-md text-headline-sm text-on-surface">Bên B</h4>
                     <label className="block">
                        <span className="text-label-sm text-on-surface-variant">Khách thuê</span>
                        <select
                           value={form.primary_tenant_id ?? ''}
                           onChange={(event) =>
                              set(
                                 'primary_tenant_id',
                                 event.target.value ? Number(event.target.value) : null
                              )
                           }
                           className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                        >
                           <option value="">Chọn khách thuê</option>
                           {primaryTenants.map((tenant) => (
                              <option key={tenant.id} value={tenant.id}>
                                 {tenant.full_name} - {tenant.room_name ?? 'Chưa có phòng'}
                              </option>
                           ))}
                        </select>
                     </label>
                  </div>
               </section>

               <section className="mt-md rounded-lg border border-outline-variant bg-surface-container-low p-md">
                  <h4 className="mb-md text-headline-sm text-on-surface">Thông tin thuê & Điều khoản</h4>
                  <div className="grid gap-md md:grid-cols-3">
                     <label className="block">
                        <span className="text-label-sm text-on-surface-variant">Phòng thuê</span>
                        <select
                           value={form.room_id}
                           onChange={(event) => set('room_id', Number(event.target.value))}
                           className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                        >
                           {rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                 {room.area_name} - {room.name}
                              </option>
                           ))}
                        </select>
                     </label>
                     <label className="block">
                        <span className="text-label-sm text-on-surface-variant">Giá thuê (đ)</span>
                        <MoneyInput
                           value={form.rent_price}
                           onChange={(next) => set('rent_price', next)}
                           className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                        />
                     </label>
                     <label className="block">
                        <span className="text-label-sm text-on-surface-variant">Tiền cọc (đ)</span>
                        <MoneyInput
                           value={form.deposit}
                           onChange={(next) => set('deposit', next)}
                           className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                        />
                     </label>
                     <TextInput
                        type="date"
                        label="Ngày bắt đầu"
                        value={form.start_date}
                        onChange={(value) => set('start_date', value)}
                     />
                     <TextInput
                        type="date"
                        label="Ngày kết thúc"
                        value={form.end_date}
                        onChange={(value) => set('end_date', value)}
                     />
                     <label className="block md:col-span-3">
                        <span className="text-label-sm text-on-surface-variant">Điều khoản bổ sung</span>
                        <textarea
                           value={form.terms}
                           onChange={(event) => set('terms', event.target.value)}
                           className="mt-xs min-h-24 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm outline-none focus:border-primary"
                           placeholder="Ví dụ: Giờ giấc tự do, không nuôi thú cưng..."
                        />
                     </label>
                  </div>
               </section>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-sm border-t border-outline-variant px-lg py-md">
               <button
                  type="button"
                  className="flex h-10 items-center gap-sm rounded-lg border border-outline-variant px-md text-primary"
               >
                  <FileText className="h-5 w-5" />
                  <span>Xuất file sau khi lưu</span>
               </button>
               <div className="flex gap-sm">
                  <button
                     type="button"
                     onClick={onClose}
                     className="h-10 rounded-lg border border-outline-variant px-md text-on-surface hover:bg-surface-container-high"
                  >
                     Hủy
                  </button>
                  <button
                     type="button"
                     onClick={submit}
                     disabled={saving || !form.room_id}
                     className="h-10 rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
                  >
                     Lưu hợp đồng
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}

function defaultForm(
   rooms: RoomWithArea[],
   tenants: TenantWithRoom[],
   settings: Settings
): ContractForm {
   const firstRoom = rooms[0];
   const firstTenant = tenants.find((tenant) => tenant.is_primary === 1) ?? tenants[0];
   return {
      room_id: firstRoom?.id ?? 0,
      primary_tenant_id: firstTenant?.id ?? null,
      landlord_name: settings.landlord_name ?? '',
      landlord_cccd: settings.landlord_cccd ?? '',
      landlord_phone: settings.landlord_phone ?? '',
      landlord_address: settings.landlord_address ?? '',
      rent_price: firstRoom?.price ?? 0,
      deposit: 0,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      terms: '',
   };
}

function TextInput({
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
