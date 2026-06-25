/**
 * Trang Phòng trọ: tab khu, room grid và slide-over chi tiết.
 */

import { useEffect, useMemo, useState } from 'react';
import { Building2, DoorOpen, Home, Plus, PlusCircle, Users, Wallet } from 'lucide-react';
import type { Area, RoomStatusCount, RoomWithArea, Tenant } from '../shared/types';
import StatCard from '../components/StatCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import RoomCard from '../components/rooms/RoomCard';
import RoomSlideOver from '../components/rooms/RoomSlideOver';
import AddAreaModal from '../components/rooms/AddAreaModal';
import AddRoomModal from '../components/rooms/AddRoomModal';
import EditRoomModal from '../components/rooms/EditRoomModal';

interface RoomsState {
   areas: Area[];
   rooms: RoomWithArea[];
   counts: RoomStatusCount;
   loading: boolean;
   error: string | null;
}

const emptyCounts: RoomStatusCount = { total: 0, vacant: 0, occupied: 0, debt: 0 };

export default function Rooms() {
   const [state, setState] = useState<RoomsState>({
      areas: [],
      rooms: [],
      counts: emptyCounts,
      loading: true,
      error: null,
   });
   const [activeArea, setActiveArea] = useState<number | 'all'>('all');
   const [selectedRoom, setSelectedRoom] = useState<RoomWithArea | null>(null);
   const [selectedTenants, setSelectedTenants] = useState<Tenant[]>([]);
   const [addAreaOpen, setAddAreaOpen] = useState(false);
   const [addRoomOpen, setAddRoomOpen] = useState(false);
   const [editRoomOpen, setEditRoomOpen] = useState(false);

   const loadData = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
         const [areas, rooms, counts] = await Promise.all([
            window.api.areas.list(),
            window.api.rooms.listAll(),
            window.api.rooms.countByStatus(),
         ]);
         setState({ areas, rooms, counts, loading: false, error: null });
      } catch (error) {
         setState((current) => ({
            ...current,
            loading: false,
            error: error instanceof Error ? error.message : String(error),
         }));
      }
   };

   useEffect(() => {
      loadData();
   }, []);

   const roomsByArea = useMemo(() => {
      const grouped = new Map<number, RoomWithArea[]>();
      for (const room of state.rooms) {
         if (activeArea !== 'all' && room.area_id !== activeArea) continue;
         grouped.set(room.area_id, [...(grouped.get(room.area_id) ?? []), room]);
      }
      return grouped;
   }, [activeArea, state.rooms]);

   const openRoom = async (room: RoomWithArea) => {
      setSelectedRoom(room);
      setSelectedTenants([]);
      const tenants = await window.api.tenants.listByRoom(room.id);
      setSelectedTenants(tenants);
   };

   const defaultAreaId =
      activeArea === 'all' ? state.areas[0]?.id ?? 1 : activeArea;

   if (state.loading) {
      return (
         <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner label="Đang tải phòng" />
         </div>
      );
   }

   if (state.error) {
      return (
         <EmptyState
            icon={DoorOpen}
            title="Không tải được danh sách phòng"
            description={state.error}
         />
      );
   }

   return (
      <div className="animate-fade-in space-y-lg">
         <div className="flex flex-wrap items-end justify-between gap-md">
            <div>
               <h2 className="text-headline-md text-on-surface">Quản lý Khu và Phòng</h2>
               <p className="mt-xs text-body-md text-on-surface-variant">
                  Xem sơ đồ trực quan và quản lý trạng thái vận hành.
               </p>
            </div>
            <div className="flex flex-wrap gap-sm">
               <button
                  type="button"
                  onClick={() => setAddAreaOpen(true)}
                  className="focus-ring flex h-10 items-center gap-sm rounded-lg border border-outline-variant px-md font-semibold text-primary hover:bg-primary-fixed"
               >
                  <PlusCircle className="h-5 w-5" />
                  <span>Thêm khu mới</span>
               </button>
               <button
                  type="button"
                  onClick={() => setAddRoomOpen(true)}
                  className="focus-ring flex h-10 items-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
               >
                  <Plus className="h-5 w-5" />
                  <span>Thêm phòng mới</span>
               </button>
            </div>
         </div>

         <section className="grid gap-md md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Home} label="Tổng số phòng" value={String(state.counts.total)} tone="primary" />
            <StatCard icon={DoorOpen} label="Phòng trống" value={String(state.counts.vacant)} tone="primary" />
            <StatCard icon={Users} label="Đã thuê" value={String(state.counts.occupied)} tone="secondary" />
            <StatCard icon={Wallet} label="Đang nợ tiền" value={String(state.counts.debt)} tone="tertiary" />
         </section>

         <section className="sticky top-16 z-10 -mx-md border-b border-outline-variant bg-surface px-md pt-sm lg:-mx-lg lg:px-lg">
            <div className="flex gap-md overflow-x-auto">
               <button
                  type="button"
                  onClick={() => setActiveArea('all')}
                  className={[
                     'h-11 shrink-0 border-b-2 px-xs text-body-md font-semibold',
                     activeArea === 'all'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface',
                  ].join(' ')}
               >
                  Tất cả khu
               </button>
               {state.areas.map((area) => (
                  <button
                     key={area.id}
                     type="button"
                     onClick={() => setActiveArea(area.id)}
                     className={[
                        'h-11 shrink-0 border-b-2 px-xs text-body-md font-semibold',
                        activeArea === area.id
                           ? 'border-primary text-primary'
                           : 'border-transparent text-on-surface-variant hover:text-on-surface',
                     ].join(' ')}
                  >
                     {area.name}
                  </button>
               ))}
            </div>
         </section>

         <div className="flex flex-wrap items-center gap-md text-body-md text-on-surface-variant">
            <span className="flex items-center gap-xs">
               <span className="h-3 w-3 rounded-sm border border-outline-variant bg-surface-container-lowest" />
               Phòng trống
            </span>
            <span className="flex items-center gap-xs">
               <span className="h-3 w-3 rounded-sm bg-secondary-container" />
               Đã thuê
            </span>
            <span className="flex items-center gap-xs">
               <span className="h-3 w-3 rounded-sm bg-tertiary-container" />
               Đang nợ
            </span>
         </div>

         {state.areas.map((area) => {
            const rooms = roomsByArea.get(area.id) ?? [];
            if (activeArea !== 'all' && area.id !== activeArea) return null;
            if (rooms.length === 0) return null;

            const vacantCount = rooms.filter((room) => room.status === 'vacant').length;

            return (
               <section key={area.id} className="space-y-md">
                  <div className="flex flex-wrap items-center justify-between gap-md">
                     <div className="flex items-center gap-sm">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-fixed text-primary">
                           <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                           <h3 className="text-headline-sm text-on-surface">{area.name}</h3>
                           <p className="text-body-md text-on-surface-variant">
                              {rooms.length} Phòng · {vacantCount} Trống
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-md">
                     {rooms.map((room) => (
                        <RoomCard
                           key={room.id}
                           room={room}
                           onClick={() => openRoom(room)}
                        />
                     ))}
                  </div>
               </section>
            );
         })}

         <RoomSlideOver
            room={selectedRoom}
            tenants={selectedTenants}
            open={!!selectedRoom}
            onClose={() => setSelectedRoom(null)}
            onEdit={() => setEditRoomOpen(true)}
         />

         <AddAreaModal
            open={addAreaOpen}
            onClose={() => setAddAreaOpen(false)}
            onCreated={loadData}
         />
         <AddRoomModal
            open={addRoomOpen}
            areas={state.areas}
            defaultAreaId={defaultAreaId}
            onClose={() => setAddRoomOpen(false)}
            onCreated={loadData}
         />
         <EditRoomModal
            open={editRoomOpen}
            room={selectedRoom}
            areas={state.areas}
            onClose={() => setEditRoomOpen(false)}
            onSaved={async () => {
               await loadData();
               if (selectedRoom) {
                  const updated = await window.api.rooms.get(selectedRoom.id);
                  setSelectedRoom(updated);
               }
            }}
         />
      </div>
   );
}
