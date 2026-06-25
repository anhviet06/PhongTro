/**
 * PhongTroApp — Electron main process entry.
 *
 * Khởi tạo app/DB, đăng ký IPC bridge và forward auto-update events cho renderer.
 */

import path from 'node:path';
import type { BrowserWindow as BrowserWindowInstance, IpcMainInvokeEvent } from 'electron';
import { autoUpdater } from 'electron-updater';
import { initDb, getDbPath, closeDb } from './database/index';
import * as areasRepo from './database/repositories/areas.repo';
import * as roomsRepo from './database/repositories/rooms.repo';
import * as servicesRepo from './database/repositories/services.repo';
import * as tenantsRepo from './database/repositories/tenants.repo';
import * as vehiclesRepo from './database/repositories/vehicles.repo';
import * as contractsRepo from './database/repositories/contracts.repo';
import * as metersRepo from './database/repositories/meters.repo';
import * as invoicesRepo from './database/repositories/invoices.repo';
import * as paymentsRepo from './database/repositories/payments.repo';
import * as settingsRepo from './database/repositories/settings.repo';
import * as statsRepo from './database/repositories/stats.repo';
import * as priceTemplatesRepo from './database/repositories/price-templates.repo';
import * as billingService from './services/billing';
import * as contractGenService from './services/contract-gen';
import * as excelExportService from './services/excel-export';
import * as invoicePdfService from './services/invoice-pdf';
import * as backupService from './services/backup';
import * as contractLifecycle from './services/contract-lifecycle';
import * as tenantsLifecycle from './services/tenants-lifecycle';
import { cleanupOldLogs, logError, logInfo } from './services/log';

const electron = require('electron') as typeof import('electron');
const { app, BrowserWindow, Menu, ipcMain } = electron;

// Output là CJS (`main.cjs`) nên dùng __dirname trực tiếp. KHÔNG dùng `import.meta.url` ở đây
// — Rollup không convert được sang CJS và sẽ giữ nguyên `import` statement, làm Node crash khi load.
declare const __dirname: string;
const currentDir = __dirname;
const appRoot = path.dirname(currentDir);

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(appRoot, 'dist-electron');
export const RENDERER_DIST = path.join(appRoot, 'dist');

const publicPath = VITE_DEV_SERVER_URL ? path.join(appRoot, 'public') : RENDERER_DIST;

let win: BrowserWindowInstance | null = null;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdateMessage(channel: string, data?: unknown): void {
   if (win && !win.isDestroyed()) {
      win.webContents.send(channel, data);
   }
}

autoUpdater.on('checking-for-update', () => sendUpdateMessage('update:checking'));
autoUpdater.on('update-available', (info) => sendUpdateMessage('update:available', info));
autoUpdater.on('update-not-available', (info) => sendUpdateMessage('update:not-available', info));
autoUpdater.on('error', (error) => sendUpdateMessage('update:error', error?.message ?? 'Unknown error'));
autoUpdater.on('download-progress', (progress) =>
   sendUpdateMessage('update:download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
   })
);
autoUpdater.on('update-downloaded', (info) => sendUpdateMessage('update:downloaded', info));

if (!app.requestSingleInstanceLock()) {
   app.quit();
   process.exit(0);
}

app.on('second-instance', () => {
   if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
   }
});

