/**
 * Form nhập thông tin phòng dùng cho thêm/sửa.
 */

import type { Area, RoomWithArea } from '../../shared/types';

export interface RoomFormValue {
   area_id: number;
   name: string;
   floor: number;
   area_m2: number;
   price: number;
   electric_unit_price: number;
   water_unit_price: number;
   max_people: number;
}

interface RoomFormProps {
   areas: Area[];
   value: RoomFormValue;
   onChange: (value: RoomFormValue) => void;
}

export function roomToForm(room: RoomWithArea): RoomFormValue {
   return {
      area_id: room.area_id,
      name: room.name,
      floor: room.floor,
      area_m2: room.area_m2,
      price: room.price,
      electric_unit_price: room.electric_unit_price,
      water_unit_price: room.water_unit_price,
      max_people: room.max_people,
   };
}

export function defaultRoomForm(areaId: number): RoomFormValue {
   return {
      area_id: areaId,
      name: '',
      floor: 1,
      area_m2: 0,
      price: 0,
      electric_unit_price: 0,
      water_unit_price: 0,
      max_people: 4,
   };
}

export default function RoomForm({ areas, value, onChange }: RoomFormProps) {
   const set = <K extends keyof RoomFormValue>(key: K, nextValue: RoomFormValue[K]) => {
      onChange({ ...value, [key]: nextValue });
   };

   return (
      <div className="grid gap-md md:grid-cols-2">
         <label className="block md:col-span-2">
            <span className="text-label-sm text-on-surface-variant">Khu</span>
            <select
               value={value.area_id}
               onChange={(event) => set('area_id', Number(event.target.value))}
               className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            >
               {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                     {area.name}
                  </option>
               ))}
            </select>
         </label>
         <label className="block">
            <span className="text-label-sm text-on-surface-variant">Tên phòng</span>
            <input
               value={value.name}
               onChange={(event) => set('name', event.target.value)}
               className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            />
         </label>
         <label className="block">
            <span className="text-label-sm text-on-surface-variant">Tầng</span>
            <input
               type="number"
               value={value.floor}
               onChange={(event) => set('floor', Number(event.target.value))}
               className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            />
         </label>
         <label className="block">
            <span className="text-label-sm text-on-surface-variant">Diện tích m²</span>
            <input
               type="number"
               value={value.area_m2}
               onChange={(event) => set('area_m2', Number(event.target.value))}
               className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            />
         </label>
         <label className="block">
            <span className="text-label-sm text-on-surface-variant">Giá thuê</span>
            <input
               type="number"
               value={value.price}
               onChange={(event) => set('price', Number(event.target.value))}
               className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            />
         </label>
         <label className="block">
            <span className="text-label-sm text-on-surface-variant">Đơn giá điện</span>
            <input
               type="number"
               value={value.electric_unit_price}
               onChange={(event) => set('electric_unit_price', Number(event.target.value))}
               className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            />
         </label>
         <label className="block">
            <span className="text-label-sm text-on-surface-variant">Đơn giá nước</span>
            <input
               type="number"
               value={value.water_unit_price}
               onChange={(event) => set('water_unit_price', Number(event.target.value))}
               className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            />
         </label>
         <label className="block">
            <span className="text-label-sm text-on-surface-variant">Số người tối đa</span>
            <input
               type="number"
               value={value.max_people}
               onChange={(event) => set('max_people', Number(event.target.value))}
               className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            />
         </label>
      </div>
   );
}
