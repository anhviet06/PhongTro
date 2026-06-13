/**
 * Trang Báo cáo: doanh thu theo tháng/khu và xuất Excel.
 */

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, TrendingUp, Wallet } from 'lucide-react';
import type { Area, RevenueByAreaRow, RevenueByMonthRow, RoomWithArea } from '../shared/types';
import StatCard from '../components/StatCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import RevenueChart from '../components/reports/RevenueChart';
import SummaryTable from '../components/reports/SummaryTable';
import { formatVND } from '../lib/format';

interface ReportsState {
   areas: Area[];
   rooms: RoomWithArea[];
   revenueByArea: RevenueByAreaRow[];
   revenueByMonth: RevenueByMonthRow[];
   loading: boolean;
   error: string | null;
}

export default function Reports() {
   const [year, setYear] = useState(new Date().getFullYear());
   const [areaFilter, setAreaFilter] = useState<number | 'all'>('all');
   const [state, setState] = useState<ReportsState>({
      areas: [],
      rooms: [],
      revenueByArea: [],
      revenueByMonth: [],
      loading: true,
      error: null,
   });

   const loadData = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
         const [areas, rooms, revenueByArea, revenueByMonth] = await Promise.all([
            window.api.areas.list(),
            window.api.rooms.listAll(),
            window.api.stats.revenueByArea(12),
            window.api.stats.revenueByMonth(year),
         ]);
         setState({ areas, rooms, revenueByArea, revenueByMonth, loading: false, error: null });
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
   }, [year]);

   const filteredRevenueByArea = useMemo(
      () =>
         areaFilter === 'all'
            ? state.revenueByArea
            : state.revenueByArea.filter((row) => row.area_id === areaFilter),
      [areaFilter, state.revenueByArea]
   );

   const filteredRooms = useMemo(
      () =>
         areaFilter === 'all'
            ? state.rooms
            : state.rooms.filter((room) => room.area_id === areaFilter),
      [areaFilter, state.rooms]
   );

   const filteredAreas = useMemo(
      () =>
         areaFilter === 'all'
            ? state.areas
            : state.areas.filter((area) => area.id === areaFilter),
      [areaFilter, state.areas]
   );

   const totals = filteredRevenueByArea.reduce(
      (acc, row) => {
         acc.total += row.total_revenue;
         acc.paid += row.paid_revenue;
         acc.debt += row.debt_amount;
         return acc;
      },
      { total: 0, paid: 0, debt: 0 }
   );

   const exportExcel = async () => {
      await window.api.export.revenueExcel({ year, monthsBack: 12 });
   };

   if (state.loading) {
      return (
         <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner label="Đang tải báo cáo" />
         </div>
      );
   }

   if (state.error) {
      return <EmptyState icon={BarChart3} title="Không tải được báo cáo" description={state.error} />;
   }

   return (
      <div className="animate-fade-in space-y-lg">
         <div className="flex flex-wrap items-end justify-between gap-md">
            <div>
               <h2 className="text-headline-md text-on-surface">Báo cáo</h2>
               <p className="mt-xs text-body-md text-on-surface-variant">
                  Phân tích doanh thu theo khu, theo tháng và xuất Excel.
               </p>
            </div>
            <button
               type="button"
               onClick={exportExcel}
               className="focus-ring flex h-10 items-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
            >
               <Download className="h-5 w-5" />
               <span>Xuất Excel</span>
            </button>
         </div>

         <section className="flex flex-wrap gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
            <select
               value={areaFilter}
               onChange={(event) =>
                  setAreaFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))
               }
               className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            >
               <option value="all">Tất cả khu</option>
               {state.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                     {area.name}
                  </option>
               ))}
            </select>
            <select
               value={year}
               onChange={(event) => setYear(Number(event.target.value))}
               className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            >
               {[year - 1, year, year + 1].map((item) => (
                  <option key={item} value={item}>
                     {item}
                  </option>
               ))}
            </select>
         </section>

         <section className="grid gap-md md:grid-cols-3">
            <StatCard
               icon={TrendingUp}
               label="Tổng doanh thu"
               value={formatVND(totals.total)}
               tone="primary"
            />
            <StatCard
               icon={Wallet}
               label="Đã thu"
               value={formatVND(totals.paid)}
               tone="secondary"
            />
            <StatCard
               icon={Wallet}
               label="Chưa thu"
               value={formatVND(totals.debt)}
               tone="tertiary"
            />
         </section>

         <RevenueChart data={state.revenueByMonth} />
         <SummaryTable
            areas={filteredAreas}
            rooms={filteredRooms}
            revenueByArea={filteredRevenueByArea}
         />
      </div>
   );
}
