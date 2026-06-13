/**
 * Bảng tổng hợp doanh thu theo khu.
 */

import type { Area, RevenueByAreaRow, RoomWithArea } from '../../shared/types';
import { formatVND } from '../../lib/format';

interface SummaryTableProps {
   areas: Area[];
   rooms: RoomWithArea[];
   revenueByArea: RevenueByAreaRow[];
}

export default function SummaryTable({ areas, rooms, revenueByArea }: SummaryTableProps) {
   const rows = areas.map((area) => {
      const areaRevenue = revenueByArea.filter((row) => row.area_id === area.id);
      const areaRooms = rooms.filter((room) => room.area_id === area.id);
      const occupiedRooms = areaRooms.filter((room) => room.status !== 'vacant').length;
      const totalRevenue = areaRevenue.reduce((sum, row) => sum + row.total_revenue, 0);
      const paidRevenue = areaRevenue.reduce((sum, row) => sum + row.paid_revenue, 0);
      const debtAmount = areaRevenue.reduce((sum, row) => sum + row.debt_amount, 0);
      const occupancyRate = areaRooms.length ? Math.round((occupiedRooms / areaRooms.length) * 100) : 0;

      return {
         area,
         totalRevenue,
         paidRevenue,
         debtAmount,
         occupancyRate,
         contractCount: occupiedRooms,
      };
   });

   return (
      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
         <div className="border-b border-outline-variant p-md">
            <h3 className="text-headline-sm text-on-surface">Bảng tổng hợp theo khu</h3>
            <p className="text-body-md text-on-surface-variant">Doanh thu, công nợ và tỷ lệ lấp đầy</p>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
               <thead className="bg-surface-container-low">
                  <tr className="text-label-md uppercase text-on-surface-variant">
                     <th className="px-md py-sm">Khu</th>
                     <th className="px-md py-sm text-right">Doanh thu</th>
                     <th className="px-md py-sm text-right">Đã thu</th>
                     <th className="px-md py-sm text-right">Chưa thu</th>
                     <th className="px-md py-sm text-right">Lấp đầy</th>
                     <th className="px-md py-sm text-right">Số HĐ</th>
                  </tr>
               </thead>
               <tbody>
                  {rows.map((row) => (
                     <tr key={row.area.id} className="border-t border-outline-variant hover:bg-surface-container-low">
                        <td className="px-md py-sm font-semibold text-on-surface">{row.area.name}</td>
                        <td className="px-md py-sm text-right text-on-surface">{formatVND(row.totalRevenue)}</td>
                        <td className="px-md py-sm text-right text-secondary">{formatVND(row.paidRevenue)}</td>
                        <td className="px-md py-sm text-right text-tertiary">{formatVND(row.debtAmount)}</td>
                        <td className="px-md py-sm text-right text-on-surface">{row.occupancyRate}%</td>
                        <td className="px-md py-sm text-right text-on-surface">{row.contractCount}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </section>
   );
}
