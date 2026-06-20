/**
 * Modal gộp: thêm khách thuê + xe + hợp đồng trong 1 luồng.
 *
 * Cấu trúc:
 *  - Chọn phòng (dropdown)
 *  - Người 1 (đại diện, bắt buộc): họ tên + thông tin cá nhân + 0-n xe
 *  - Người 2 (optional): bật toggle để thêm — tương tự
 *  - Người 3 (optional)
 *  - Thông tin HĐ: giá thuê (default = room.price), cọc, ngày BĐ (today), KT (today+12m), điều khoản
 *  - Bên A info auto fill từ Settings
 *
 * Submit gọi 1 IPC `lifecycle.createTenantsWithContract` (transaction trên backend).
 */

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, User } from 'lucide-react';
import type { RoomWithArea, Settings } from '../../shared/types';
import MoneyInput from '../MoneyInput';

interface AddTenantContractModalProps {
   open: boolean;
   rooms: RoomWithArea[];
   settings: Settings;
   defaultRoomId?: number;
   onClose: () => void;
   onCreated: () => void;
}

interface VehicleForm {
   plate_number: string;
   vehicle_type: 'motorbike' | 'car' | 'bicycle';
}

interface PersonForm {
   enabled: boolean;
   full_name: string;
   dob: string;
   phone: string;
   cccd: string;
   permanent_address: string;
   move_out_date: string;
   vehicles: VehicleForm[];
}

function emptyPerson(enabled = false): PersonForm {
   return {
      enabled,
      full_name: '',
      dob: '',
      phone: '',
      cccd: '',
      permanent_address: '',
      move_out_date: '',
      vehicles: [],
   };
}

function todayIso(): string {
   return new Date().toISOString().slice(0, 10);
}

function addMonthsIso(iso: string, months: number): string {
   const d = new Date(iso);
   d.setMonth(d.getMonth() + months);
   return d.toISOString().slice(0, 10);
}

