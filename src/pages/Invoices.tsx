/**
 * Trang Hóa đơn / Tính tiền: ghi chỉ số, preview và tạo hóa đơn.
 */

import { useEffect, useMemo, useState } from 'react';
import { Calculator, Download, Receipt, Send, Wallet } from 'lucide-react';
import type {
   BillingResult,
   InvoiceStatus,
   InvoiceWithDetails,
   RoomWithArea,
   Service,
} from '../shared/types';
import MeterInput from '../components/invoices/MeterInput';
import BillingPreview from '../components/invoices/BillingPreview';
import InvoiceTable from '../components/invoices/InvoiceTable';
import InvoiceDetailModal from '../components/invoices/InvoiceDetailModal';
import SendNotifyModal from '../components/invoices/SendNotifyModal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { useAppStore } from '../stores/appStore';
import { formatPeriod, formatVND } from '../lib/format';

interface InvoicePageState {
   rooms: RoomWithArea[];
   services: Service[];
   invoices: InvoiceWithDetails[];
   totalDebt: number;
   topDebtors: Awaited<ReturnType<typeof window.api.stats.topDebtors>>;
   loading: boolean;
   error: string | null;
}

/**
 * Tạo list 18 kỳ: 12 tháng quá khứ + tháng hiện tại + 5 tháng tương lai.
 * Tương lai cho phép vì user có thể muốn tạo HĐ trước (vd: kỳ tháng sau).
 */
function buildPeriodOptions(): { value: string; label: string }[] {
   const options: { value: string; label: string }[] = [];
   const now = new Date();
   for (let i = -12; i <= 5; i += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
      options.push({ value, label });
   }
   return options.reverse(); // mới nhất lên đầu
}

