/// <reference types="vite/client" />

import type {
   Area,
   BillingResult,
   ContractWithDetails,
   DashboardSummary,
   InvoiceService,
   InvoiceWithDetails,
   MeterReading,
   Payment,
   RevenueByAreaRow,
   RevenueByMonthRow,
   Room,
   RoomStatus,
   RoomStatusCount,
   RoomWithArea,
   Service,
   Setting,
   Settings,
   Tenant,
   TenantWithRoom,
   TopDebtorRow,
   Vehicle,
   VehicleWithTenant,
} from './shared/types';
import type { AreaInput, AreaPatch } from '../electron/database/repositories/areas.repo';
import type { RoomInput, RoomPatch } from '../electron/database/repositories/rooms.repo';
import type { ServiceInput, ServicePatch } from '../electron/database/repositories/services.repo';
import type { TenantInput, TenantPatch } from '../electron/database/repositories/tenants.repo';
import type { VehicleInput } from '../electron/database/repositories/vehicles.repo';
import type {
   ContractInput,
   ContractPatch,
} from '../electron/database/repositories/contracts.repo';
import type {
   MeterReadingInput,
   MeterReadingPatch,
} from '../electron/database/repositories/meters.repo';
import type {
   InvoiceInput,
   InvoicePatch,
   InvoiceServiceInput,
} from '../electron/database/repositories/invoices.repo';
import type { PaymentInput } from '../electron/database/repositories/payments.repo';
import type {
   CreateInvoiceInput,
   UpdateInvoiceInput,
} from '../electron/services/billing';
import type { RevenueReportFilter } from '../electron/services/excel-export';

interface ImportMetaEnv {
   readonly PACKAGE_VERSION: string;
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}

interface ExportResult {
   canceled?: boolean;
   success?: boolean;
   filePath?: string;
}

interface UpdateProgress {
   percent: number;
   bytesPerSecond: number;
   transferred: number;
   total: number;
}

interface PhongTroApi {
   areas: {
      list(): Promise<Area[]>;
      get(id: number): Promise<Area | null>;
      create(data: AreaInput): Promise<Area>;
      update(id: number, patch: AreaPatch): Promise<Area | null>;
      delete(id: number): Promise<boolean>;
   };

   rooms: {
      listByArea(areaId: number): Promise<RoomWithArea[]>;
      listAll(): Promise<RoomWithArea[]>;
      listByStatus(status: RoomStatus, limit?: number): Promise<RoomWithArea[]>;
      get(id: number): Promise<RoomWithArea | null>;
      create(data: RoomInput): Promise<RoomWithArea>;
      update(id: number, patch: RoomPatch): Promise<RoomWithArea | null>;
      delete(id: number): Promise<boolean>;
      updateStatus(id: number, status: RoomStatus): Promise<Room | null>;
      countByStatus(): Promise<RoomStatusCount>;
   };

   services: {
      listActive(): Promise<Service[]>;
      listAll(): Promise<Service[]>;
      get(id: number): Promise<Service | null>;
      create(data: ServiceInput): Promise<Service>;
      update(id: number, patch: ServicePatch): Promise<Service | null>;
      setActive(id: number, active: boolean): Promise<Service | null>;
      delete(id: number): Promise<boolean>;
   };

   tenants: {
      listAll(): Promise<TenantWithRoom[]>;
      listByRoom(roomId: number): Promise<Tenant[]>;
      get(id: number): Promise<Tenant | null>;
      create(data: TenantInput): Promise<Tenant>;
      update(id: number, patch: TenantPatch): Promise<Tenant | null>;
      delete(id: number): Promise<boolean>;
      setPrimary(roomId: number, tenantId: number): Promise<Tenant | null>;
      countActiveInRoom(roomId: number): Promise<number>;
   };

   vehicles: {
      listByTenant(tenantId: number): Promise<Vehicle[]>;
      listByRoom(roomId: number): Promise<VehicleWithTenant[]>;
      get(id: number): Promise<Vehicle | null>;
      create(data: VehicleInput): Promise<Vehicle>;
      delete(id: number): Promise<boolean>;
   };

   contracts: {
      list(): Promise<ContractWithDetails[]>;
      listByRoom(roomId: number): Promise<ContractWithDetails[]>;
      get(id: number): Promise<ContractWithDetails | null>;
      create(data: ContractInput): Promise<ContractWithDetails>;
      update(id: number, patch: ContractPatch): Promise<ContractWithDetails | null>;
      terminate(id: number): Promise<ContractWithDetails | null>;
      delete(id: number): Promise<boolean>;
      expiringSoon(days: number): Promise<ContractWithDetails[]>;
   };