export default function AddTenantContractModal({
   open,
   rooms,
   settings,
   defaultRoomId,
   onClose,
   onCreated,
}: AddTenantContractModalProps) {
   const sortedRooms = useMemo(
      () =>
         [...rooms].sort((a, b) => {
            const areaCompare = (a.area_name ?? '').localeCompare(b.area_name ?? '');
            if (areaCompare !== 0) return areaCompare;
            return a.name.localeCompare(b.name);
         }),
      [rooms]
   );

   const [roomId, setRoomId] = useState<number | null>(null);
   const [people, setPeople] = useState<PersonForm[]>([
      emptyPerson(true),
      emptyPerson(false),
      emptyPerson(false),
   ]);
   const [rentPrice, setRentPrice] = useState(0);
   const [deposit, setDeposit] = useState(0);
   const [startDate, setStartDate] = useState(todayIso());
   const [endDate, setEndDate] = useState(addMonthsIso(todayIso(), 12));
   const [moveInDate, setMoveInDate] = useState(todayIso());
   const [terms, setTerms] = useState('');
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);

   // Reset khi mở
   useEffect(() => {
      if (!open) return;
      const initRoomId = defaultRoomId ?? sortedRooms[0]?.id ?? null;
      setRoomId(initRoomId);
      const room = sortedRooms.find((r) => r.id === initRoomId);
      setRentPrice(room?.price ?? 0);
      setDeposit(0);
      const today = todayIso();
      setStartDate(today);
      setEndDate(addMonthsIso(today, 12));
      setMoveInDate(today);
      setTerms('');
      setError(null);
      setPeople([emptyPerson(true), emptyPerson(false), emptyPerson(false)]);
   }, [open, defaultRoomId, sortedRooms]);

   // Sync rent_price khi đổi phòng
   useEffect(() => {
      const room = sortedRooms.find((r) => r.id === roomId);
      if (room?.price) setRentPrice(room.price);
   }, [roomId, sortedRooms]);

   const updatePerson = (idx: number, patch: Partial<PersonForm>) => {
      setPeople((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
   };

   const togglePerson = (idx: number) => {
      updatePerson(idx, { enabled: !people[idx].enabled });
   };

   const addVehicle = (idx: number) => {
      updatePerson(idx, {
         vehicles: [...people[idx].vehicles, { plate_number: '', vehicle_type: 'motorbike' }],
      });
   };

   const removeVehicle = (personIdx: number, vehicleIdx: number) => {
      updatePerson(personIdx, {
         vehicles: people[personIdx].vehicles.filter((_, i) => i !== vehicleIdx),
      });
   };

   const updateVehicle = (personIdx: number, vehicleIdx: number, patch: Partial<VehicleForm>) => {
      updatePerson(personIdx, {
         vehicles: people[personIdx].vehicles.map((v, i) =>
            i === vehicleIdx ? { ...v, ...patch } : v
         ),
      });
   };

   const submit = async () => {
      setError(null);
      if (!roomId) {
         setError('Phải chọn phòng');
         return;
      }
      if (!people[0].full_name.trim()) {
         setError('Người đại diện phải có họ tên');
         return;
      }
      if (!startDate) {
         setError('Phải có ngày bắt đầu HĐ');
         return;
      }

      const activePeople = people.filter((p, i) => i === 0 || p.enabled);
      const payload = {
         room_id: roomId,
         tenants: activePeople.map((p) => ({
            full_name: p.full_name.trim(),
            dob: p.dob,
            phone: p.phone.trim(),
            cccd: p.cccd.trim(),
            permanent_address: p.permanent_address.trim(),
            move_in_date: moveInDate,
            move_out_date: p.move_out_date,
            vehicles: p.vehicles
               .filter((v) => v.plate_number.trim())
               .map((v) => ({
                  plate_number: v.plate_number.trim().toUpperCase(),
                  vehicle_type: v.vehicle_type,
               })),
         })),
         contract: {
            rent_price: rentPrice,
            deposit,
            start_date: startDate,
            end_date: endDate,
            terms: terms.trim(),
            landlord_name: settings.landlord_name ?? '',
            landlord_cccd: settings.landlord_cccd ?? '',
            landlord_phone: settings.landlord_phone ?? '',
            landlord_address: settings.landlord_address ?? '',
         },
      };

      setSaving(true);
      try {
         await window.api.lifecycle.createTenantsWithContract(payload);
         onCreated();
         onClose();
      } catch (err) {
         setError(err instanceof Error ? err.message : String(err));
      } finally {
         setSaving(false);
      }
   };

   if (!open) return null;

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md">
         <div className="max-h-[95vh] w-full max-w-5xl overflow-hidden rounded-lg bg-surface-container-lowest shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between bg-primary px-lg py-md text-on-primary">
               <div>
                  <h3 className="text-headline-sm">Thêm khách thuê + Tạo hợp đồng</h3>
                  <p className="text-body-md opacity-90">
                     Nhập 1 lần: khách (1-3 người), xe và HĐ
                  </p>
               </div>
               <button
                  type="button"
                  onClick={onClose}
                  className="focus-ring grid h-10 w-10 place-items-center rounded-full hover:bg-white/15"
               >
                  <X className="h-5 w-5" />
               </button>
            </div>

            {/* Body */}
            <div className="max-h-[calc(95vh-160px)] overflow-y-auto p-lg">
               {/* Chọn phòng */}
               <section className="mb-md rounded-lg border border-outline-variant bg-surface-container-low p-md">
                  <label className="block">
                     <span className="text-label-sm text-on-surface-variant">Phòng *</span>
                     <select
                        value={roomId ?? ''}
                        onChange={(event) =>
                           setRoomId(event.target.value ? Number(event.target.value) : null)
                        }
                        className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                     >
                        <option value="">— Chọn phòng —</option>
                        {sortedRooms.map((room) => (
                           <option key={room.id} value={room.id}>
                              {room.area_name} · {room.name} ({room.status})
                           </option>
                        ))}
                     </select>
                  </label>
               </section>

               {/* People */}
               {people.map((person, idx) => {
                  const isPrimary = idx === 0;
                  const expanded = isPrimary || person.enabled;
                  return (
                     <section
                        key={idx}
                        className="mb-md rounded-lg border border-outline-variant bg-surface-container-low p-md"
                     >
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-sm">
                              <User className="h-5 w-5 text-primary" />
                              <h4 className="text-headline-sm text-on-surface">
                                 {isPrimary ? 'Người 1 — Đại diện' : `Người ${idx + 1} — Ở cùng`}
                              </h4>
                           </div>
                           {!isPrimary && (
                              <label className="flex items-center gap-xs text-body-md">
                                 <input
                                    type="checkbox"
                                    checked={person.enabled}
                                    onChange={() => togglePerson(idx)}
                                    className="h-4 w-4"
                                 />
                                 <span>Có người này</span>
                              </label>
                           )}
                        </div>

                        {expanded && (
                           <div className="mt-md grid gap-sm md:grid-cols-2">
                              <TextField
                                 label={isPrimary ? 'Họ tên *' : 'Họ tên'}
                                 value={person.full_name}
                                 onChange={(v) => updatePerson(idx, { full_name: v })}
                              />
                              <TextField
                                 label="Số điện thoại"
                                 value={person.phone}
                                 onChange={(v) => updatePerson(idx, { phone: v })}
                              />
                              <TextField
                                 label="Ngày sinh"
                                 type="date"
                                 value={person.dob}
                                 onChange={(v) => updatePerson(idx, { dob: v })}
                              />
                              <TextField
                                 label="CCCD"
                                 value={person.cccd}
                                 onChange={(v) => updatePerson(idx, { cccd: v })}
                              />
                              <div className="md:col-span-2">
                                 <label className="block">
                                    <span className="text-label-sm text-on-surface-variant">
                                       Thường trú
                                    </span>
                                    <textarea
                                       value={person.permanent_address}
                                       onChange={(event) =>
                                          updatePerson(idx, {
                                             permanent_address: event.target.value,
                                          })
                                       }
                                       className="mt-xs min-h-16 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm outline-none focus:border-primary"
                                    />
                                 </label>
                              </div>
                              <TextField
                                 label="Ngày đi (để trống nếu đang ở)"
                                 type="date"
                                 value={person.move_out_date}
                                 onChange={(v) => updatePerson(idx, { move_out_date: v })}
                              />

                              {/* Vehicles */}
                              <div className="md:col-span-2">
                                 <div className="flex items-center justify-between">
                                    <span className="text-label-sm text-on-surface-variant">
                                       Xe đăng ký ({person.vehicles.length})
                                    </span>
                                    <button
                                       type="button"
                                       onClick={() => addVehicle(idx)}
                                       className="focus-ring inline-flex h-8 items-center gap-xs rounded border border-outline-variant px-sm text-label-sm hover:bg-surface-container-high"
                                    >
                                       <Plus className="h-3 w-3" /> Thêm xe
                                    </button>
                                 </div>
                                 {person.vehicles.length === 0 && (
                                    <p className="mt-xs text-body-sm text-on-surface-variant">
                                       (Không có xe)
                                    </p>
                                 )}
                                 {person.vehicles.map((vehicle, vi) => (
                                    <div key={vi} className="mt-xs flex items-center gap-xs">
                                       <input
                                          type="text"
                                          value={vehicle.plate_number}
                                          onChange={(event) =>
                                             updateVehicle(idx, vi, {
                                                plate_number: event.target.value,
                                             })
                                          }
                                          placeholder="Biển số (vd: 29-H1 234.56)"
                                          className="h-9 flex-1 rounded border border-outline-variant bg-surface-container-lowest px-sm outline-none focus:border-primary"
                                       />
                                       <select
                                          value={vehicle.vehicle_type}
                                          onChange={(event) =>
                                             updateVehicle(idx, vi, {
                                                vehicle_type: event.target
                                                   .value as VehicleForm['vehicle_type'],
                                             })
                                          }
                                          className="h-9 rounded border border-outline-variant bg-surface-container-lowest px-sm outline-none focus:border-primary"
                                       >
                                          <option value="motorbike">Xe máy</option>
                                          <option value="car">Ô tô</option>
                                          <option value="bicycle">Xe đạp</option>
                                       </select>
                                       <button
                                          type="button"
                                          onClick={() => removeVehicle(idx, vi)}
                                          className="focus-ring grid h-9 w-9 place-items-center rounded text-error hover:bg-error-container"
                                       >
                                          <Trash2 className="h-4 w-4" />
                                       </button>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                     </section>
                  );
               })}

               {/* Contract info */}
               <section className="mb-md rounded-lg border border-outline-variant bg-surface-container-low p-md">
                  <h4 className="mb-md text-headline-sm text-on-surface">Thông tin Hợp đồng</h4>
                  <div className="grid gap-md md:grid-cols-3">
                     <label className="block">
                        <span className="text-label-sm text-on-surface-variant">
                           Giá thuê (đ/tháng)
                        </span>
                        <MoneyInput
                           value={rentPrice}
                           onChange={setRentPrice}
                           className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                        />
                     </label>
                     <label className="block">
                        <span className="text-label-sm text-on-surface-variant">Tiền cọc (đ)</span>
                        <MoneyInput
                           value={deposit}
                           onChange={setDeposit}
                           className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                        />
                     </label>
                     <TextField
                        label="Ngày vào (chung cả phòng)"
                        type="date"
                        value={moveInDate}
                        onChange={setMoveInDate}
                     />
                     <TextField
                        label="Ngày bắt đầu HĐ *"
                        type="date"
                        value={startDate}
                        onChange={setStartDate}
                     />
                     <TextField
                        label="Ngày kết thúc HĐ"
                        type="date"
                        value={endDate}
                        onChange={setEndDate}
                     />
                     <div className="md:col-span-3">
                        <label className="block">
                           <span className="text-label-sm text-on-surface-variant">
                              Điều khoản bổ sung
                           </span>
                           <textarea
                              value={terms}
                              onChange={(event) => setTerms(event.target.value)}
                              className="mt-xs min-h-20 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm outline-none focus:border-primary"
                              placeholder="Ví dụ: không nuôi thú cưng, không gây mất trật tự sau 22h..."
                           />
                        </label>
                     </div>
                  </div>
               </section>

               {error && (
                  <div className="mb-md rounded-lg border border-error/40 bg-error-container/30 p-sm text-body-md text-on-error-container">
                     {error}
                  </div>
               )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-sm border-t border-outline-variant px-lg py-md">
               <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="h-10 rounded-lg border border-outline-variant px-md text-on-surface hover:bg-surface-container-high"
               >
                  Hủy
               </button>
               <button
                  type="button"
                  onClick={submit}
                  disabled={saving || !roomId || !people[0].full_name.trim()}
                  className="h-10 rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
               >
                  {saving ? 'Đang lưu...' : 'Lưu khách + HĐ'}
               </button>
            </div>
         </div>
      </div>
   );
}

function TextField({
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
