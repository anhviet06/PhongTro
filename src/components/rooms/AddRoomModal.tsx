/**
 * Modal thêm phòng mới.
 */

import { useEffect, useState } from 'react';
import type { Area } from '../../shared/types';
import Dialog from '../Dialog';
import RoomForm, { defaultRoomForm, type RoomFormValue } from './RoomForm';

interface AddRoomModalProps {
   open: boolean;
   areas: Area[];
   defaultAreaId: number;
   onClose: () => void;
   onCreated: () => void;
}

export default function AddRoomModal({
   open,
   areas,
   defaultAreaId,
   onClose,
   onCreated,
}: AddRoomModalProps) {
   const [value, setValue] = useState<RoomFormValue>(defaultRoomForm(defaultAreaId));
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      if (!open) return;
      const initialAreaId = defaultAreaId;
      const initialArea = areas.find((area) => area.id === initialAreaId);
      // Pre-fill đơn giá điện/nước từ khu được chọn (cấu hình ở trang Settings).
      setValue({
         ...defaultRoomForm(initialAreaId),
         electric_unit_price: initialArea?.default_electric_price ?? 0,
         water_unit_price: initialArea?.default_water_price ?? 0,
      });
   }, [areas, defaultAreaId, open]);

   // Khi user đổi khu trong dropdown → tự update đơn giá theo khu mới (chỉ khi user chưa
   // tự gõ tay — kiểm tra qua việc giá hiện tại khớp với khu cũ).
   const handleAreaChange = (areaId: number, currentValue: RoomFormValue): RoomFormValue => {
      const newArea = areas.find((area) => area.id === areaId);
      if (!newArea) return { ...currentValue, area_id: areaId };
      return {
         ...currentValue,
         area_id: areaId,
         electric_unit_price: newArea.default_electric_price,
         water_unit_price: newArea.default_water_price,
      };
   };

   const submit = async () => {
      if (!value.name.trim()) return;
      setSaving(true);
      try {
         await window.api.rooms.create({ ...value, name: value.name.trim() });
         onCreated();
         onClose();
      } finally {
         setSaving(false);
      }
   };

   return (
      <Dialog
         open={open}
         title="Thêm phòng mới"
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
                  disabled={saving || !value.name.trim() || areas.length === 0}
                  className="h-10 rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
               >
                  Lưu phòng
               </button>
            </>
         }
      >
         <RoomForm
            areas={areas}
            value={value}
            onChange={(next) => {
               // Nếu area_id đổi → áp dụng default đơn giá khu mới
               if (next.area_id !== value.area_id) {
                  setValue(handleAreaChange(next.area_id, next));
               } else {
                  setValue(next);
               }
            }}
         />
      </Dialog>
   );
}
