/**
 * Trang Khách thuê: danh sách, thêm khách và quản lý xe.
 */

import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Filter, Plus, Users, DoorOpen } from 'lucide-react';
import type { RoomWithArea, Settings, TenantWithRoom } from '../shared/types';
import StatCard from '../components/StatCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import TenantTable from '../components/tenants/TenantTable';
import TenantDetailModal from '../components/tenants/TenantDetailModal';
import AddTenantContractModal from '../components/tenants/AddTenantContractModal';

interface TenantsState {
   tenants: TenantWithRoom[];
   rooms: RoomWithArea[];
   settings: Settings;
   vacantCount: number;
   expiringCount: number;
   loading: boolean;
   error: string | null;
}

const pageSize = 10;

export default function Tenants() {
   const [state, setState] = useState<TenantsState>({
      tenants: [],
      rooms: [],
      settings: {},
      vacantCount: 0,
      expiringCount: 0,
      loading: true,
      error: null,
   });
   const [page, setPage] = useState(1);
   const [selectedTenant, setSelectedTenant] = useState<TenantWithRoom | null>(null);
   const [addOpen, setAddOpen] = useState(false);

   const loadData = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
         const [tenants, rooms, counts, expiring, settings] = await Promise.all([
            window.api.tenants.listAll(),
            window.api.rooms.listAll(),
            window.api.rooms.countByStatus(),
            window.api.contracts.expiringSoon(30),
            window.api.settings.getMany([
               'landlord_name',
               'landlord_cccd',
               'landlord_phone',
               'landlord_address',
            ]),
         ]);
         setState({
            tenants,
            rooms,
            settings,
            vacantCount: counts.vacant,
            expiringCount: expiring.length,
            loading: false,
            error: null,
         });
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

   const pagedTenants = useMemo(() => {
      const start = (page - 1) * pageSize;
      return state.tenants.slice(start, start + pageSize);
   }, [page, state.tenants]);

   const totalPages = Math.max(1, Math.ceil(state.tenants.length / pageSize));

   const exportExcel = async () => {
      await window.api.export.tenantsExcel();
   };

   if (state.loading) {
      return (
         <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner label="Đang tải khách thuê" />
         </div>
      );
   }

   if (state.error) {
      return <EmptyState icon={Users} title="Không tải được khách thuê" description={state.error} />;
   }

   return (
      <div className="animate-fade-in space-y-lg">
         <div className="flex flex-wrap items-end justify-between gap-md">
            <div>
               <h2 className="text-headline-md text-on-surface">Khách thuê</h2>
               <p className="mt-xs text-body-md text-on-surface-variant">
                  Quản lý người ở, người đại diện và phương tiện đăng ký.
               </p>
            </div>
            <button
               type="button"
               onClick={() => setAddOpen(true)}
               className="focus-ring flex h-10 items-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
            >
               <Plus className="h-5 w-5" />
               <span>Thêm khách thuê</span>
            </button>
         </div>

         <section className="grid gap-md md:grid-cols-2 xl:grid-cols-4">
            <StatCard
               icon={Users}
               label="Tổng khách thuê"
               value={String(state.tenants.length)}
               tone="primary"
            />
            <StatCard
               icon={FileText}
               label="Hợp đồng sắp hết hạn"
               value={String(state.expiringCount)}
               sub="Trong 30 ngày"
               tone="tertiary"
            />
            <StatCard
               icon={DoorOpen}
               label="Phòng trống"
               value={String(state.vacantCount)}
               tone="primary"
            />
            <button
               type="button"
               onClick={() => setAddOpen(true)}
               className="focus-ring rounded-lg border border-outline-variant bg-primary p-md text-left text-on-primary shadow-sm hover:bg-primary-container"
            >
               <Plus className="mb-md h-6 w-6" />
               <p className="text-headline-sm font-semibold">Tạo hợp đồng mới</p>
               <p className="mt-xs text-body-md opacity-90">Thêm khách và chuyển sang hợp đồng</p>
            </button>
         </section>

         <section className="space-y-md">
            <div className="flex flex-wrap items-center justify-between gap-md">
               <div>
                  <h3 className="text-headline-sm text-on-surface">Danh sách khách thuê</h3>
                  <p className="text-body-md text-on-surface-variant">
                     Hiển thị {pagedTenants.length} trong tổng số {state.tenants.length}
                  </p>
               </div>
               <div className="flex gap-sm">
                  <button
                     type="button"
                     className="focus-ring flex h-10 items-center gap-sm rounded-lg border border-outline-variant px-md text-on-surface hover:bg-surface-container-high"
                  >
                     <Filter className="h-5 w-5" />
                     <span>Lọc</span>
                  </button>
                  <button
                     type="button"
                     onClick={exportExcel}
                     className="focus-ring flex h-10 items-center gap-sm rounded-lg border border-outline-variant px-md text-primary hover:bg-primary-fixed"
                  >
                     <Download className="h-5 w-5" />
                     <span>Xuất Excel</span>
                  </button>
               </div>
            </div>

            {state.tenants.length === 0 ? (
               <EmptyState icon={Users} title="Chưa có khách thuê" />
            ) : (
               <>
                  <TenantTable
                     tenants={pagedTenants}
                     onDetail={setSelectedTenant}
                     onDelete={async (tenant) => {
                        const ok = window.confirm(
                           `Xóa khách thuê "${tenant.full_name}"?\nLưu ý: phương tiện đăng ký của khách này cũng sẽ bị xóa.`
                        );
                        if (!ok) return;
                        try {
                           await window.api.tenants.delete(tenant.id);
                           await loadData();
                        } catch (error) {
                           window.alert(
                              `Xóa thất bại: ${error instanceof Error ? error.message : String(error)}`
                           );
                        }
                     }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-md rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm">
                     <p className="text-body-md text-on-surface-variant">
                        Trang {page}/{totalPages}
                     </p>
                     <div className="flex gap-xs">
                        <button
                           type="button"
                           onClick={() => setPage((current) => Math.max(1, current - 1))}
                           disabled={page === 1}
                           className="h-9 rounded-lg border border-outline-variant px-sm hover:bg-surface-container-high"
                        >
                           Trước
                        </button>
                        <button
                           type="button"
                           onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                           disabled={page === totalPages}
                           className="h-9 rounded-lg border border-outline-variant px-sm hover:bg-surface-container-high"
                        >
                           Sau
                        </button>
                     </div>
                  </div>
               </>
            )}
         </section>

         <TenantDetailModal
            open={!!selectedTenant}
            tenant={selectedTenant}
            onClose={() => setSelectedTenant(null)}
            onUpdated={loadData}
         />
         <AddTenantContractModal
            open={addOpen}
            rooms={state.rooms}
            settings={state.settings}
            onClose={() => setAddOpen(false)}
            onCreated={loadData}
         />
      </div>
   );
}