function createWindow(): void {
   win = new BrowserWindow({
      icon: path.join(publicPath, 'phong.png'),
      width: 1400,
      height: 900,
      webPreferences: {
         preload: path.join(currentDir, 'preload.cjs'),
         sandbox: false,
         contextIsolation: true,
         spellcheck: false,
      },
   });

   win.maximize();

   // Mở DevTools chỉ khi:
   //  - Dev mode (có VITE_DEV_SERVER_URL), HOẶC
   //  - Env flag PHONGTRO_DEBUG=1 (cho phép debug build packaged khi cần)
   if (VITE_DEV_SERVER_URL || process.env.PHONGTRO_DEBUG === '1') {
      win.webContents.openDevTools({ mode: 'detach' });
   }

   win.webContents.on('did-finish-load', () => {
      win?.webContents.send('main-process-message', new Date().toLocaleString());
   });

   // Log mọi crash của renderer ra main process console + dialog
   win.webContents.on('render-process-gone', (_event, details) => {
      console.error('[Renderer] gone:', details);
   });
   win.webContents.on('preload-error', (_event, preloadPath, error) => {
      console.error('[Preload] error in', preloadPath, error);
   });

   if (VITE_DEV_SERVER_URL) {
      win.loadURL(VITE_DEV_SERVER_URL);
   } else {
      win.loadFile(path.join(RENDERER_DIST, 'index.html'));
   }
}

function handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => unknown): void {
   ipcMain.handle(channel, async (event, ...args) => listener(event, ...args));
}

