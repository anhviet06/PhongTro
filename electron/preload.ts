/**
 * Preload script — expose window.api type-safe-ish qua contextBridge.
 *
 * QUAN TRỌNG về output build:
 *  1. Dùng `require('electron')` (KHÔNG dùng ES import) để Rollup giữ nguyên
 *     dạng require() trong .cjs — tránh ESM `import` statement không hợp lệ.
 *  2. Phải có ít nhất 1 named `export` ở file (xem cuối file) — buộc Rollup
 *     emit dạng CJS named exports thay vì wrap toàn bộ thành IIFE
 *     `require_preload()` rồi `export default ...` (ESM, không hợp lệ trong .cjs).
 *
 * Cả 2 đều bắt buộc — bỏ 1 trong 2 sẽ crash Electron với SyntaxError ở preload.
 */

const electron = require('electron') as typeof import('electron');
const { ipcRenderer, contextBridge } = electron;

function invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
   return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

contextBridge.exposeInMainWorld('ipcRenderer', {
   on(...args: Parameters<typeof ipcRenderer.on>) {
      const [channel, listener] = args;
      return ipcRenderer.on(channel, (event, ...listenerArgs) => listener(event, ...listenerArgs));
   },
   off(...args: Parameters<typeof ipcRenderer.off>) {
      const [channel, ...omit] = args;
      return ipcRenderer.off(channel, ...omit);
   },
   send(...args: Parameters<typeof ipcRenderer.send>) {
      const [channel, ...omit] = args;
      return ipcRenderer.send(channel, ...omit);
   },
   invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
      const [channel, ...omit] = args;
      return ipcRenderer.invoke(channel, ...omit);
   },
});

