/**
 * Trang Dashboard: tổng quan vận hành và doanh thu.
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Banknote, DoorOpen, Eye, ScrollText } from 'lucide-react';
import type {
   ContractWithDetails,
   DashboardSummary,
   RevenueByMonthRow,
   RoomWithArea,
} from '../shared/types';
import StatCard from '../components/StatCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import RevenueChart, { type RevenueChartPoint } from '../components/dashboard/RevenueChart';
import TodoList from '../components/dashboard/TodoList';
import { formatVND } from '../lib/format';

interface DashboardState {
   summary: DashboardSummary | null;
   revenue: RevenueByMonthRow[];
   vacantRooms: RoomWithArea[];
   expiringContracts: ContractWithDetails[];
   loading: boolean;
   error: string | null;
}

function monthLabel(period: string): string {
   const [, month] = period.split('-');
   return `T${Number(month)}`;
}

function lastSixPeriods(): string[] {
   const result: string[] = [];
   const date = new Date();
   date.setDate(1);

   for (let i = 5; i >= 0; i -= 1) {
      const item = new Date(date.getFullYear(), date.getMonth() - i, 1);
      result.push(`${item.getFullYear()}-${String(item.getMonth() + 1).padStart(2, '0')}`);
   }

   return result;
}

export default function Dashboard() {
   const [state, setState] = useState<DashboardState>({
      summary: null,
      revenue: [],
      vacantRooms: [],
      expiringContracts: [],
      loading: true,
      error: null,
   });

   useEffect(() => {
      let alive = true;

      Promise.all([
         window.api.stats.dashboardSummary(),
         window.api.stats.revenueByMonth(new Date().getFullYear()),
         window.api.rooms.listByStatus('vacant', 4),
         window.api.contracts.expiringSoon(30),
      ])
         .then(([summary, revenue, vacantRooms, expiringContracts]) => {
            if (alive) {
               setState({
                  summary,
                  revenue,
                  vacantRooms,
                  expiringContracts,
                  loading: false,
                  error: null,
               });
            }
         })
         .catch((error: unknown) => {
            if (alive) {
               setState((current) => ({
                  ...current,
                  loading: false,
                  error: error instanceof Error ? error.message : String(error),
               }));
            }
         });

      return () => {
         alive = false;
      };
   }, []);

   const chartData = useMemo<RevenueChartPoint[]>(() => {
      const byPeriod = new Map(state.revenue.map((row) => [row.period, row]));
      return lastSixPeriods().map((period) => {
         const row = byPeriod.get(period);
         return {
            period: monthLabel(period),
            revenue: row?.paid_revenue ?? 0,
            cost: 0,
         };
      });
   }, [state.revenue]);

   if (state.loading) {
      return (
         <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner label="Đang tải Dashboard" />
         </div>
      );
   }

   if (state.error || !state.summary) {
      return (
         <EmptyState
            icon={AlertTriangle}
            title="Không tải được Dashboard"
            description={state.error ?? 'Vui lòng thử lại sau.'}
         />
      );
   }

   const totalRooms = state.summary.room_status.total || 1;
   const vacantPercent = Math.round((state.summary.room_status.vacant / totalRooms) * 100);

   return (
      <div className="animate-fade-in space-y-lg">
         <div className="flex flex-wrap items-end justify-between gap-md">
            <div>
               <h2 className="text-headline-md text-on-surface">Tổng quan</h2>
               <p className="mt-xs text-body-md text-on-surface-variant">
                  Theo dõi vận hành, doanh thu và công nợ hiện tại.
               </p>
            </div>
         </div>

         <section className="grid gap-md md:grid-cols-2 xl:grid-cols-4">
            <StatCard
               icon={Banknote}
               label="Doanh thu tháng này"
               value={formatVND(state.summary.monthly_revenue)}
               badge="Đã thu"
               sub="Tính theo paid_amount"
               tone="primary"
            />
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
               <div className="flex items-start justify-between gap-md">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-fixed text-primary">
                     <DoorOpen className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-surface-container-high px-sm py-xs text-label-sm text-on-surface-variant">
                     Trống {state.summary.room_status.vacant}/{state.summary.room_status.total}
                  </span>
               </div>
               <p className="mt-md text-body-md text-on-surface-variant">Số phòng trống</p>
               <p className="mt-xs text-headline-md font-bold text-on-surface">
                  {String(state.summary.room_status.vacant).padStart(2, '0')}
               </p>
               <div className="mt-sm h-2 rounded-full bg-surface-container-high">
                  <div
                     className="h-2 rounded-full bg-primary"
                     style={{ width: `${vacantPercent}%` }}
                  />
               </div>
            </div>
            <StatCard
               icon={AlertTriangle}
               label="Tổng công nợ"
               value={formatVND(state.summary.total_debt)}
               badge={`${state.summary.top_debtors.length} phòng`}
               sub="Các hóa đơn chưa thanh toán"
               tone="tertiary"
            />
            <StatCard
               icon={ScrollText}
               label="Hợp đồng sắp hết hạn"
               value={String(state.expiringContracts.length).padStart(2, '0')}
               badge="30 ngày"
               sub={
                  state.expiringContracts.length === 0
                     ? 'Không có HĐ sắp hết hạn'
                     : `${state.expiringContracts.length} HĐ cần gia hạn`
               }
               tone="neutral"
            />
         </section>

         <section className="grid gap-md xl:grid-cols-12">
            <div className="xl:col-span-8">
               <RevenueChart data={chartData} />
            </div>
            <div className="xl:col-span-4">
               <TodoList />
            </div>
         </section>

         <section>
            <div className="mb-md flex items-center justify-between gap-md">
               <div>
                  <h3 className="text-headline-sm text-on-surface">Phòng mới trống</h3>
                  <p className="text-body-md text-on-surface-variant">
                     Danh sách phòng trống đầu tiên trong hệ thống
                  </p>
               </div>
            </div>

            {state.vacantRooms.length === 0 ? (
               <EmptyState icon={DoorOpen} title="Không có phòng trống" />
            ) : (
               <div className="grid gap-md md:grid-cols-2 xl:grid-cols-4">
                  {state.vacantRooms.map((room) => (
                     <article
                        key={room.id}
                        className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm"
                     >
                        <div className="flex items-center justify-between gap-md">
                           <div>
                              <p className="text-headline-sm text-primary">{room.name}</p>
                              <p className="text-body-md text-on-surface-variant">{room.area_name}</p>
                           </div>
                           <span className="rounded-full bg-primary-fixed px-sm py-xs text-label-sm text-primary">
                              TRỐNG
                           </span>
                        </div>
                        <div className="mt-md space-y-xs text-body-md text-on-surface-variant">
                           <p>Diện tích: {room.area_m2 || 0} m²</p>
                           <p>Giá thuê: {formatVND(room.price)}</p>
                        </div>
                        <button
                           type="button"
                           className="focus-ring mt-md flex h-9 w-full items-center justify-center gap-sm rounded-lg border border-outline-variant text-primary hover:bg-primary-fixed"
                        >
                           <Eye className="h-4 w-4" />
                           <span>Xem chi tiết</span>
                        </button>
                     </article>
                  ))}
               </div>
            )}
         </section>
      </div>
   );
}