function registerIpcHandlers(): void {
   // Areas
   handle('areas:list', () => areasRepo.listAll());
   handle('areas:get', (_, id) => areasRepo.getById(id));
   handle('areas:create', (_, data) => areasRepo.create(data));
   handle('areas:update', (_, id, patch) => areasRepo.update(id, patch));
   handle('areas:delete', (_, id) => areasRepo.delete(id));

   // Rooms
   handle('rooms:list-by-area', (_, areaId) => roomsRepo.listByArea(areaId));
   handle('rooms:list-all', () => roomsRepo.listAll());
   handle('rooms:list-by-status', (_, status, limit) => roomsRepo.listByStatus(status, limit));
   handle('rooms:get', (_, id) => roomsRepo.getById(id));
   handle('rooms:create', (_, data) => roomsRepo.create(data));
   handle('rooms:update', (_, id, patch) => roomsRepo.update(id, patch));
   handle('rooms:delete', (_, id) => roomsRepo.delete(id));
   handle('rooms:update-status', (_, id, status) => roomsRepo.updateStatus(id, status));
   handle('rooms:count-by-status', () => roomsRepo.countByStatus());

   // Price Templates
   handle('price-templates:list', () => priceTemplatesRepo.listAll());
   handle('price-templates:get', (_, id) => priceTemplatesRepo.getById(id));
   handle('price-templates:create', (_, data) => priceTemplatesRepo.create(data));
   handle('price-templates:update', (_, id, patch) => priceTemplatesRepo.update(id, patch));
   handle('price-templates:delete', (_, id) => priceTemplatesRepo.deleteById(id));

   // Services
   handle('services:list-active', () => servicesRepo.listActive());
   handle('services:list-all', () => servicesRepo.listAll());
   handle('services:get', (_, id) => servicesRepo.getById(id));
   handle('services:create', (_, data) => servicesRepo.create(data));
   handle('services:update', (_, id, patch) => servicesRepo.update(id, patch));
   handle('services:set-active', (_, id, active) => servicesRepo.setActive(id, active));
   handle('services:delete', (_, id) => servicesRepo.delete(id));

   // Tenants
   handle('tenants:list-all', () => tenantsRepo.listAll());
   handle('tenants:list-by-room', (_, roomId) => tenantsRepo.listByRoom(roomId));
   handle('tenants:get', (_, id) => tenantsRepo.getById(id));
   handle('tenants:create', (_, data) => tenantsRepo.create(data));
   handle('tenants:update', (_, id, patch) => tenantsRepo.update(id, patch));
   handle('tenants:delete', (_, id) => tenantsRepo.delete(id));
   handle('tenants:set-primary', (_, roomId, tenantId) => tenantsRepo.setPrimary(roomId, tenantId));
   handle('tenants:count-active-in-room', (_, roomId) => tenantsRepo.countActiveInRoom(roomId));

   // Vehicles
   handle('vehicles:list-by-tenant', (_, tenantId) => vehiclesRepo.listByTenant(tenantId));
   handle('vehicles:list-by-room', (_, roomId) => vehiclesRepo.listByRoom(roomId));
   handle('vehicles:get', (_, id) => vehiclesRepo.getById(id));
   handle('vehicles:create', (_, data) => vehiclesRepo.create(data));
   handle('vehicles:delete', (_, id) => vehiclesRepo.delete(id));

   // Contracts
   handle('contracts:list', () => contractsRepo.listAll());
   handle('contracts:list-by-room', (_, roomId) => contractsRepo.listByRoom(roomId));
   handle('contracts:get', (_, id) => contractsRepo.getById(id));
   handle('contracts:create', (_, data) => contractsRepo.create(data));
   handle('contracts:update', (_, id, patch) => contractsRepo.update(id, patch));
   handle('contracts:terminate', (_, id) => contractsRepo.terminate(id));
   handle('contracts:delete', (_, id) => contractsRepo.delete(id));
   handle('contracts:expiring-soon', (_, days) => contractsRepo.expiringSoon(days));

   // Meters
   handle('meters:set-baseline', (_, roomId, electric, water) =>
      metersRepo.setBaseline(roomId, electric, water)
   );
   handle('meters:get-baseline', (_, roomId) => metersRepo.getBaseline(roomId));
   handle('meters:list-by-room', (_, roomId) => metersRepo.listByRoom(roomId));
   handle('meters:get-by-room-period', (_, roomId, period) =>
      metersRepo.getByRoomPeriod(roomId, period)
   );
   handle('meters:get-previous', (_, roomId, period) => metersRepo.getPrevious(roomId, period));
   handle('meters:get-latest-before', (_, roomId, period) =>
      metersRepo.getLatestBefore(roomId, period)
   );
   handle('meters:create', (_, data) => metersRepo.create(data));
   handle('meters:update', (_, id, patch) => metersRepo.update(id, patch));

   // Invoices
   handle('invoices:list-by-period', (_, period) => invoicesRepo.listByPeriod(period));
   handle('invoices:list-by-room', (_, roomId) => invoicesRepo.listByRoom(roomId));
   handle('invoices:list-unpaid', () => invoicesRepo.listUnpaid());
   handle('invoices:get', (_, id) => invoicesRepo.getById(id));
   handle('invoices:create', (_, invoice, services) => invoicesRepo.create(invoice, services));
   handle('invoices:update', (_, id, patch) => invoicesRepo.update(id, patch));
   handle('invoices:recalc-status', (_, id) => invoicesRepo.recalcStatus(id));
   handle('invoices:delete', (_, id) => invoicesRepo.deleteById(id));

   // Payments
   handle('payments:list-by-invoice', (_, invoiceId) => paymentsRepo.listByInvoice(invoiceId));
   handle('payments:get', (_, id) => paymentsRepo.getById(id));
   handle('payments:create', (_, data) => paymentsRepo.create(data));

   // Settings
   handle('settings:get', (_, key) => settingsRepo.get(key));
   handle('settings:get-many', (_, keys) => settingsRepo.getMany(keys));
   handle('settings:set', (_, key, value) => settingsRepo.set(key, value));
   handle('settings:set-many', (_, values) => settingsRepo.setMany(values));
   handle('settings:get-all', () => settingsRepo.getAll());

   // Stats
   handle('stats:monthly-revenue', (_, period) => statsRepo.monthlyRevenue(period));
   handle('stats:vacant-count', () => statsRepo.vacantCount());
   handle('stats:total-debt', () => statsRepo.totalDebt());
   handle('stats:revenue-by-area', (_, monthsBack) => statsRepo.revenueByArea(monthsBack));
   handle('stats:revenue-by-month', (_, year) => statsRepo.revenueByMonth(year));
   handle('stats:top-debtors', (_, limit) => statsRepo.topDebtors(limit));
   handle('stats:dashboard-summary', () => statsRepo.dashboardSummary());

   // Business services
   handle('billing:create-invoice', (_, data) => billingService.createInvoice(data));
   handle('billing:preview-invoice', (_, data) => billingService.previewInvoice(data));
   handle('billing:update-invoice', (_, id, patch) => billingService.updateInvoice(id, patch));

   handle('contract-gen:export-word', (_, contractId, savePath) =>
      contractGenService.exportContractWord(contractId, savePath)
   );
   handle('contract-gen:export-pdf', (_, contractId, savePath) =>
      contractGenService.exportContractPdf(contractId, savePath)
   );

   handle('export:invoice-excel', (_, invoiceId, savePath) =>
      excelExportService.exportInvoiceExcel(invoiceId, savePath)
   );
   handle('export:invoice-pdf', (_, invoiceId, savePath) =>
      invoicePdfService.exportInvoicePdf(invoiceId, savePath)
   );
   handle('export:invoices-by-period-excel', (_, period, savePath) =>
      excelExportService.exportInvoicesByPeriod(period, savePath)
   );
   handle('export:revenue-excel', (_, filter, savePath) =>
      excelExportService.exportRevenueReport(filter, savePath)
   );
   handle('export:tenants-excel', (_, savePath) => excelExportService.exportTenantsList(savePath));

   handle('backup:backup', (_, savePath) => backupService.backupData(savePath));
   handle('backup:restore', (_, openPath) => backupService.restoreData(openPath));
   handle('backup:reset-business-data', (_, password) => backupService.resetBusinessData(password));

   // Tenant/Contract lifecycle services
   handle('lifecycle:process', () => contractLifecycle.processLifecycle());
   handle('lifecycle:promote-primary', (_, tenantId) =>
      tenantsLifecycle.promoteToPrimary(tenantId)
   );
   handle('lifecycle:create-tenants-with-contract', (_, data) =>
      tenantsLifecycle.createTenantsWithContract(data)
   );

   // Auto-update
   handle('update:check', () => autoUpdater.checkForUpdatesAndNotify());
   handle('update:install', () => autoUpdater.quitAndInstall(true, true));

   // System (debug helpers)
   handle('system:get-db-path', () => getDbPath());
   handle('system:get-version', () => app.getVersion());
}