export default function Invoices() {
   const period = useAppStore((state) => state.period);
   const setPeriod = useAppStore((state) => state.setPeriod);
   const periodOptions = useMemo(buildPeriodOptions, []);
   const currentPeriodValue = useMemo(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
   }, []);
   const isPastPeriod = period < currentPeriodValue;
   const isFuturePeriod = period > currentPeriodValue;
   const [state, setState] = useState<InvoicePageState>({
      rooms: [],
      services: [],
      invoices: [],
      totalDebt: 0,
      topDebtors: [],
      loading: true,
      error: null,
   });
   const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
   const [electricStart, setElectricStart] = useState(0);
   const [electricEnd, setElectricEnd] = useState(0);
   const [waterStart, setWaterStart] = useState(0);
   const [waterEnd, setWaterEnd] = useState(0);
   const [peopleCount, setPeopleCount] = useState(0);
   const [preview, setPreview] = useState<BillingResult | null>(null);
   const [previewError, setPreviewError] = useState<string | null>(null);
   const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
   const [detailInvoice, setDetailInvoice] = useState<InvoiceWithDetails | null>(null);
   const [notifyInvoice, setNotifyInvoice] = useState<InvoiceWithDetails | null>(null);
   const [refreshTrigger, setRefreshTrigger] = useState(0);

   const loadData = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
         const [rooms, services, invoices, totalDebt, topDebtors] = await Promise.all([
            window.api.rooms.listAll(),
            window.api.services.listActive(),
            window.api.invoices.listByPeriod(period),
            window.api.stats.totalDebt(),
            window.api.stats.topDebtors(5),
         ]);
         const billableRooms = rooms.filter((room) => room.status !== 'vacant');
         setState({
            rooms: billableRooms,
            services,
            invoices,
            totalDebt,
            topDebtors,
            loading: false,
            error: null,
         });
         // Reset selectedRoomId nếu room hiện tại không còn trong list billable (vd: HĐ vừa terminate)
         setSelectedRoomId((current) => {
            if (current && billableRooms.some((room) => room.id === current)) {
               return current;
            }
            return billableRooms[0]?.id ?? null;
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
   }, [period, refreshTrigger]);

   useEffect(() => {
      if (!selectedRoomId) return;

      let alive = true;
      // Load chỉ số kỳ hiện tại (nếu user đã set trước qua Settings) + chỉ số kỳ trước (làm chỉ số đầu)
      Promise.all([
         window.api.meters.getByRoomPeriod(selectedRoomId, period),
         window.api.meters.getPrevious(selectedRoomId, period),
         window.api.tenants.countActiveInRoom(selectedRoomId),
      ]).then(([current, previous, count]) => {
         if (!alive) return;
         const prevElectric = previous?.electric_end ?? 0;
         const prevWater = previous?.water_end ?? 0;
         // Nếu kỳ này đã có record → ưu tiên load từ DB
         // (vd user đã set chỉ số đầu kỳ qua Settings Chỉnh chỉ số → billing form tự fill)
         setElectricStart(current?.electric_start ?? prevElectric);
         setWaterStart(current?.water_start ?? prevWater);
         setElectricEnd(current?.electric_end ?? prevElectric);
         setWaterEnd(current?.water_end ?? prevWater);
         setPeopleCount(count);
      });

      return () => {
         alive = false;
      };
   }, [period, selectedRoomId, refreshTrigger]);

   useEffect(() => {
      if (!selectedRoomId) {
         setPreview(null);
         return;
      }

      const timeout = window.setTimeout(() => {
         window.api.billing
            .previewInvoice({
               room_id: selectedRoomId,
               period,
               electric_start: electricStart,
               electric_end: electricEnd,
               water_start: waterStart,
               water_end: waterEnd,
            })
            .then((result) => {
               setPreview(result);
               setPreviewError(null);
            })
            .catch((error: unknown) => {
               setPreview(null);
               setPreviewError(error instanceof Error ? error.message : String(error));
            });
      }, 300);

      return () => window.clearTimeout(timeout);
   }, [electricEnd, electricStart, period, selectedRoomId, waterEnd, waterStart]);

   // const selectedRoom = useMemo(
   //    () => state.rooms.find((room) => room.id === selectedRoomId) ?? null,
   //    [selectedRoomId, state.rooms]
   // );

   const createInvoice = async () => {
      if (!selectedRoomId || !preview) return;
      try {
         await window.api.billing.createInvoice({
            room_id: selectedRoomId,
            period,
            electric_start: electricStart,
            electric_end: electricEnd,
            water_start: waterStart,
            water_end: waterEnd,
         });
         setRefreshTrigger((prev) => prev + 1);
      } catch (error) {
         alert(`Tạo hóa đơn thất bại: ${error instanceof Error ? error.message : String(error)}`);
      }
   };

   const deleteInvoice = async (invoice: InvoiceWithDetails) => {
      const ok = window.confirm(
         `Xóa hóa đơn phòng ${invoice.room_name} kỳ ${invoice.period}?\n` +
            `Chỉ số điện nước đã chốt của kỳ này cũng sẽ bị xóa để bạn có thể ghi lại chỉ số mới.`
      );
      if (!ok) return;
      try {
         await window.api.invoices.delete(invoice.id);
         setRefreshTrigger((prev) => prev + 1);
      } catch (error) {
         alert(`Xóa hóa đơn thất bại: ${error instanceof Error ? error.message : String(error)}`);
      }
   };

   const exportInvoicePdf = async (invoice: InvoiceWithDetails) => {
      try {
         const result = await window.api.export.invoicePdf(invoice.id);
         if (result?.success && result.filePath) {
            alert(`Đã xuất PDF: ${result.filePath}`);
         }
      } catch (error) {
         alert(`Lỗi xuất PDF: ${error instanceof Error ? error.message : String(error)}`);
      }
   };

   const exportInvoiceExcel = async (invoice: InvoiceWithDetails) => {
      try {
         const result = await window.api.export.invoiceExcel(invoice.id);
         if (result?.success && result.filePath) {
            alert(`Đã xuất Excel: ${result.filePath}`);
         }
      } catch (error) {
         alert(`Lỗi xuất Excel: ${error instanceof Error ? error.message : String(error)}`);
      }
   };

   if (state.loading) {
      return (
         <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner label="Đang tải hóa đơn" />
         </div>
      );
   }

   if (state.error) {
      return <EmptyState icon={Receipt} title="Không tải được hóa đơn" description={state.error} />;
   }

   return (
      <div className="animate-fade-in space-y-lg">
         <div className="flex flex-wrap items-end justify-between gap-md">
            <div>
               <h2 className="text-headline-md text-on-surface">Thanh toán & Hóa đơn</h2>
               <p className="mt-xs text-body-md text-on-surface-variant">
                  Quản lý chỉ số, phí dịch vụ và thu tiền định kỳ.
               </p>
            </div>
            <div className="flex gap-sm">
               <button
                  type="button"
                  className="focus-ring flex h-10 items-center gap-sm rounded-lg border border-outline-variant px-md text-primary hover:bg-primary-fixed"
               >
                  <Download className="h-5 w-5" />
                  <span>Xuất báo cáo</span>
               </button>
               <button
                  type="button"
                  className="focus-ring flex h-10 items-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
               >
                  <Send className="h-5 w-5" />
                  <span>Gửi thông báo hàng loạt</span>
               </button>
            </div>
         </div>

         <section className="grid gap-md xl:grid-cols-12">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm xl:col-span-8">
               <div className="mb-md flex flex-wrap items-center justify-between gap-md">
                  <div className="flex items-center gap-sm">
                     <Calculator className="h-6 w-6 text-primary" />
                     <div>
                        <h3 className="text-headline-sm text-on-surface">Ghi chỉ số & Tính phí</h3>
                        <p className="text-body-md text-on-surface-variant">{formatPeriod(period)}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-sm">
                     <label className="flex items-center gap-sm">
                        <span className="text-label-sm text-on-surface-variant">Kỳ:</span>
                        <select
                           value={period}
                           onChange={(event) => setPeriod(event.target.value)}
                           className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-md text-body-md outline-none focus:border-primary"
                        >
                           {periodOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                 {option.label}
                                 {option.value === currentPeriodValue ? ' (hiện tại)' : ''}
                              </option>
                           ))}
                        </select>
                     </label>
                     {period !== currentPeriodValue && (
                        <button
                           type="button"
                           onClick={() => setPeriod(currentPeriodValue)}
                           className="focus-ring h-10 rounded-lg border border-outline-variant px-sm text-label-sm text-primary hover:bg-primary-fixed"
                           title="Quay lại kỳ hiện tại"
                        >
                           ↻ Kỳ hiện tại
                        </button>
                     )}
                  </div>
               </div>

               {(isPastPeriod || isFuturePeriod) && (
                  <div
                     className={[
                        'mb-md flex items-start gap-sm rounded-lg border px-md py-sm text-body-md',
                        isPastPeriod
                           ? 'border-tertiary bg-tertiary-container/40 text-on-tertiary-container'
                           : 'border-primary bg-primary-fixed text-primary',
                     ].join(' ')}
                  >
                     <span className="font-semibold">⚠</span>
                     <p>
                        {isPastPeriod
                           ? 'Bạn đang ghi chỉ số kỳ quá khứ. Dùng để backfill hóa đơn đã quên — số tiền tính theo đơn giá phòng hiện tại.'
                           : 'Bạn đang tạo HĐ kỳ tương lai. Đảm bảo đúng phòng và kỳ trước khi chốt.'}
                     </p>
                  </div>
               )}

               {state.rooms.length === 0 ? (
                  <EmptyState icon={Receipt} title="Chưa có phòng đang thuê" />
               ) : (
                  <div className="grid gap-md lg:grid-cols-2">
                     <div className="space-y-md">
                        <label className="block">
                           <span className="text-label-sm text-on-surface-variant">Chọn phòng</span>
                           <select
                              value={selectedRoomId ?? ''}
                              onChange={(event) => setSelectedRoomId(Number(event.target.value))}
                              className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                           >
                              {state.rooms.map((room) => (
                                 <option key={room.id} value={room.id}>
                                    {room.name} - {room.area_name}
                                 </option>
                              ))}
                           </select>
                        </label>
                        <MeterInput
                           label="Điện"
                           unit="kWh"
                           start={electricStart}
                           end={electricEnd}
                           onEndChange={setElectricEnd}
                        />
                        <MeterInput
                           label="Nước"
                           unit="m³"
                           start={waterStart}
                           end={waterEnd}
                           onEndChange={setWaterEnd}
                        />
                     </div>

                     <div className="space-y-md">
                        <BillingPreview preview={preview} peopleCount={peopleCount} />
                        {previewError && (
                           <p className="rounded-lg bg-error-container p-sm text-body-md text-on-error-container">
                              {previewError}
                           </p>
                        )}
                        <button
                           type="button"
                           onClick={createInvoice}
                           disabled={!preview || electricEnd < electricStart || waterEnd < waterStart}
                           className="focus-ring flex h-12 w-full items-center justify-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary shadow-sm transition hover:scale-[1.02] hover:bg-primary-container"
                        >
                           <Calculator className="h-5 w-5" />
                           <span>Chốt chỉ số & Tạo hóa đơn</span>
                        </button>
                     </div>
                  </div>
               )}
            </div>

            <aside className="space-y-md xl:col-span-4">
               <section className="overflow-hidden rounded-lg bg-primary-container p-lg text-on-primary-container shadow-sm">
                  <Wallet className="mb-md h-8 w-8 opacity-80" />
                  <p className="text-body-md opacity-90">Tổng công nợ chưa thu</p>
                  <p className="mt-xs text-3xl font-bold">{formatVND(state.totalDebt)}</p>
                  <p className="mt-xs text-body-md opacity-90">{state.topDebtors.length} phòng quá hạn thanh toán</p>
               </section>
               <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
                  <h3 className="text-headline-sm text-on-surface">Danh sách nợ cao nhất</h3>
                  <div className="mt-md space-y-sm">
                     {state.topDebtors.length === 0 ? (
                        <p className="text-body-md text-on-surface-variant">Chưa có công nợ.</p>
                     ) : (
                        state.topDebtors.map((debtor) => (
                           <div key={debtor.invoice_id} className="flex items-center justify-between gap-md">
                              <div>
                                 <p className="font-semibold text-on-surface">{debtor.room_name}</p>
                                 <p className="text-body-md text-error">Quá hạn {debtor.days_overdue} ngày</p>
                              </div>
                              <p className="font-semibold text-on-surface">{formatVND(debtor.debt_amount)}</p>
                           </div>
                        ))
                     )}
                  </div>
               </section>
            </aside>
         </section>

         <InvoiceTable
            invoices={state.invoices}
            filter={filter}
            onFilterChange={setFilter}
            onDetail={setDetailInvoice}
            onNotify={setNotifyInvoice}
            onExportPdf={exportInvoicePdf}
            onExportExcel={exportInvoiceExcel}
            onDelete={deleteInvoice}
         />

         <InvoiceDetailModal
            open={!!detailInvoice}
            invoice={detailInvoice}
            onClose={() => setDetailInvoice(null)}
         />
         <SendNotifyModal
            open={!!notifyInvoice}
            invoice={notifyInvoice}
            onClose={() => setNotifyInvoice(null)}
         />
      </div>
   );
}