   meters: {
      setBaseline(roomId: number, electric: number, water: number): Promise<MeterReading>;
      getBaseline(roomId: number): Promise<MeterReading | null>;
      listByRoom(roomId: number): Promise<MeterReading[]>;
      getByRoomPeriod(roomId: number, period: string): Promise<MeterReading | null>;
      getPrevious(roomId: number, period: string): Promise<MeterReading | null>;
      getLatestBefore(roomId: number, period: string): Promise<MeterReading | null>;
      create(data: MeterReadingInput): Promise<MeterReading>;
      update(id: number, patch: MeterReadingPatch): Promise<MeterReading | null>;
   };

   invoices: {
      listByPeriod(period: string): Promise<InvoiceWithDetails[]>;
      listByRoom(roomId: number): Promise<InvoiceWithDetails[]>;
      listUnpaid(): Promise<InvoiceWithDetails[]>;
      get(id: number): Promise<InvoiceWithDetails | null>;
      create(
         invoice: InvoiceInput,
         services?: InvoiceServiceInput[]
      ): Promise<InvoiceWithDetails>;
      update(id: number, patch: InvoicePatch): Promise<InvoiceWithDetails | null>;
      recalcStatus(id: number): Promise<InvoiceWithDetails | null>;
   };

   payments: {
      listByInvoice(invoiceId: number): Promise<Payment[]>;
      get(id: number): Promise<Payment | null>;
      create(data: PaymentInput): Promise<Payment>;
   };

   settings: {
      get(key: string): Promise<string | null>;
      getMany(keys: string[]): Promise<Settings>;
      set(key: string, value: string): Promise<Setting>;
      setMany(values: Settings): Promise<Setting[]>;
      getAll(): Promise<Setting[]>;
   };

   stats: {
      monthlyRevenue(period?: string): Promise<number>;
      vacantCount(): Promise<number>;
      totalDebt(): Promise<number>;
      revenueByArea(monthsBack?: number): Promise<RevenueByAreaRow[]>;
      revenueByMonth(year?: number): Promise<RevenueByMonthRow[]>;
      topDebtors(limit?: number): Promise<TopDebtorRow[]>;
      dashboardSummary(): Promise<DashboardSummary>;
   };

   billing: {
      createInvoice(data: CreateInvoiceInput): Promise<BillingResult>;
      previewInvoice(data: CreateInvoiceInput): Promise<BillingResult>;
      updateInvoice(id: number, patch: UpdateInvoiceInput): Promise<InvoiceWithDetails | null>;
   };

   contractGen: {
      exportWord(contractId: number, savePath?: string): Promise<ExportResult>;
      exportPdf(contractId: number, savePath?: string): Promise<ExportResult>;
   };

   export: {
      invoiceExcel(invoiceId: number, savePath?: string): Promise<ExportResult>;
      invoicePdf(invoiceId: number, savePath?: string): Promise<ExportResult>;
      invoicesByPeriodExcel(period: string, savePath?: string): Promise<ExportResult>;
      revenueExcel(filter?: RevenueReportFilter, savePath?: string): Promise<ExportResult>;
      tenantsExcel(savePath?: string): Promise<ExportResult>;
   };

   backup: {
      backup(savePath?: string): Promise<ExportResult>;
      restore(openPath?: string): Promise<ExportResult>;
      resetBusinessData(password: string): Promise<{ success: boolean; tablesCleared: string[] }>;
   };

   lifecycle: {
      process(): Promise<{
         renewed: ContractWithDetails[];
         terminated: ContractWithDetails[];
         expired: ContractWithDetails[];
      }>;
      promotePrimary(tenantId: number): Promise<{
         oldContract: ContractWithDetails | null;
         newContract: ContractWithDetails;
         oldPrimary: Tenant | null;
      }>;
      createTenantsWithContract(data: {
         room_id: number;
         tenants: Array<{
            full_name: string;
            dob?: string;
            phone?: string;
            cccd?: string;
            permanent_address?: string;
            move_in_date?: string;
            move_out_date?: string;
            vehicles?: Array<{ plate_number: string; vehicle_type: string }>;
         }>;
         contract: {
            rent_price: number;
            deposit: number;
            start_date: string;
            end_date: string;
            terms?: string;
            landlord_name: string;
            landlord_cccd: string;
            landlord_phone: string;
            landlord_address: string;
         };
      }): Promise<{ tenant_ids: number[]; contract: ContractWithDetails }>;
   };

   update: {
      check(): Promise<unknown>;
      install(): Promise<void>;
      onProgress(
         callback: (
            eventName:
               | 'update:checking'
               | 'update:available'
               | 'update:not-available'
               | 'update:error'
               | 'update:download-progress'
               | 'update:downloaded',
            data?: unknown | UpdateProgress
         ) => void
      ): () => void;
   };

   system: {
      getDbPath(): Promise<string>;
      getVersion(): Promise<string>;
   };

   getDbPath(): Promise<string>;
   getVersion(): Promise<string>;
}

declare global {
   interface Window {
      ipcRenderer: Pick<import('electron').IpcRenderer, 'on' | 'off' | 'send' | 'invoke'>;
      api: PhongTroApi;
   }
}
