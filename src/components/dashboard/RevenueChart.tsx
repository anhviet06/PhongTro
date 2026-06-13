/**
 * Chart doanh thu 6 tháng gần nhất cho Dashboard.
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
import { formatVND } from '../../lib/format';

export interface RevenueChartPoint {
   period: string;
   revenue: number;
   cost: number;
}

interface RevenueChartProps {
   data: RevenueChartPoint[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
   return (
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
         <div className="mb-md flex items-center justify-between gap-md">
            <div>
               <h3 className="text-headline-sm text-on-surface">Doanh thu 6 tháng gần nhất</h3>
               <p className="text-body-md text-on-surface-variant">Tổng hợp tiền đã thu theo kỳ</p>
            </div>
         </div>

         <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#dfe3e8" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis
                     tickLine={false}
                     axisLine={false}
                     width={82}
                     tickFormatter={(value) => `${Number(value) / 1000000}M`}
                  />
                  <Tooltip
                     formatter={(value, name) => [
                        formatVND(Number(value)),
                        name === 'revenue' ? 'Doanh thu' : 'Chi phí',
                     ]}
                     labelFormatter={(label) => `Kỳ ${label}`}
                  />
                  <Legend
                     formatter={(value) => (value === 'revenue' ? 'Doanh thu' : 'Chi phí')}
                  />
                  <Bar dataKey="revenue" fill="#005bbf" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="cost" fill="#86f898" radius={[6, 6, 0, 0]} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </section>
   );
}
