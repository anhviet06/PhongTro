/**
 * Modal sửa thông tin phòng.
 */

import { useEffect, useState } from 'react';
import type { Area, RoomWithArea } from '../../shared/types';
import Dialog from '../Dialog';
import RoomForm, { roomToForm, type RoomFormValue } from './RoomForm';

interface EditRoomModalProps {
   open: boolean;
   room: RoomWithArea | null;
   areas: Area[];
   onClose: () => void;
   onSaved: () => void;
}

export default function EditRoomModal({ open, room, areas, onClose, onSaved }: EditRoomModalProps) {
   const [value, setValue] = useState<RoomFormValue | null>(null);
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      if (open && room) setValue(roomToForm(room));
   }, [open, room]);

   const submit = async () => {
      if (!room || !value || !value.name.trim()) return;
      setSaving(true);
      try {
         await window.api.rooms.update(room.id, { ...value, name: value.name.trim() });
         onSaved();
         onClose();
      } finally {
         setSaving(false);
      }
   };

   return (
      <Dialog
         open={open}
         title="Chỉnh sửa phòng"
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
                  disabled={saving || !value?.name.trim()}
                  className="h-10 rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
               >
                  Lưu thay đổi
               </button>
            </>
         }
      >
         {value && <RoomForm areas={areas} value={value} onChange={setValue} />}
      </Dialog>
   );
}
