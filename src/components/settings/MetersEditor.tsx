/**
 * Settings: nhập chỉ số điện/nước "đầu vào" cho phòng.
 *
 * Khi khách mới kế thừa công tơ từ khách cũ → chủ trọ vào đây nhập 2 con số:
 *   - Chỉ số điện hiện tại
 *   - Chỉ số nước hiện tại
 *
 * Backend lưu thành baseline (period = tháng trước) → kỳ hóa đơn hiện tại sẽ tự lấy
 * 2 số này làm "chỉ số cũ", user chỉ cần nhập "chỉ số mới" khi chốt số.
 *
 * Không cần chọn kỳ. Lưu lại nhiều lần → đè lên (idempotent).
 */

import { useEffect, useMemo, useState } from 'react';
import { Save, Zap } from 'lucide-react';
import type { RoomWithArea } from '../../shared/types';

interface MetersEditorProps {
   rooms: RoomWithArea[];
   onMessage?: (text: string) => void;
   onError?: (text: string) => void;
}

export default function MetersEditor({ rooms, onMessage, onError }: MetersEditorProps) {
   const [roomId, setRoomId] = useState<number | null>(null);
   const [electric, setElectric] = useState(0);
   const [water, setWater] = useState(0);
   const [saving, setSaving] = useState(false);
   const [currentBaseline, setCurrentBaseline] = useState<{
      electric: number;
      water: number;
      period: string;
   } | null>(null);

   const sortedRooms = useMemo(
      () =>
         [...rooms].sort((a, b) => {
            const areaCompare = (a.area_name ?? '').localeCompare(b.area_name ?? '');
            if (areaCompare !== 0) return areaCompare;
            return a.name.localeCompare(b.name);
         }),
      [rooms]
   );

   // Khi đổi phòng → load baseline hiện có
   useEffect(() => {
      if (!roomId) {
         setCurrentBaseline(null);
         setElectric(0);
         setWater(0);
         return;
      }
      window.api.meters
         .getBaseline(roomId)
         .then((baseline) => {
            if (baseline) {
               setCurrentBaseline({
                  electric: baseline.electric_end,
                  water: baseline.water_end,
                  period: baseline.period,
               });
               setElectric(baseline.electric_end);
               setWater(baseline.water_end);
            } else {
               setCurrentBaseline(null);
               setElectric(0);
               setWater(0);
            }
         })
         .catch((err) => {
            onError?.(err instanceof Error ? err.message : String(err));
         });
   }, [roomId, onError]);

   const save = async () => {
      if (!roomId) {
         onError?.('Phải chọn phòng');
         return;
      }
      setSaving(true);
      try {
         await window.api.meters.setBaseline(roomId, electric, water);
         setCurrentBaseline({ electric, water, period: 'baseline' });
         onMessage?.(`Đã lưu chỉ số đầu vào cho phòng.`);
      } catch (err) {
         onError?.(err instanceof Error ? err.message : String(err));
      } finally {
         setSaving(false);
      }
   };

   return (
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
         <div className="flex items-center gap-sm">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-headline-sm text-on-surface">Chỉ số điện/nước đầu vào</h3>
         </div>
         <p className="mt-xs text-body-md text-on-surface-variant">
            Nhập chỉ số <strong>hiện tại</strong> của công tơ cho phòng (vd khi khách mới kế thừa
            từ khách cũ). Sau khi lưu, số này sẽ tự thành <strong>chỉ số cũ</strong> ở trang Hóa
            đơn — chốt số kỳ kế tiếp chỉ cần nhập số mới.
         </p>

         <div className="mt-md grid gap-md md:grid-cols-3">
            <label className="block">
               <span className="text-label-sm text-on-surface-variant">Phòng</span>
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
                        {room.area_name} · {room.name}
                     </option>
                  ))}
               </select>
            </label>
            <label className="block">
               <span className="text-label-sm text-on-surface-variant">Chỉ số điện hiện tại (kWh)</span>
               <input
                  type="number"
                  value={electric}
                  onChange={(event) => setElectric(Number(event.target.value) || 0)}
                  className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md text-right outline-none focus:border-primary"
                  disabled={!roomId}
               />
            </label>
            <label className="block">
               <span className="text-label-sm text-on-surface-variant">Chỉ số nước hiện tại (m³)</span>
               <input
                  type="number"
                  value={water}
                  onChange={(event) => setWater(Number(event.target.value) || 0)}
                  className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md text-right outline-none focus:border-primary"
                  disabled={!roomId}
               />
            </label>
         </div>

         {currentBaseline && roomId && (
            <p className="mt-sm text-body-sm text-on-surface-variant">
               Đang lưu: điện <strong>{currentBaseline.electric}</strong>, nước{' '}
               <strong>{currentBaseline.water}</strong>. Lưu lại sẽ ghi đè.
            </p>
         )}

         <div className="mt-md">
            <button
               type="button"
               onClick={save}
               disabled={!roomId || saving}
               className="focus-ring inline-flex h-10 items-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
            >
               <Save className="h-4 w-4" />
               {saving ? 'Đang lưu...' : 'Lưu chỉ số'}
            </button>
         </div>
      </section>
   );
}
