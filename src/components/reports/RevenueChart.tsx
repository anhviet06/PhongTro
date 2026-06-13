/**
 * Chart doanh thu cho trang Reports.
 */

import {
   Bar,
   BarChart,
   CartesianGrid,
   Legend,
   ResponsiveContainer,
   Tooltip,
   XAxis,
   YAxis,
} from 'recharts';
import type { RevenueByMonthRow } from '../../shared/types';
import { formatVND } from '../../lib/format';

interface RevenueChartProps {
   data: RevenueByMonthRow[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
   return (
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
         <h3 className="text-headline-sm text-on-surface">Doanh thu theo tháng</h3>
         <p className="mb-md text-body-md text-on-surface-variant">So sánh tổng tiền, đã thu và còn nợ</p>
         <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#dfe3e8" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis
                     width={82}
                     tickLine={false}
                     axisLine={false}
                     tickFormatter={(value) => `${Number(value) / 1000000}M`}
                  />
                  <Tooltip formatter={(value) => formatVND(Number(value))} />
                  <Legend />
                  <Bar dataKey="total_revenue" name="Doanh thu" fill="#005bbf" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="paid_revenue" name="Đã thu" fill="#006e2c" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="debt_amount" name="Chưa thu" fill="#dc392c" radius={[6, 6, 0, 0]} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </section>
   );
}
