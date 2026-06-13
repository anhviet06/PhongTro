/**
 * Modal thêm khu trọ mới.
 */

import { useState } from 'react';
import Dialog from '../Dialog';

interface AddAreaModalProps {
   open: boolean;
   onClose: () => void;
   onCreated: () => void;
}

export default function AddAreaModal({ open, onClose, onCreated }: AddAreaModalProps) {
   const [name, setName] = useState('');
   const [address, setAddress] = useState('');
   const [description, setDescription] = useState('');
   const [saving, setSaving] = useState(false);

   const submit = async () => {
      if (!name.trim()) return;
      setSaving(true);
      try {
         await window.api.areas.create({
            name: name.trim(),
            address: address.trim(),
            description: description.trim(),
         });
         setName('');
         setAddress('');
         setDescription('');
         onCreated();
         onClose();
      } finally {
         setSaving(false);
      }
   };

   return (
      <Dialog
         open={open}
         title="Thêm khu mới"
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
                  disabled={saving || !name.trim()}
                  className="h-10 rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
               >
                  Lưu khu
               </button>
            </>
         }
      >
         <div className="space-y-md">
            <label className="block">
               <span className="text-label-sm text-on-surface-variant">Tên khu</span>
               <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
               />
            </label>
            <label className="block">
               <span className="text-label-sm text-on-surface-variant">Địa chỉ</span>
               <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
               />
            </label>
            <label className="block">
               <span className="text-label-sm text-on-surface-variant">Mô tả</span>
               <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-xs min-h-24 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm outline-none focus:border-primary"
               />
            </label>
         </div>
      </Dialog>
   );
}