app.on('window-all-closed', () => {
   if (process.platform !== 'darwin') {
      app.quit();
      win = null;
   }
});

// Đóng DB connection sạch trước khi quit — đảm bảo WAL flush vào main file,
// quan trọng cho Phase 14 cloud sync (cần DB state nhất quán trước khi upload).
app.on('before-quit', () => {
   try {
      closeDb();
   } catch (error) {
      console.error('[Main] closeDb failed:', error);
   }
});

app.on('activate', () => {
   if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
   }
});

app.whenReady().then(() => {
   try {
      const { dbPath } = initDb();
      cleanupOldLogs(30);
      registerIpcHandlers();
      logInfo(`Database ready at: ${dbPath}`);

      // Process contract lifecycle on app start (auto renew + auto terminate).
      // Forward kết quả cho renderer để Dashboard hiển thị thông báo.
      try {
         const lifecycleResult = contractLifecycle.processLifecycle();
         logInfo(
            `Lifecycle processed: ${lifecycleResult.renewed.length} renewed, ${lifecycleResult.terminated.length} terminated, ${lifecycleResult.expired.length} expired`
         );
         // Gửi cho renderer (delay nhẹ để main window finish load)
         setTimeout(() => {
            if (win && !win.isDestroyed()) {
               win.webContents.send('lifecycle:processed', lifecycleResult);
            }
         }, 1500);
      } catch (err) {
         logError('Lifecycle processing failed', err);
      }
   } catch (error) {
      logError('Khởi tạo Database thất bại', error);
   }

   Menu.setApplicationMenu(null);
   createWindow();

   if (!VITE_DEV_SERVER_URL) {
      autoUpdater.checkForUpdatesAndNotify();
   }
});
