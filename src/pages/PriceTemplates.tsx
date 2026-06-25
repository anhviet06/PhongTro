/**
 * Trang Cập nhật Bảng giá nhanh (inline editing từng phòng).
 */

import { useEffect, useState, useMemo } from 'react';
import { Tags, Search, Edit2, Check, X, Building2 } from 'lucide-react';
import type { RoomWithArea, Area } from '../shared/types';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import MoneyInput, { formatMoney } from '../components/MoneyInput';
import { formatVND } from '../lib/format';

export default function PriceTemplates() {
   const [areas, setAreas] = useState<Area[]>([]);
   const [rooms, setRooms] = useState<RoomWithArea[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   // Bộ lọc
   const [activeArea, setActiveArea] = useState<number | 'all'>('all');
   const [searchQuery, setSearchQuery] = useState('');

   // Chỉnh sửa inline
   const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
   const [editPrice, setEditPrice] = useState(0);
   const [editElectric, setEditElectric] = useState(0);
   const [editWater, setEditWater] = useState(0);
   const [savingId, setSavingId] = useState<number | null>(null);

   const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
         const [areasList, roomsList] = await Promise.all([
            window.api.areas.list(),
            window.api.rooms.listAll(),
         ]);
         setAreas(areasList);
         setRooms(roomsList);
      } catch (err) {
         setError(err instanceof Error ? err.message : String(err));
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      loadData();
   }, []);

   const filteredRooms = useMemo(() => {
      return rooms.filter((room) => {
         const matchArea = activeArea === 'all' || room.area_id === activeArea;
         const matchSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
         return matchArea && matchSearch;
      });
   }, [rooms, activeArea, searchQuery]);

   const startEdit = (room: RoomWithArea) => {
      setEditingRoomId(room.id);
      setEditPrice(room.price);
      setEditElectric(room.electric_unit_price);
      setEditWater(room.water_unit_price);
   };

   const cancelEdit = () => {
      setEditingRoomId(null);
   };

   const saveEdit = async (roomId: number) => {
      setSavingId(roomId);
      try {
         await window.api.rooms.update(roomId, {
            price: editPrice,
            electric_unit_price: editElectric,
            water_unit_price: editWater,
         });
         // Cập nhật lại danh sách phòng từ DB
         const updatedRooms = await window.api.rooms.listAll();
         setRooms(updatedRooms);
         setEditingRoomId(null);
      } catch (err) {
         alert('Cập nhật giá phòng thất bại: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
         setSavingId(null);
      }
   };

   if (loading) {
      return (
         <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner label="Đang tải danh sách bảng giá phòng" />
         </div>
      );
   }

   if (error) {
      return (
         <EmptyState
            icon={Tags}
            title="Không tải được danh sách phòng"
            description={error}
         />
      );
   }

   return (
      <div className="animate-fade-in space-y-lg">
         {/* Tiêu đề */}
         <div>
            <h2 className="text-headline-md text-on-surface">Cập nhật Bảng giá</h2>
            <p className="mt-xs text-body-md text-on-surface-variant">
               Chỉnh sửa nhanh giá thuê phòng, đơn giá điện, nước của từng phòng trực tiếp trên danh sách.
            </p>
         </div>

         {/* Thanh lọc & tìm kiếm */}
         <div className="flex flex-wrap items-center justify-between gap-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
            <div className="flex flex-wrap items-center gap-md">
               <div className="flex items-center gap-sm">
                  <Building2 className="h-5 w-5 text-on-surface-variant shrink-0" />
                  <span className="text-body-md text-on-surface font-semibold shrink-0">Khu vực:</span>
                  <select
                     value={activeArea}
                     onChange={(e) => {
                        setActiveArea(e.target.value === 'all' ? 'all' : Number(e.target.value));
                        cancelEdit();
                     }}
                     className="h-10 rounded-lg border border-outline-variant bg-surface px-sm outline-none focus:border-primary font-semibold text-on-surface cursor-pointer"
                  >
                     <option value="all">Tất cả khu</option>
                     {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                           {area.name}
                        </option>
                     ))}
                  </select>
               </div>
            </div>

            <div className="relative w-full max-w-xs">
               <Search className="absolute left-3 top-2.5 h-5 w-5 text-on-surface-variant" />
               <input
                  type="text"
                  placeholder="Tìm tên phòng..."
                  value={searchQuery}
                  onChange={(e) => {
                     setSearchQuery(e.target.value);
                     cancelEdit();
                  }}
                  className="focus-ring h-10 w-full rounded-lg border border-outline-variant bg-surface pl-10 pr-md outline-none focus:border-primary text-body-md text-on-surface"
               />
            </div>
         </div>

         {/* Danh sách bảng giá phòng */}
         {filteredRooms.length === 0 ? (
            <EmptyState
               icon={Tags}
               title="Không tìm thấy phòng phù hợp"
               description="Vui lòng kiểm tra lại bộ lọc khu vực hoặc từ khóa tìm kiếm."
            />
         ) : (
            <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-body-md">
                     <thead>
                        <tr className="border-b border-outline-variant bg-surface-container-low text-label-md font-semibold text-on-surface-variant">
                           <th className="px-lg py-md w-24">Phòng</th>
                           <th className="px-lg py-md w-40">Khu vực</th>
                           <th className="px-lg py-md w-20">Tầng</th>
                           <th className="px-lg py-md">Giá thuê phòng / tháng</th>
                           <th className="px-lg py-md">Đơn giá điện</th>
                           <th className="px-lg py-md">Đơn giá nước</th>
                           <th className="px-lg py-md text-right w-32">Thao tác</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-outline-variant">
                        {filteredRooms.map((room) => {
                           const isEditing = room.id === editingRoomId;
                           const isSaving = room.id === savingId;

                           return (
                              <tr key={room.id} className="hover:bg-surface-container-high/30 transition">
                                 {/* Tên phòng */}
                                 <td className="px-lg py-md font-bold text-on-surface">
                                    {room.name}
                                 </td>

                                 {/* Khu vực */}
                                 <td className="px-lg py-md text-on-surface-variant">
                                    {room.area_name}
                                 </td>

                                 {/* Tầng */}
                                 <td className="px-lg py-md text-on-surface-variant">
                                    Tầng {room.floor}
                                 </td>

                                 {/* Giá phòng */}
                                 <td className="px-lg py-md">
                                    {isEditing ? (
                                       <MoneyInput
                                          value={editPrice}
                                          onChange={setEditPrice}
                                          className="focus-ring h-9 w-full max-w-[160px] rounded-lg border border-outline-variant bg-surface px-sm outline-none focus:border-primary font-semibold text-primary"
                                       />
                                    ) : (
                                       <span className="font-semibold text-primary">
                                          {room.price > 0 ? formatVND(room.price) : 'Miễn phí'}
                                       </span>
                                    )}
                                 </td>

                                 {/* Đơn giá điện */}
                                 <td className="px-lg py-md">
                                    {isEditing ? (
                                       <div className="flex items-center gap-xs">
                                          <MoneyInput
                                             value={editElectric}
                                             onChange={setEditElectric}
                                             className="focus-ring h-9 w-full max-w-[100px] rounded-lg border border-outline-variant bg-surface px-sm outline-none focus:border-primary"
                                          />
                                          <span className="text-body-sm text-on-surface-variant">đ/kWh</span>
                                       </div>
                                    ) : (
                                       <span>{formatMoney(room.electric_unit_price)} đ/kWh</span>
                                    )}
                                 </td>

                                 {/* Đơn giá nước */}
                                 <td className="px-lg py-md">
                                    {isEditing ? (
                                       <div className="flex items-center gap-xs">
                                          <MoneyInput
                                             value={editWater}
                                             onChange={setEditWater}
                                             className="focus-ring h-9 w-full max-w-[120px] rounded-lg border border-outline-variant bg-surface px-sm outline-none focus:border-primary"
                                          />
                                          <span className="text-body-sm text-on-surface-variant">đ/m³</span>
                                       </div>
                                    ) : (
                                       <span>{formatMoney(room.water_unit_price)} đ/m³</span>
                                    )}
                                 </td>

                                 {/* Hành động */}
                                 <td className="px-lg py-md text-right">
                                    {isEditing ? (
                                       <div className="flex justify-end gap-sm">
                                          <button
                                             type="button"
                                             onClick={() => saveEdit(room.id)}
                                             disabled={isSaving}
                                             className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50"
                                             title="Lưu"
                                          >
                                             {isSaving ? (
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                                             ) : (
                                                <Check className="h-4 w-4" />
                                             )}
                                          </button>
                                          <button
                                             type="button"
                                             onClick={cancelEdit}
                                             disabled={isSaving}
                                             className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high disabled:opacity-50"
                                             title="Hủy"
                                          >
                                             <X className="h-4 w-4" />
                                          </button>
                                       </div>
                                    ) : (
                                       <button
                                          type="button"
                                          onClick={() => startEdit(room)}
                                          disabled={editingRoomId !== null}
                                          className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30"
                                          title="Sửa bảng giá phòng"
                                       >
                                          <Edit2 className="h-4 w-4" />
                                       </button>
                                    )}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
      </div>
   );
}
