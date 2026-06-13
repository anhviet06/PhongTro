/**
 * Modal thêm khách thuê mới.
 */

import { useEffect, useState } from 'react';
import type { RoomWithArea } from '../../shared/types';
import Dialog from '../Dialog';

interface AddTenantModalProps {
   open: boolean;
   rooms: RoomWithArea[];
   onClose: () => void;
   onCreated: () => void;
}

interface TenantForm {
   room_id: number | null;
   full_name: string;
   cccd: string;
   dob: string;
   phone: string;
   permanent_address: string;
   is_primary: boolean;
   move_in_date: string;
   deposit: number;
}

function defaultForm(roomId: number | null): TenantForm {
   return {
      room_id: roomId,
      full_name: '',
      cccd: '',
      dob: '',
      phone: '',
      permanent_address: '',
      is_primary: true,
      move_in_date: new Date().toISOString().slice(0, 10),
      deposit: 0,
   };
}

export default function AddTenantModal({ open, rooms, onClose, onCreated }: AddTenantModalProps) {
   const [form, setForm] = useState<TenantForm>(defaultForm(null));
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      if (open) setForm(defaultForm(rooms[0]?.id ?? null));
   }, [open, rooms]);

   const set = <K extends keyof TenantForm>(key: K, value: TenantForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
   };

   const submit = async () => {
      if (!form.full_name.trim()) return;
      setSaving(true);
      try {
         await window.api.tenants.create({
            room_id: form.room_id,
            full_name: form.full_name.trim(),
            cccd: form.cccd.trim(),
            dob: form.dob,
            phone: form.phone.trim(),
            permanent_address: form.permanent_address.trim(),
            is_primary: form.is_primary ? 1 : 0,
            move_in_date: form.move_in_date,
            deposit: form.deposit,
         });
         if (form.room_id) {
            await window.api.rooms.updateStatus(form.room_id, 'occupied');
         }
         onCreated();
         onClose();
      } finally {
         setSaving(false);
      }
   };

   return (
      <Dialog
         open={open}
         title="Thêm khách thuê"
         size="lg"
         onClose={onClose}
         footer={
            <>
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
                  disabled={saving || !form.full_name.trim()}
                  className="h-10 rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
               >
                  Lưu khách thuê
               </button>
            </>
         }
      >
         <div className="grid gap-md md:grid-cols-2">
            <label className="block md:col-span-2">
               <span className="text-label-sm text-on-surface-variant">Phòng</span>
               <select
                  value={form.room_id ?? ''}
                  onChange={(event) =>
                     set('room_id', event.target.value ? Number(event.target.value) : null)
                  }
                  className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
               >
                  <option value="">Chưa gán phòng</option>
                  {rooms.map((room) => (
                     <option key={room.id} value={room.id}>
                        {room.area_name} - {room.name}
                     </option>
                  ))}
               </select>
            </label>
            <TextInput label="Họ tên" value={form.full_name} onChange={(value) => set('full_name', value)} />
            <TextInput label="Số điện thoại" value={form.phone} onChange={(value) => set('phone', value)} />
            <TextInput label="CCCD" value={form.cccd} onChange={(value) => set('cccd', value)} />
            <TextInput label="Ngày sinh" type="date" value={form.dob} onChange={(value) => set('dob', value)} />
            <TextInput
               label="Ngày vào"
               type="date"
               value={form.move_in_date}
               onChange={(value) => set('move_in_date', value)}
            />
            <TextInput
               label="Tiền cọc"
               type="number"
               value={String(form.deposit)}
               onChange={(value) => set('deposit', Number(value))}
            />
            <label className="block md:col-span-2">
               <span className="text-label-sm text-on-surface-variant">Thường trú</span>
               <textarea
                  value={form.permanent_address}
                  onChange={(event) => set('permanent_address', event.target.value)}
                  className="mt-xs min-h-20 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm outline-none focus:border-primary"
               />
            </label>
            <label className="flex items-center gap-sm md:col-span-2">
               <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(event) => set('is_primary', event.target.checked)}
                  className="h-4 w-4"
               />
               <span className="text-body-md text-on-surface">Đặt làm người đại diện phòng</span>
            </label>
         </div>
      </Dialog>
   );
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