contextBridge.exposeInMainWorld('api', {
   areas: {
      list: () => invoke('areas:list'),
      get: (id: number) => invoke('areas:get', id),
      create: (data: unknown) => invoke('areas:create', data),
      update: (id: number, patch: unknown) => invoke('areas:update', id, patch),
      delete: (id: number) => invoke('areas:delete', id),
   },

   rooms: {
      listByArea: (areaId: number) => invoke('rooms:list-by-area', areaId),
      listAll: () => invoke('rooms:list-all'),
      listByStatus: (status: string, limit?: number) => invoke('rooms:list-by-status', status, limit),
      get: (id: number) => invoke('rooms:get', id),
      create: (data: unknown) => invoke('rooms:create', data),
      update: (id: number, patch: unknown) => invoke('rooms:update', id, patch),
      delete: (id: number) => invoke('rooms:delete', id),
      updateStatus: (id: number, status: string) => invoke('rooms:update-status', id, status),
      countByStatus: () => invoke('rooms:count-by-status'),
   },

   services: {
      listActive: () => invoke('services:list-active'),
      listAll: () => invoke('services:list-all'),
      get: (id: number) => invoke('services:get', id),
      create: (data: unknown) => invoke('services:create', data),
      update: (id: number, patch: unknown) => invoke('services:update', id, patch),
      setActive: (id: number, active: boolean) => invoke('services:set-active', id, active),
      delete: (id: number) => invoke('services:delete', id),
   },

   tenants: {
      listAll: () => invoke('tenants:list-all'),
      listByRoom: (roomId: number) => invoke('tenants:list-by-room', roomId),
      get: (id: number) => invoke('tenants:get', id),
      create: (data: unknown) => invoke('tenants:create', data),
      update: (id: number, patch: unknown) => invoke('tenants:update', id, patch),
      delete: (id: number) => invoke('tenants:delete', id),
      setPrimary: (roomId: number, tenantId: number) =>
         invoke('tenants:set-primary', roomId, tenantId),
      countActiveInRoom: (roomId: number) => invoke('tenants:count-active-in-room', roomId),
   },

   vehicles: {
      listByTenant: (tenantId: number) => invoke('vehicles:list-by-tenant', tenantId),
      listByRoom: (roomId: number) => invoke('vehicles:list-by-room', roomId),
      get: (id: number) => invoke('vehicles:get', id),
      create: (data: unknown) => invoke('vehicles:create', data),
      delete: (id: number) => invoke('vehicles:delete', id),
   },

   contracts: {
      list: () => invoke('contracts:list'),
      listByRoom: (roomId: number) => invoke('contracts:list-by-room', roomId),
      get: (id: number) => invoke('contracts:get', id),
      create: (data: unknown) => invoke('contracts:create', data),
      update: (id: number, patch: unknown) => invoke('contracts:update', id, patch),
      terminate: (id: number) => invoke('contracts:terminate', id),
      delete: (id: number) => invoke('contracts:delete', id),
      expiringSoon: (days: number) => invoke('contracts:expiring-soon', days),
   },

   meters: {
      setBaseline: (roomId: number, electric: number, water: number) =>
         invoke('meters:set-baseline', roomId, electric, water),
      getBaseline: (roomId: number) => invoke('meters:get-baseline', roomId),
      listByRoom: (roomId: number) => invoke('meters:list-by-room', roomId),
      getByRoomPeriod: (roomId: number, period: string) =>
         invoke('meters:get-by-room-period', roomId, period),
      getPrevious: (roomId: number, period: string) =>
         invoke('meters:get-previous', roomId, period),
      getLatestBefore: (roomId: number, period: string) =>
         invoke('meters:get-latest-before', roomId, period),
      create: (data: unknown) => invoke('meters:create', data),
      update: (id: number, patch: unknown) => invoke('meters:update', id, patch),
   },

   invoices: {
      listByPeriod: (period: string) => invoke('invoices:list-by-period', period),
      listByRoom: (roomId: number) => invoke('invoices:list-by-room', roomId),
      listUnpaid: () => invoke('invoices:list-unpaid'),
      get: (id: number) => invoke('invoices:get', id),
      create: (invoice: unknown, services?: unknown[]) =>
         invoke('invoices:create', invoice, services),
      update: (id: number, patch: unknown) => invoke('invoices:update', id, patch),
      recalcStatus: (id: number) => invoke('invoices:recalc-status', id),
   },

   payments: {
      listByInvoice: (invoiceId: number) => invoke('payments:list-by-invoice', invoiceId),
      get: (id: number) => invoke('payments:get', id),
      create: (data: unknown) => invoke('payments:create', data),
   },

   settings: {
      get: (key: string) => invoke('settings:get', key),
      getMany: (keys: string[]) => invoke('settings:get-many', keys),
      set: (key: string, value: string) => invoke('settings:set', key, value),
      setMany: (values: Record<string, string>) => invoke('settings:set-many', values),
      getAll: () => invoke('settings:get-all'),
   },

   stats: {
      monthlyRevenue: (period?: string) => invoke('stats:monthly-revenue', period),
      vacantCount: () => invoke('stats:vacant-count'),
      totalDebt: () => invoke('stats:total-debt'),
      revenueByArea: (monthsBack?: number) => invoke('stats:revenue-by-area', monthsBack),
      revenueByMonth: (year?: number) => invoke('stats:revenue-by-month', year),
      topDebtors: (limit?: number) => invoke('stats:top-debtors', limit),
      dashboardSummary: () => invoke('stats:dashboard-summary'),
   },

   billing: {
      createInvoice: (data: unknown) => invoke('billing:create-invoice', data),
      previewInvoice: (data: unknown) => invoke('billing:preview-invoice', data),
      updateInvoice: (id: number, patch: unknown) => invoke('billing:update-invoice', id, patch),
   },

   contractGen: {
      exportWord: (contractId: number, savePath?: string) =>
         invoke('contract-gen:export-word', contractId, savePath),
      exportPdf: (contractId: number, savePath?: string) =>
         invoke('contract-gen:export-pdf', contractId, savePath),
   },

   export: {
      invoiceExcel: (invoiceId: number, savePath?: string) =>
         invoke('export:invoice-excel', invoiceId, savePath),
      invoicePdf: (invoiceId: number, savePath?: string) =>
         invoke('export:invoice-pdf', invoiceId, savePath),
      invoicesByPeriodExcel: (period: string, savePath?: string) =>
         invoke('export:invoices-by-period-excel', period, savePath),
      revenueExcel: (filter?: unknown, savePath?: string) =>
         invoke('export:revenue-excel', filter, savePath),
      tenantsExcel: (savePath?: string) => invoke('export:tenants-excel', savePath),
   },

   backup: {
      backup: (savePath?: string) => invoke('backup:backup', savePath),
      restore: (openPath?: string) => invoke('backup:restore', openPath),
      resetBusinessData: (password: string) =>
         invoke('backup:reset-business-data', password),
   },

   lifecycle: {
      process: () => invoke('lifecycle:process'),
      promotePrimary: (tenantId: number) => invoke('lifecycle:promote-primary', tenantId),
      createTenantsWithContract: (data: unknown) =>
         invoke('lifecycle:create-tenants-with-contract', data),
   },

   update: {
      check: () => invoke('update:check'),
      install: () => invoke('update:install'),
      onProgress: (callback: (eventName: string, data?: unknown) => void) => {
         const channels = [
            'update:checking',
            'update:available',
            'update:not-available',
            'update:error',
            'update:download-progress',
            'update:downloaded',
         ];
         const listeners = channels.map((channel) => {
            const listener = (_event: Electron.IpcRendererEvent, data?: unknown) =>
               callback(channel, data);
            ipcRenderer.on(channel, listener);
            return { channel, listener };
         });

         return () => {
            for (const { channel, listener } of listeners) {
               ipcRenderer.off(channel, listener);
            }
         };
      },
   },

   system: {
      getDbPath: () => invoke('system:get-db-path'),
      getVersion: () => invoke('system:get-version'),
   },
});

// Export trivial để buộc Rollup output dạng CJS named exports thay vì wrap IIFE.
export const _preloadInitialized = true;
