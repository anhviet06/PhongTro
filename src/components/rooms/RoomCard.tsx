/**
 * Card phòng theo trạng thái cho trang Rooms.
 */

import { AlertCircle, UserX, Users } from 'lucide-react';
import type { RoomWithArea } from '../../shared/types';
import { formatVND } from '../../lib/format';

interface RoomCardProps {
   room: RoomWithArea;
   onClick: () => void;
}

const statusMeta = {
   vacant: {
      label: 'PHÒNG TRỐNG',
      icon: UserX,
      className: 'border-outline-variant bg-surface-container-lowest text-on-surface',
      badge: 'bg-primary-fixed text-primary',
   },
   occupied: {
      label: 'ĐÃ THUÊ',
      icon: Users,
      className: 'border-secondary bg-secondary-container text-on-secondary-fixed',
      badge: 'bg-secondary text-on-secondary',
   },
   debt: {
      label: 'NỢ TIỀN',
      icon: AlertCircle,
      className: 'border-tertiary bg-tertiary-container text-on-tertiary-container',
      badge: 'bg-tertiary text-on-tertiary',
   },
};

export default function RoomCard({ room, onClick }: RoomCardProps) {
   const meta = statusMeta[room.status];
   const Icon = meta.icon;
   const peopleCount = room.current_tenant_count ?? 0;

   return (
      <button
         type="button"
         onClick={onClick}
         className={`focus-ring min-h-40 rounded-lg border p-md text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.className}`}
      >
         <div className="flex items-start justify-between gap-sm">
            <div>
               <p className="text-headline-sm font-bold">{room.name}</p>
               <p className="mt-xs text-body-md opacity-80">Tầng {room.floor}</p>
            </div>
            <span className={`rounded-full px-sm py-xs text-label-sm ${meta.badge}`}>{meta.label}</span>
         </div>

         <div className="mt-lg space-y-xs">
            <p className="truncate text-body-md font-medium">
               {room.status === 'vacant'
                  ? formatVND(room.price)
                  : room.primary_tenant_name || 'Đang thuê'}
            </p>
            <div className="flex items-center gap-md text-body-md opacity-80">
               <span className="flex items-center gap-xs">
                  <Icon className="h-4 w-4" />
                  {room.status === 'vacant'
                     ? `${room.area_m2 || 0} m²`
                     : `${peopleCount}/${room.max_people} người`}
               </span>
               {room.status !== 'vacant' && (
                  <span className="opacity-70">{room.area_m2 || 0} m²</span>
               )}
            </div>
         </div>
      </button>
   );
}
