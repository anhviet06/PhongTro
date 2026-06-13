/**
 * Trang Công nợ: danh sách hóa đơn chưa thanh toán và ghi nhận tiền thu.
 */

import { useEffect, useMemo, useState } from 'react';
import { Filter, Receipt, Wallet } from 'lucide-react';
import type { Area, InvoiceWithDetails } from '../shared/types';
import StatCard from '../components/StatCard';
import Chip from '../components/Chip';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import PaymentModal from '../components/debts/PaymentModal';
import { daysOverdue, formatVND } from '../lib/format';

interface DebtsState {
   invoices: InvoiceWithDetails[];
   areas: Area[];
   totalDebt: number;
   loading: boolean;
   error: string | null;
}

export default function Debts() {
   const [state, setState] = useState<DebtsState>({
      invoices: [],
      areas: [],
      totalDebt: 0,
      loading: true,
      error: null,
   });
   const [areaFilter, setAreaFilter] = useState<number | 'all'>('all');
   const [sortBy, setSortBy] = useState<'debt' | 'days'>('debt');
   const [paymentInvoice, setPaymentInvoice] = useState<InvoiceWithDetails | null>(null);

   const loadData = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
         const [invoices, areas, totalDebt] = await Promise.all([
            window.api.invoices.listUnpaid(),
            window.api.areas.list(),
            window.api.stats.totalDebt(),
         ]);
         setState({ invoices, areas, totalDebt, loading: false, error: null });
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

   const filteredInvoices = useMemo(() => {
      return state.invoices
         .filter((invoice) => areaFilter === 'all' || invoice.area_id === areaFilter)
         .sort((a, b) => {
            if (sortBy === 'days') return daysOverdue(b.created_at) - daysOverdue(a.created_at);
            return b.total - b.paid_amount - (a.total - a.paid_amount);
         });
   }, [areaFilter, sortBy, state.invoices]);

   if (state.loading) {
      return (
         <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner label="Đang tải công nợ" />
         </div>
      );
   }

   if (state.error) {
      return <EmptyState icon={Wallet} title="Không tải được công nợ" description={state.error} />;
   }

   return (
      <div className="animate-fade-in space-y-lg">
         <div className="flex flex-wrap items-end justify-between gap-md">
            <div>
               <h2 className="text-headline-md text-on-surface">Công nợ</h2>
               <p className="mt-xs text-body-md text-on-surface-variant">
                  Theo dõi các hóa đơn chưa thanh toán và ghi nhận tiền thu.
               </p>
            </div>
         </div>

         <section className="grid gap-md md:grid-cols-3">
            <StatCard
               icon={Wallet}
               label="Tổng công nợ"
               value={formatVND(state.totalDebt)}
               tone="tertiary"
            />
            <StatCard
               icon={Receipt}
               label="Hóa đơn chưa thu"
               value={String(state.invoices.length)}
               tone="primary"
            />
            <StatCard
               icon={Filter}
               label="Đang hiển thị"
               value={String(filteredInvoices.length)}
               tone="neutral"
            />
         </section>

         <section className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-md border-b border-outline-variant p-md">
               <div>
                  <h3 className="text-headline-sm text-on-surface">Danh sách phòng còn nợ</h3>
                  <p className="text-body-md text-on-surface-variant">
                     {filteredInvoices.length} hóa đơn cần xử lý
                  </p>
               </div>
               <div className="flex flex-wrap gap-sm">
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
                     value={sortBy}
                     onChange={(event) => setSortBy(event.target.value as 'debt' | 'days')}
                     className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                  >
                     <option value="debt">Nợ cao nhất</option>
                     <option value="days">Quá hạn lâu nhất</option>
                  </select>
               </div>
            </div>

            {filteredInvoices.length === 0 ? (
               <div className="p-md">
                  <EmptyState icon={Wallet} title="Không có công nợ" />
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse text-left">
                     <thead className="bg-surface-container-low">
                        <tr className="text-label-md uppercase text-on-surface-variant">
                           <th className="px-md py-sm">Phòng</th>
                           <th className="px-md py-sm">Khách thuê</th>
                           <th className="px-md py-sm text-right">Số tiền nợ</th>
                           <th className="px-md py-sm">Quá hạn</th>
                           <th className="px-md py-sm">Trạng thái</th>
                           <th className="px-md py-sm text-right">Thao tác</th>
                        </tr>
                     </thead>
                     <tbody>
                        {filteredInvoices.map((invoice) => {
                           const debt = invoice.total - invoice.paid_amount;
                           return (
                              <tr
                                 key={invoice.id}
                                 className="border-t border-outline-variant hover:bg-surface-container-low"
                              >
                                 <td className="px-md py-sm">
                                    <p className="font-semibold text-primary">{invoice.room_name}</p>
                                    <p className="text-body-md text-on-surface-variant">{invoice.area_name}</p>
                                 </td>
                                 <td className="px-md py-sm text-on-surface">{invoice.tenant_name ?? '-'}</td>
                                 <td className="px-md py-sm text-right font-bold text-tertiary">
                                    {formatVND(debt)}
                                 </td>
                                 <td className="px-md py-sm text-on-surface-variant">
                                    {daysOverdue(invoice.created_at)} ngày
                                 </td>
                                 <td className="px-md py-sm">
                                    <Chip tone={invoice.status === 'partial' ? 'warning' : 'danger'}>
                                       {invoice.status === 'partial' ? 'Trả một phần' : 'Chưa trả'}
                                    </Chip>
                                 </td>
                                 <td className="px-md py-sm text-right">
                                    <button
                                       type="button"
                                       onClick={() => setPaymentInvoice(invoice)}
                                       className="focus-ring h-9 rounded-lg bg-primary px-sm font-semibold text-on-primary hover:bg-primary-container"
                                    >
                                       Ghi nhận thanh toán
                                    </button>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            )}
         </section>

         <PaymentModal
            open={!!paymentInvoice}
            invoice={paymentInvoice}
            onClose={() => setPaymentInvoice(null)}
            onPaid={loadData}
         />
      </div>
   );
}
