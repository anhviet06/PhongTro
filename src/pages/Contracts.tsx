/**
 * Trang Hợp đồng: danh sách, tạo mới và xuất file PDF/Word.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Plus, ScrollText, X } from 'lucide-react';
import type { ContractWithDetails, RoomWithArea, Settings, TenantWithRoom } from '../shared/types';
import StatCard from '../components/StatCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import ContractList from '../components/contracts/ContractList';
import ContractDetailModal from '../components/contracts/ContractDetailModal';
import CreateContractModal from '../components/contracts/CreateContractModal';
import ExportFormatPicker from '../components/contracts/ExportFormatPicker';

interface ContractsState {
   contracts: ContractWithDetails[];
   rooms: RoomWithArea[];
   tenants: TenantWithRoom[];
   settings: Settings;
   loading: boolean;
   error: string | null;
}

export default function Contracts() {
   const [state, setState] = useState<ContractsState>({
      contracts: [],
      rooms: [],
      tenants: [],
      settings: {},
      loading: true,
      error: null,
   });
   const [createOpen, setCreateOpen] = useState(false);
   const [exportContract, setExportContract] = useState<ContractWithDetails | null>(null);
   const [viewContract, setViewContract] = useState<ContractWithDetails | null>(null);
   const [searchParams, setSearchParams] = useSearchParams();
   const roomIdFilter = searchParams.get('roomId');

   // Filter list theo roomId từ query (vd: navigate từ RoomSlideOver)
   const filteredContracts = useMemo(() => {
      if (!roomIdFilter) return state.contracts;
      const targetRoomId = Number(roomIdFilter);
      return state.contracts.filter((contract) => contract.room_id === targetRoomId);
   }, [state.contracts, roomIdFilter]);

   const filterRoomName =
      roomIdFilter && state.contracts.find((c) => c.room_id === Number(roomIdFilter))?.room_name;

   const clearFilter = () => {
      setSearchParams({});
   };

   const loadData = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
         const [contracts, rooms, tenants, settings] = await Promise.all([
            window.api.contracts.list(),
            window.api.rooms.listAll(),
            window.api.tenants.listAll(),
            window.api.settings.getMany([
               'landlord_name',
               'landlord_cccd',
               'landlord_phone',
               'landlord_address',
            ]),
         ]);
         setState({ contracts, rooms, tenants, settings, loading: false, error: null });
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

   const terminateContract = async (contract: ContractWithDetails) => {
      await window.api.contracts.terminate(contract.id);
      await loadData();
   };

   const exportPdf = async () => {
      if (!exportContract) return;
      try {
         const result = await window.api.contractGen.exportPdf(exportContract.id);
         setExportContract(null);
         if (result?.success && result.filePath) {
            alert(`Đã xuất PDF: ${result.filePath}`);
         }
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         alert(`Lỗi xuất PDF:\n${message}`);
         console.error('exportPdf failed:', error);
      }
   };

   const exportWord = async () => {
      if (!exportContract) return;
      try {
         const result = await window.api.contractGen.exportWord(exportContract.id);
         setExportContract(null);
         if (result?.success && result.filePath) {
            alert(`Đã xuất Word: ${result.filePath}`);
         }
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         alert(`Lỗi xuất Word:\n${message}`);
         console.error('exportWord failed:', error);
      }
   };

   if (state.loading) {
      return (
         <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner label="Đang tải hợp đồng" />
         </div>
      );
   }

   if (state.error) {
      return <EmptyState icon={FileText} title="Không tải được hợp đồng" description={state.error} />;
   }

   const activeCount = state.contracts.filter((contract) => contract.status === 'active').length;
   const expiringCount = state.contracts.filter(
      (contract) =>
         contract.status === 'active' &&
         contract.end_date &&
         new Date(contract.end_date).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000
   ).length;

   return (
      <div className="animate-fade-in space-y-lg">
         <div className="flex flex-wrap items-end justify-between gap-md">
            <div>
               <h2 className="text-headline-md text-on-surface">Hợp đồng</h2>
               <p className="mt-xs text-body-md text-on-surface-variant">
                  Tạo, theo dõi và xuất hợp đồng thuê phòng.
               </p>
            </div>
            <button
               type="button"
               onClick={() => setCreateOpen(true)}
               className="focus-ring flex h-10 items-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
            >
               <Plus className="h-5 w-5" />
               <span>Tạo hợp đồng mới</span>
            </button>
         </div>

         <section className="grid gap-md md:grid-cols-3">
            <StatCard
               icon={ScrollText}
               label="Tổng hợp đồng"
               value={String(state.contracts.length)}
               tone="primary"
            />
            <StatCard
               icon={FileText}
               label="Đang hiệu lực"
               value={String(activeCount)}
               tone="secondary"
            />
            <StatCard
               icon={FileText}
               label="Sắp hết hạn"
               value={String(expiringCount)}
               sub="Trong 30 ngày"
               tone="tertiary"
            />
         </section>

         {roomIdFilter && (
            <div className="flex items-center justify-between gap-md rounded-lg border border-primary bg-primary-fixed px-md py-sm">
               <p className="text-body-md text-primary">
                  Đang lọc theo phòng:{' '}
                  <strong>{filterRoomName ?? `Phòng #${roomIdFilter}`}</strong>
                  {' · '}
                  {filteredContracts.length} hợp đồng
               </p>
               <button
                  type="button"
                  onClick={clearFilter}
                  className="focus-ring flex items-center gap-xs rounded-lg px-sm py-xs text-label-sm font-medium text-primary hover:bg-primary/10"
               >
                  <X className="h-4 w-4" />
                  Bỏ lọc
               </button>
            </div>
         )}

         {filteredContracts.length === 0 ? (
            <EmptyState
               icon={FileText}
               title={roomIdFilter ? 'Phòng này chưa có hợp đồng' : 'Chưa có hợp đồng'}
            />
         ) : (
            <ContractList
               contracts={filteredContracts}
               onExport={setExportContract}
               onView={setViewContract}
               onTerminate={terminateContract}
            />
         )}

         <CreateContractModal
            open={createOpen}
            rooms={state.rooms}
            tenants={state.tenants}
            settings={state.settings}
            onClose={() => setCreateOpen(false)}
            onCreated={loadData}
         />

         <ContractDetailModal
            open={!!viewContract}
            contract={viewContract}
            onClose={() => setViewContract(null)}
            onExport={() => {
               if (viewContract) {
                  setExportContract(viewContract);
                  setViewContract(null);
               }
            }}
         />

         <ExportFormatPicker
            open={!!exportContract}
            onClose={() => setExportContract(null)}
            onPdf={exportPdf}
            onWord={exportWord}
         />
      </div>
   );
}
