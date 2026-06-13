# PhongTroApp — Tiến độ triển khai

> **File này được cập nhật sau mỗi phase.** Mỗi entry liệt kê: mục tiêu, files sẽ tạo/sửa, cách verify, và những gì user cần OK trước khi sang phase tiếp theo.

**Reference:** [PhongTroApp-Spec.md](./PhongTroApp-Spec.md) là single source of truth.

---

## Trạng thái tổng quan

| # | Phase | Status | Ghi chú |
|---|-------|--------|---------|
| 0 | Setup skeleton | ✅ Xong | Configs sẵn sàng, cần `npm install` + copy 2 file logo |
| 1 | DB Schema + Migration runner | ✅ Xong | 2 file SQL + migrate.ts + minimal main/preload |
| 2 | Repositories (data layer) | ✅ Xong | Shared types + 11 repo files, smoke test OK |
| 3 | Services (business logic) | ✅ Xong | billing, contract-gen, excel-export, backup, log; test gom cuối |
| 4 | IPC bridge | ✅ Xong | preload expose window.api, main ipcMain.handle; test gom cuối |
| 5 | Frontend foundation | ✅ Xong | MD3 tokens, Layout, Sidebar, TopNav, stores, routes; test gom cuối |
| 6 | Dashboard | ✅ Xong | 4 stat cards + bar chart + việc cần làm + phòng trống; test gom cuối |
| 7 | Rooms | ✅ Xong | Tab khu + room grid color-coded + slide-over + modal CRUD; test gom cuối |
| 8 | Tenants | ✅ Xong | Bảng khách + modal chi tiết/thêm + xe + xuất Excel; test gom cuối |
| 9 | Contracts | ✅ Xong | List + modal tạo + chọn PDF/Word khi export; test gom cuối |
| 10 | Invoices/billing | ✅ Xong | Chỉ số + preview billing + tạo hóa đơn + bảng hóa đơn; test gom cuối |
| 11 | Debts | ✅ Xong | Danh sách nợ + modal thanh toán + lịch sử payment; test gom cuối |
| 12 | Reports | ✅ Xong | Chart doanh thu + bảng tổng hợp + xuất Excel; test gom cuối |
| 13 | Settings + polish | ✅ Xong | Settings, backup/restore, update checker, app info; đang test cuối |
| 13.5 | Bug fixes round 2 | ✅ Xong (2026-06-09) | 14 fixes: billing/payments room status, backup pragma, Dashboard expiringSoon, electron-builder gộp, excel numFmt, CSP, Tailwind max-w-* conflict... |
| 14 | Cloud sync save-state | ⬜ Chưa | Phase mới — sync DB giữa 2 máy qua cloud folder (concept Steam Cloud) |

Ký hiệu: ⬜ chưa làm · ⏳ đang làm · ✅ xong · ⚠️ có vấn đề cần xử lý

## Bug fixes round 2 (2026-06-09) — chi tiết

Sau buổi debug 06/06, các fix đã apply:

1. **`electron/services/billing.ts`** — sửa ref `computeRoomStatusFromInvoices` (hàm không tồn tại) → dùng `roomsRepo.recomputeStatus`. **CRITICAL**: trước fix sẽ crash khi tạo hóa đơn.
2. **`electron/services/billing.ts`** — check trùng `(room_id, period)` trước insert → throw error thân thiện thay vì raw UNIQUE constraint.
3. **`electron/services/backup.ts`** — pragma `foreign_keys = OFF/ON` MOVE ra ngoài transaction (better-sqlite3 không cho thay pragma trong transaction). try/finally đảm bảo bật lại.
4. **`electron/database/repositories/payments.repo.ts`** — sau `recalcStatus()` gọi thêm `roomsRepo.recomputeStatus()` → room status tự đổi 'debt' → 'occupied' khi trả nợ. Cũng chuẩn hóa `paid_at` (YYYY-MM-DD → YYYY-MM-DD 00:00:00).
5. **`electron/database/repositories/tenants.repo.ts`** — `setPrimary` thêm guard: throw error nếu tenant không thuộc roomId truyền vào. Tránh vô tình "di chuyển" khách.
6. **`src/pages/Dashboard.tsx`** — bỏ hardcode "00" → gọi `api.contracts.expiringSoon(30)` thật + UI hiển thị count + sub message.
7. **`electron/services/excel-export.ts`** — thêm `numFmt: '#,##0'` cho tất cả cột tiền VND (tenants, invoice detail, period summary, revenue report). Dùng helper `setVndColumns(sheet, ['C','D'])`. Tenant deposit raw number (sort/filter OK).
8. **`electron-builder.json5`** + **`package.json`** — gộp 2 config: bỏ block `build` trong package.json, thêm `publish` (GitHub Releases) vào json5. Auto-update giờ sẽ hoạt động khi GitHub repo có release.
9. **`electron/main.ts`** — DevTools auto-open chỉ khi `VITE_DEV_SERVER_URL` (dev) HOẶC env `PHONGTRO_DEBUG=1`. Production không tự bật.
10. **`index.html`** — bỏ `'unsafe-eval'` khỏi CSP (recharts v2 không cần). Giữ `file:` cho production load qua file://.
11. **`src/components/debts/PaymentModal.tsx`** — set `size="lg"` để layout 3 cột info đủ chỗ.
12. **`src/components/rooms/RoomSlideOver.tsx`** — `max-w-md` Tailwind v4 conflict spacing scale → inline style `maxWidth: '480px'`.
13. **`src/components/EmptyState.tsx`** — `max-w-md` → inline style `maxWidth: '420px'`.
14. **`src/components/TopNav.tsx`** — `max-w-xl` → inline style `maxWidth: '560px'`.
15. **`src/pages/Invoices.tsx`** — `selectedRoomId` reset đúng khi room không còn trong billable list (tránh trỏ tới room đã terminate HĐ).

### Còn lại để làm sau (chưa critical)

- Phase 14 cloud sync save-state (như Steam Cloud) — design đã chốt, chưa implement
- Verify full E2E flow: tạo khách → HĐ → invoice → payment → check room status đổi đúng
- Test `npm run build:win` → installer + run trên máy sạch
- (Tùy chọn) Audit `'unsafe-inline'` CSP — Tailwind cần inline style nên không bỏ được; có thể nonce hoá sau

---

## Phase 0 — Setup skeleton ✅

**Mục tiêu:** Có cấu trúc thư mục gốc PhongTroApp dựa trên OmniWare, configs đã đổi sang identity mới, sẵn sàng cho Phase 1.

### Files đã tạo (config root)
- `.eslintrc.cjs` — ESLint config (thêm `env.node: true`, `@typescript-eslint/no-explicit-any: warn`)
- `.gitignore` — copy + thêm `Database.sqlite3` (chỉ ignore ở root, giữ `resources/Database.sqlite3` nếu sau này dùng)
- `.prettierignore`, `.prettierrc` — copy nguyên
- `Makefile` — đổi nhãn "TechWarehouse" → "PhongTroApp"
- `index.html` — đổi title, lang="vi", thêm preload Google Fonts Inter, CSP cho phép fonts.googleapis.com
- `removeLocales.cjs` — copy nguyên (giữ vi.pak, en-US.pak, en-GB.pak)
- `tsconfig.json`, `tsconfig.node.json` — copy nguyên
- `vite.config.ts` — copy nguyên (Vite + electron + react + tailwindcss + alias `@`)
- `electron-builder.json5` — sửa `appId='com.phongtro.app'`, `productName='PhongTroApp'`, thêm extraResources copy folder `migrations/`, đổi shortcut/uninstall name
- `package.json` — quan trọng nhất:
  - `name: phongtro-app`, `version: 1.0.0`, `author: anhvietexe`
  - `build.appId: com.phongtro.app`, `build.productName: PhongTroApp`
  - `build.publish.owner/repo: NQHxDev/PhongTroApp` (placeholder — user sẽ cập nhật)
  - `build.extraResources` copy `migrations/` vào installer
  - **Deps mới thêm:** `exceljs ^4.4.0`, `docx ^9.5.1`, `pdfkit ^0.15.2`, `recharts ^2.15.0`, `@types/pdfkit ^0.13.4`
  - **Đã loại:** `electron-vite` (dùng `vite-plugin-electron`), `i`, `npm`, `react-icons` (không cần — đã có lucide-react)
- `README.md` — viết mới cho PhongTroApp
- `electron/electron-env.d.ts` — copy nguyên

### ⚠️ Việc user phải làm thủ công
1. Copy 2 file logo từ `D:\OmniWare\public\` sang `D:\PhongTroApp\public\` (favicon.ico, Logo.png)
2. `cd D:\PhongTroApp && npm install && npx electron-rebuild -f -w better-sqlite3`

---

## Phase 1 — DB Schema + Migration runner ✅

**Mục tiêu:** App khởi động được, tự tạo DB rỗng đúng schema spec Mục 5, có seed 56 phòng trống ở 3 khu.

### Files đã tạo
- `migrations/001_init.sql` — 12 bảng nghiệp vụ + `settings` key-value + indexes (đầy đủ FK, CHECK constraint theo spec Mục 5)
- `migrations/002_seed.sql` — 3 areas + 56 rooms vacant + 6 settings rows
- `electron/database/index.ts` — init DB, pragmas, gọi runMigrations
- `electron/database/migrate.ts` — đọc `migrations/*.sql` sort theo tên, idempotent qua bảng `_migrations`
- `electron/main.ts` — minimal: initDb on ready, BrowserWindow, 2 IPC debug
- `electron/preload.ts` — minimal: window.ipcRenderer + window.api.{getDbPath, getVersion}
- `src/main.tsx`, `src/App.tsx` (placeholder), `src/index.css`, `src/vite-env.d.ts`

### Cách verify
- `npm run dev` → console log Migrations applied + DB initialized
- Mở `Database.sqlite3` bằng DB Browser → 13 tables, 3 areas, 56 rooms, 6 settings, 2 migrations
- 2026-06-06: Đã copy `public/favicon.ico` + `public/Logo.png`, chạy `npm install`, `npx electron-rebuild -f -w better-sqlite3`, `npm run dev` OK. DB tạo tại `D:\PhongTroApp\Database.sqlite3`, có 3 areas, 56 rooms, 2 migrations.
- Ghi chú kỹ thuật: sửa dev startup để bỏ `ELECTRON_RUN_AS_NODE` khỏi Electron child process; main/preload build ra `.cjs` để tương thích với Electron khi `package.json` dùng `"type": "module"`.

### User cần OK
- [x] App mở thành công, DB path đúng
- [x] Schema + seed đúng (3 khu, 56 phòng tên D01–D23 / L01–L10 / TT01–TT23)
- [x] Format tên phòng OK — giữ D01–D23 / L01–L10 / TT01–TT23

---

## Phase 2 — Repositories (data layer)

**Mục tiêu:** Có data access layer thuần SQL, không có business logic. Mỗi repo export functions thuần (không class). Các phase sau gọi các function này.

### Pattern chung
- Mỗi file là 1 module export `{ create, getById, list, update, delete, ... }`
- Dùng `getDb()` từ `../index` để lấy connection
- Prepare statement reuse khi cần
- Return type rõ ràng qua interface trong `src/shared/types.ts` (dùng chung 2 process)

### Files sẽ tạo
- `src/shared/types.ts` — interfaces dùng chung renderer + main:
  - `Area`, `Room`, `Service`, `Tenant`, `Vehicle`, `Contract`, `MeterReading`, `Invoice`, `InvoiceService`, `Payment`, `Settings`
  - `RoomStatus = 'vacant' | 'occupied' | 'debt'`
  - `ContractStatus = 'active' | 'expired' | 'terminated'`
  - `InvoiceStatus = 'unpaid' | 'paid' | 'partial'`
  - `PaymentMethod = 'cash' | 'transfer'`
  - `VehicleType = 'motorbike' | 'bicycle' | 'car'`
  - `BillingResult` (dùng cho service)
- `electron/database/repositories/areas.repo.ts`
  - `listAll()`, `getById(id)`, `create({name, address, description})`, `update(id, patch)`, `delete(id)`
- `electron/database/repositories/rooms.repo.ts`
  - `listByArea(areaId)`, `listAll()` (kèm area name), `getById(id)`, `create(...)`, `update(id, patch)`, `delete(id)`
  - `updateStatus(id, status)`, `countByStatus()` (vacant/occupied/debt count)
- `electron/database/repositories/services.repo.ts`
  - `listActive()`, `listAll()`, `create(...)`, `update(...)`, `setActive(id, bool)`, `delete(id)`
- `electron/database/repositories/tenants.repo.ts`
  - `listAll()` (join room+area), `listByRoom(roomId)`, `getById(id)`, `create(...)`, `update(id, patch)`, `delete(id)`
  - `setPrimary(roomId, tenantId)` — đảm bảo chỉ 1 is_primary=1/room
  - `countActiveInRoom(roomId)` — đếm người chưa move_out
- `electron/database/repositories/vehicles.repo.ts`
  - `listByTenant(tenantId)`, `listByRoom(roomId)` (join tenants), `create(...)`, `delete(id)`
- `electron/database/repositories/contracts.repo.ts`
  - `listAll()` (join room+tenant), `listByRoom(roomId)`, `getById(id)`, `create(...)`, `update(id, patch)`, `terminate(id)`
  - `expiringSoon(days)` — HĐ active có end_date <= today+days
- `electron/database/repositories/meters.repo.ts`
  - `getByRoomPeriod(roomId, period)`, `getPrevious(roomId, period)` — chỉ số kỳ liền trước, `create(...)`, `update(...)`
- `electron/database/repositories/invoices.repo.ts`
  - `listByPeriod(period)`, `listByRoom(roomId)`, `listUnpaid()`, `getById(id)` (kèm invoice_services)
  - `create(invoice, services[])` — transaction insert cả invoice + invoice_services
  - `recalcStatus(invoiceId)` — đọc tổng payments, update paid_amount + status
- `electron/database/repositories/payments.repo.ts`
  - `listByInvoice(invoiceId)`, `create({invoice_id, amount, method, paid_at, note})`
  - Sau khi create gọi `invoices.recalcStatus(invoice_id)`
- `electron/database/repositories/settings.repo.ts` *(repo mới cho landlord info)*
  - `get(key)`, `getMany(keys[])`, `set(key, value)`, `setMany(obj)`, `getAll()`
- `electron/database/repositories/stats.repo.ts`
  - `monthlyRevenue(period?)` — sum paid_amount tháng hiện tại
  - `vacantCount()` — count rooms status='vacant'
  - `totalDebt()` — sum (total - paid_amount) where status != 'paid'
  - `revenueByArea(monthsBack)`, `revenueByMonth(year)` — cho charts
  - `topDebtors(limit)` — phòng nợ cao nhất + số ngày quá hạn
  - `dashboardSummary()` — gộp 1 call nhiều stats

### Cách verify
- TypeScript compile (`npm run build` hoặc `tsc --noEmit`) không lỗi
- Viết file script test ngắn `electron/database/test-repos.ts` (chạy bằng `tsx` hoặc gộp vào main.ts tạm thời) để smoke test mỗi function trả về đúng kiểu dữ liệu
- 2026-06-06: Đã chạy `npx tsc --noEmit` OK.
- 2026-06-06: Đã bundle/chạy smoke test `electron/database/test-repos.ts` bằng Electron Node mode OK:
  - DB path: `D:\PhongTroApp\Database.sqlite3`
  - areas=3, rooms=56, settings=6
  - roomStatus: total=56, vacant=56, occupied=0, debt=0
  - dashboard: monthly_revenue=0, vacant_count=56, total_debt=0

### Files thực tế đã tạo
- `src/shared/types.ts`
- `electron/database/repositories/areas.repo.ts`
- `electron/database/repositories/rooms.repo.ts`
- `electron/database/repositories/services.repo.ts`
- `electron/database/repositories/tenants.repo.ts`
- `electron/database/repositories/vehicles.repo.ts`
- `electron/database/repositories/contracts.repo.ts`
- `electron/database/repositories/meters.repo.ts`
- `electron/database/repositories/invoices.repo.ts`
- `electron/database/repositories/payments.repo.ts`
- `electron/database/repositories/settings.repo.ts`
- `electron/database/repositories/stats.repo.ts`
- `electron/database/test-repos.ts`

### Ghi chú thay đổi so với plan
- Có thêm fallback trong `electron/database/index.ts` và `electron/database/migrate.ts` để smoke test chạy được trong Electron Node mode khi `require('electron')` trả path exe. App thật vẫn dùng `electron.app`.
- `rooms.repo.ts` có thêm `listByStatus(status, limit)` để phục vụ Dashboard Phase 6 đã được PROGRESS nhắc ở API gọi.
- `meters.repo.ts` có thêm `getLatestBefore(roomId, period)` ngoài `getPrevious()` để Phase 3 có thể fallback khi cần.

### User cần OK
- [ ] Type definitions trong `src/shared/types.ts` đúng nhu cầu (có thể bổ sung field nếu cần)
- [ ] API surface mỗi repo đủ dùng cho các phase sau

---

## Phase 3 — Services (business logic)

**Mục tiêu:** Tách logic phức tạp khỏi repo. Repo chỉ làm CRUD; service kết hợp nhiều repo để xử lý nghiệp vụ.

### Files sẽ tạo
- `electron/services/billing.ts` — **LÕI NGHIỆP VỤ** (spec Mục 6.1)
  - `createInvoice({ room_id, period, electric_end, water_end, electric_start?, water_start?, override_services? })`
  - Bước 1: lấy chỉ số kỳ trước → nếu có thì set start=prev.end, nếu không bắt buộc truyền start
  - Bước 2: validate end >= start, period đúng format YYYY-MM
  - Bước 3: lấy room.price, unit prices
  - Bước 4: đếm tenants active trong room
  - Bước 5: lấy services active, tính amount per service (per_person ? × people_count : × 1)
  - Bước 6: total = room_fee + electric_fee + water_fee + Σ service amounts
  - Bước 7: transaction insert meter_readings + invoices + invoice_services
  - Bước 8: update rooms.status nếu cần (lần đầu tạo HĐ → 'occupied')
  - Return invoice đã tạo (kèm services chi tiết)
  - `previewInvoice(...)` — giống createInvoice nhưng KHÔNG insert, dùng cho preview tổng dự kiến realtime trên UI
  - `updateInvoice(id, patch)` — cập nhật chỉ số/dịch vụ sau khi đã tạo (xóa+tạo lại invoice_services nếu cần)
- `electron/services/contract-gen.ts`
  - `generateContractData(contractId)` — gom landlord (từ settings), tenants, room, area, terms thành object render
  - `exportContractWord(contractId, savePath)` — dùng `docx` lib tạo file .docx với heading "Hợp Đồng Thuê Phòng Trọ", các điều khoản chuẩn VN
  - `exportContractPdf(contractId, savePath)` — dùng `pdfkit` tạo file .pdf cùng nội dung
  - Cả 2 hàm dùng `dialog.showSaveDialog` để chọn nơi lưu
- `electron/services/excel-export.ts` — dùng `exceljs`
  - `exportInvoiceExcel(invoiceId, savePath)` — 1 sheet, header logo + landlord info, bảng chi tiết phí, tổng, status
  - `exportInvoicesByPeriod(period, savePath)` — bảng tất cả HĐ trong tháng
  - `exportRevenueReport(filter, savePath)` — sheet "Tổng hợp" + sheet/khu
  - `exportTenantsList(savePath)` — danh sách khách thuê + xe + room
- `electron/services/backup.ts` — adapt từ OmniWare pattern cho schema mới
  - `backupData()` — `dialog.showSaveDialog` → JSON dump tất cả bảng (kèm settings) + meta version
  - `restoreData()` — `dialog.showOpenDialog` → đọc JSON, transaction DELETE tất cả + INSERT lại
  - **Khác OmniWare:** bảng schema mới (areas, rooms, tenants...), idempotent qua DELETE+INSERT trong 1 transaction
- `electron/services/log.ts` — file logger đơn giản
  - `logInfo(msg)`, `logError(msg, err?)` → ghi vào `userData/logs/app-YYYY-MM-DD.log`
  - Rotate: xóa log >30 ngày khi khởi động

### Cách verify
- Smoke test billing: tạo 1 tenant ở D01, thêm 1 service "Rác" per_person=1 unit_price=15000, chạy `createInvoice({room_id:1, period:'2026-01', electric_start:0, electric_end:50, water_start:0, water_end:5})` → kiểm tra invoice.total + invoice_services có đúng row "Rác" qty=1 amount=15000
- `exportContractWord` mở được bằng MS Word, `exportContractPdf` mở được bằng PDF reader
- `backupData → restoreData` round-trip không mất data (count rows trước/sau bằng nhau)
- 2026-06-06: Theo yêu cầu user, không test từng phase nữa; gom test một lượt sau khi build xong các phase.

### Files thực tế đã tạo
- `electron/services/billing.ts`
- `electron/services/contract-gen.ts`
- `electron/services/excel-export.ts`
- `electron/services/backup.ts`
- `electron/services/log.ts`

### Ghi chú thay đổi so với plan
- `billing.ts` có `previewInvoice`, `createInvoice`, `updateInvoice`; `createInvoice` tự insert `meter_readings`, `invoices`, `invoice_services` trong 1 transaction.
- `contract-gen.ts` hỗ trợ truyền sẵn `savePath` hoặc mở save dialog; PDF cố gắng dùng font hệ thống có hỗ trợ tiếng Việt.
- `excel-export.ts` có export 1 hóa đơn, hóa đơn theo kỳ, báo cáo doanh thu và danh sách khách thuê.
- `backup.ts` dump/restore toàn bộ bảng nghiệp vụ + settings trong transaction.
- `log.ts` có ghi log theo ngày và dọn log cũ.

### User cần OK
- [ ] Template hợp đồng tiếng Việt: điều khoản tôi soạn có đúng theo bạn cần không, hay bạn sẽ paste template riêng?
- [ ] Excel format có cần logo/header riêng không?

---

## Phase 4 — IPC bridge

**Mục tiêu:** Renderer (React) gọi được tất cả chức năng backend qua `window.api.*` type-safe.

### Files sẽ tạo/sửa
- `electron/preload.ts` — rewrite hoàn chỉnh, expose `window.api` theo namespace:
  - `api.areas.{list, get, create, update, delete}`
  - `api.rooms.{listByArea, listAll, get, create, update, delete, updateStatus, countByStatus}`
  - `api.services.{listActive, listAll, create, update, setActive, delete}`
  - `api.tenants.{listAll, listByRoom, get, create, update, delete, setPrimary}`
  - `api.vehicles.{listByTenant, listByRoom, create, delete}`
  - `api.contracts.{list, listByRoom, get, create, update, terminate, expiringSoon}`
  - `api.meters.{getByRoomPeriod, getPrevious}`
  - `api.invoices.{listByPeriod, listByRoom, listUnpaid, get}`
  - `api.payments.{listByInvoice, create}`
  - `api.settings.{get, getMany, set, setMany, getAll}`
  - `api.stats.{monthlyRevenue, vacantCount, totalDebt, revenueByArea, revenueByMonth, topDebtors, dashboardSummary}`
  - `api.billing.{createInvoice, previewInvoice, updateInvoice}`
  - `api.contractGen.{exportWord, exportPdf}`
  - `api.export.{invoiceExcel, invoicesByPeriodExcel, revenueExcel, tenantsExcel}`
  - `api.backup.{backup, restore}`
  - `api.update.{check, install, onProgress(callback)}`
  - `api.system.{getDbPath, getVersion}`
- `electron/main.ts` — rewrite đầy đủ:
  - Import tất cả repo + service
  - Đăng ký `ipcMain.handle('namespace:method', handler)` cho từng method
  - Set up autoUpdater event forwarding qua webContents.send
  - Single instance lock, window-all-closed handling
- `src/vite-env.d.ts` — type definitions cho `window.api`:
  - Import types từ `src/shared/types.ts`
  - Khai báo `interface Window { api: { areas: {...}; rooms: {...}; ... } }`
  - Mỗi method có Promise return type chính xác

### Cách verify
- TS compile renderer: `window.api.rooms.listByArea(1)` cho IntelliSense đúng
- Console renderer: chạy thử `await window.api.areas.list()` trong DevTools → trả về 3 areas
- 2026-06-06: Theo yêu cầu user, không test từng phase nữa; gom test một lượt sau khi build xong các phase.

### Files thực tế đã sửa
- `electron/main.ts` — đăng ký IPC handlers cho repos/services, auto-updater event forwarding, system APIs.
- `electron/preload.ts` — expose `window.api` theo namespace: areas, rooms, services, tenants, vehicles, contracts, meters, invoices, payments, settings, stats, billing, contractGen, export, backup, update, system.
- `src/vite-env.d.ts` — khai báo type cho toàn bộ `window.api`.

### Ghi chú thay đổi so với plan
- Giữ thêm `api.getDbPath()` và `api.getVersion()` để tương thích debug helper Phase 1, đồng thời có `api.system.*` đúng Phase 4.
- Có thêm một số API bổ trợ đã tạo ở Phase 2/3: `rooms.listByStatus`, `meters.getLatestBefore`, `invoices.create/update/recalcStatus`, `contracts.delete`, `vehicles.get`, `payments.get`.

### User cần OK
- [ ] Cấu trúc namespace có gọn không, hay muốn flat (vd `api.listRooms` thay vì `api.rooms.list`)?

---

## Phase 5 — Frontend foundation

**Mục tiêu:** UI cơ bản (layout + design tokens + routing + store) sẵn sàng cho 8 trang. Không có business UI nào ở đây — chỉ scaffold.

### Files sẽ tạo
- `tailwind.config.ts` — config Tailwind 4 với MD3 tokens theo spec Mục 3.2:
  - Primary palette (#005bbf...)
  - Secondary (green), Tertiary (red), Error, Surface, Outline
  - fontSize: `headline-md`, `headline-sm`, `body-lg/md`, `label-md/sm`
  - spacing: xs/sm/md/lg/xl + gutter + container-margin
  - borderRadius: lg/xl/full
- `src/index.css` — rewrite:
  - `@import 'tailwindcss'`
  - CSS variables cho MD3 (cũng được mirror trong tailwind config)
  - Custom animations: slide-over, fade-in, hover scale
  - Font Inter
- `src/stores/appStore.ts` — Zustand store:
  - `currentArea: number | 'all'` — tab hiện tại trang Rooms
  - `searchQuery: string` — global search topnav
  - `period: string` — kỳ tháng đang xem (YYYY-MM, default = current month)
  - `unreadNotifications: number`
  - actions tương ứng
- `src/stores/dataStore.ts` — cache + refresh stores:
  - `areas`, `rooms`, `services` — load 1 lần, refresh khi CRUD
  - `loadAreas()`, `loadRooms()`, etc.
- `src/components/Layout.tsx` — root layout:
  - Sidebar (fixed left w-64) — logo title, 7 nav items, CTA "Thêm hóa đơn mới"
  - TopNav (h-16) — search bar, notification bell, settings, avatar
  - `<Outlet />` từ react-router-dom
- `src/components/Sidebar.tsx`, `src/components/TopNav.tsx` — tách nhỏ Layout cho dễ maintain
- `src/components/StatCard.tsx` — card stat tái sử dụng (icon, label, value, badge, sub, optional trend %)
- `src/components/Dialog.tsx` — confirm/alert/prompt modal (dùng @headlessui Dialog)
- `src/components/Spinner.tsx` — loading state
- `src/components/Chip.tsx` — status chip (vacant/occupied/debt, paid/unpaid/partial, active/expired)
- `src/components/EmptyState.tsx` — placeholder khi chưa có data
- `src/lib/format.ts` — helpers: `formatVND(n)`, `formatDate(s)`, `formatPeriod(s)`, `daysOverdue(date)`
- `src/lib/hooks.ts` — `useAreas()`, `useRooms()`, `useSettings()` — wrap API call + state
- `src/App.tsx` — rewrite với HashRouter:
  - `/` → Dashboard
  - `/rooms` → Rooms
  - `/tenants` → Tenants
  - `/contracts` → Contracts
  - `/invoices` → Invoices
  - `/debts` → Debts
  - `/reports` → Reports
  - `/settings` → Settings
- `src/pages/*.tsx` — placeholder cho 8 trang (chỉ render tên trang)

### Cách verify
- App chạy, sidebar hiển thị 7 nav items, click chuyển route OK
- DevTools: kiểm tra `--primary` CSS variable resolve đúng
- Click vào "Tổng quan" hightlight bg-primary-container đúng
- 2026-06-06: Theo yêu cầu user, không test từng phase nữa; gom test một lượt sau khi build xong các phase.

### Files thực tế đã tạo/sửa
- `tailwind.config.ts`
- `src/index.css`
- `src/stores/appStore.ts`
- `src/stores/dataStore.ts`
- `src/components/Layout.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopNav.tsx`
- `src/components/StatCard.tsx`
- `src/components/Dialog.tsx`
- `src/components/Spinner.tsx`
- `src/components/Chip.tsx`
- `src/components/EmptyState.tsx`
- `src/lib/format.ts`
- `src/lib/hooks.ts`
- `src/App.tsx`
- `src/pages/PageShell.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Rooms.tsx`
- `src/pages/Tenants.tsx`
- `src/pages/Contracts.tsx`
- `src/pages/Invoices.tsx`
- `src/pages/Debts.tsx`
- `src/pages/Reports.tsx`
- `src/pages/Settings.tsx`

### Ghi chú thay đổi so với plan
- Sidebar có thêm route `Cài đặt` trong nav chính để khớp route `/settings`; top nav vẫn có gear link.
- Placeholder pages chỉ dựng khung tiêu đề/mô tả, UI nghiệp vụ sẽ triển khai ở Phase 6+.

### User cần OK
- [ ] Màu sắc theo spec OK, hay muốn tweak palette riêng?
- [ ] Logo/avatar tạm dùng placeholder hay bạn có ảnh sẵn?

---

## Phase 6 — Dashboard

**Mục tiêu:** Trang `/` — overview kinh doanh, dữ liệu live từ stats repo.

### Files sẽ tạo/sửa
- `src/pages/Dashboard.tsx` — full layout theo spec Mục 4.2:
  - 4 StatCard top: doanh thu tháng (icon Banknote, badge tăng/giảm %, "Đã thu X%"), phòng trống (badge "Trống X/Y", progress bar %), tổng công nợ (text-tertiary, badge số HĐ quá hạn), HĐ sắp hết hạn (badge số ngày)
  - Grid 12 cols:
    - Cột trái 8: Bar chart "Doanh thu 6 tháng gần nhất" — dùng recharts `<BarChart>`, 2 series (doanh thu / chi phí), tooltip
    - Cột phải 4: "Việc cần làm hôm nay" — Zustand store, checklist local-only (Phase 13 có thể persist)
  - Section dưới: grid 4 col card "Phòng mới trống" (4 phòng vacant gần đây nhất)
- `src/components/dashboard/RevenueChart.tsx` — recharts wrapper
- `src/components/dashboard/TodoList.tsx` — checklist UI

### API gọi
- `api.stats.dashboardSummary()` — gộp các stat
- `api.stats.revenueByMonth(6)` — chart
- `api.rooms.listByStatus('vacant', limit=4)` — phòng trống mới nhất

### Cách verify
- Mở trang `/`: 4 stat hiển thị (giai đoạn này chưa có invoice nên doanh thu = 0, công nợ = 0; phòng trống = 56/56)
- Chart hiện 6 tháng với value 0 (no data yet)
- Phòng trống section list 4 phòng đầu
- 2026-06-06: Theo yêu cầu user, không test từng phase nữa; gom test một lượt sau khi build xong các phase.

### Files thực tế đã tạo/sửa
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/RevenueChart.tsx`
- `src/components/dashboard/TodoList.tsx`

### Ghi chú thay đổi so với plan
- Dashboard đọc dữ liệu live từ `api.stats.dashboardSummary()`, `api.stats.revenueByMonth(currentYear)` và `api.rooms.listByStatus('vacant', 4)`.
- Series "Chi phí" trong chart hiện để 0 vì schema hiện chưa có bảng chi phí; giữ cấu trúc chart để bổ sung sau.
- Card "Hợp đồng sắp hết hạn" để placeholder 0 đến khi Phase 9 có dữ liệu hợp đồng thực tế.

### User cần OK
- [ ] Chart loại bar OK, hay muốn line/area?
- [ ] Việc cần làm: persist vào DB hay chỉ local Zustand?

---

## Phase 7 — Rooms (Phòng trọ)

**Mục tiêu:** Trang quản lý phòng — sơ đồ trực quan theo khu, slide-over panel chi tiết, modal CRUD.

### Files sẽ tạo
- `src/pages/Rooms.tsx` — theo spec Mục 4.3:
  - Header + 2 button ("Thêm khu mới" outline, "Thêm phòng mới" filled)
  - 4 mini StatCard: tổng phòng / trống / đã thuê / nợ
  - Tab bar khu — sticky, click filter
  - Legend 3 màu
  - Per area section: header (icon + tên + count) + grid auto-fill 180px cards
  - 3 loại card (vacant/occupied/debt) — màu nền + badge khác nhau
  - Click card → open slide-over
- `src/components/rooms/RoomCard.tsx` — card phòng theo status
- `src/components/rooms/RoomSlideOver.tsx` — panel chi tiết quick info + 2 button
- `src/components/rooms/AddAreaModal.tsx` — form khu (name, address, description)
- `src/components/rooms/AddRoomModal.tsx` — form phòng (area select, name, floor, area_m2, price, electric/water_unit_price, max_people)
- `src/components/rooms/EditRoomModal.tsx` — sửa thông tin phòng

### API gọi
- `api.areas.list()`, `api.areas.create()`, `api.areas.update()`
- `api.rooms.listByArea()`, `api.rooms.listAll()`, `api.rooms.create()`, `api.rooms.update()`, `api.rooms.delete()`
- `api.rooms.countByStatus()`
- `api.tenants.listByRoom()` — hiển thị tên khách trên slide-over

### Cách verify
- Trang `/rooms` render 3 sections cho 3 khu, 56 cards tổng
- Click tab "Khu D" filter còn 23 cards
- Click card mở slide-over hiển thị name + giá + diện tích (giá/diện tích đang 0 vì seed default)
- Thêm khu mới + thêm phòng mới hoạt động
- 2026-06-06: Theo yêu cầu user, không test từng phase nữa; gom test một lượt sau khi build xong các phase.

### Files thực tế đã tạo/sửa
- `src/pages/Rooms.tsx`
- `src/components/rooms/RoomCard.tsx`
- `src/components/rooms/RoomSlideOver.tsx`
- `src/components/rooms/AddAreaModal.tsx`
- `src/components/rooms/AddRoomModal.tsx`
- `src/components/rooms/EditRoomModal.tsx`
- `src/components/rooms/RoomForm.tsx`

### Ghi chú thay đổi so với plan
- Modal thêm/sửa phòng dùng chung `RoomForm.tsx` để tránh lặp field.
- Slide-over hiển thị khách đại diện nếu phòng có tenant; hiện nút "Xem chi tiết hợp đồng" mới là UI action, route chi tiết sẽ nối ở Phase 9.
- Room card đã hỗ trợ 3 màu trạng thái theo `vacant | occupied | debt`.

### User cần OK
- [ ] Slide-over có cần thêm action gì khác ngoài "Xem HĐ" + "Sửa"?

---

## Phase 8 — Tenants (Khách thuê)

**Mục tiêu:** Quản lý khách thuê + xe máy.

### Files sẽ tạo
- `src/pages/Tenants.tsx` — theo spec Mục 4.4:
  - 4 StatCard: tổng khách / HĐ sắp hết hạn / phòng trống / CTA "Tạo HĐ mới"
  - Bảng danh sách: cột Họ tên (bold), SĐT, Phòng (badge), Ngày vào, Trạng thái chip, Chi tiết
  - Filter button + Xuất Excel button
  - Pagination footer
- `src/components/tenants/TenantTable.tsx`
- `src/components/tenants/TenantDetailModal.tsx` — chi tiết + xe + HĐ
- `src/components/tenants/AddTenantModal.tsx` — full_name, cccd, dob, phone, permanent_address, room, is_primary, move_in_date
- `src/components/tenants/VehicleManager.tsx` — list vehicles + add/remove

### API gọi
- `api.tenants.listAll()`, `api.tenants.create()`, `api.tenants.update()`, `api.tenants.delete()`
- `api.vehicles.listByTenant()`, `api.vehicles.create()`, `api.vehicles.delete()`
- `api.export.tenantsExcel()`

### Cách verify
- Thêm khách → xuất hiện trong bảng + status phòng tự đổi (logic ở repo `setPrimary` + update room status)
- Thêm xe → liên kết tenant
- Xuất Excel ra file `.xlsx` mở được
- 2026-06-06: Theo yêu cầu user, không test từng phase nữa; gom test một lượt sau khi build xong các phase.

### Files thực tế đã tạo/sửa
- `src/pages/Tenants.tsx`
- `src/components/tenants/TenantTable.tsx`
- `src/components/tenants/TenantDetailModal.tsx`
- `src/components/tenants/AddTenantModal.tsx`
- `src/components/tenants/VehicleManager.tsx`

### Ghi chú thay đổi so với plan
- Pagination mặc định hiện là 10 dòng/trang.
- Modal chi tiết khách nhúng `VehicleManager` để thêm/xóa xe ngay trong cùng flow.
- Khi thêm khách có phòng, UI gọi `rooms.updateStatus(room_id, 'occupied')` để chuyển phòng sang đã thuê.

### User cần OK
- [ ] Pagination size default (10/20/50)?

---

## Phase 9 — Contracts (Hợp đồng)

**Mục tiêu:** Tạo + xuất hợp đồng (PDF / Word user chọn).

### Files sẽ tạo
- `src/pages/Contracts.tsx` — list HĐ + button "Tạo HĐ mới"
- `src/components/contracts/ContractList.tsx` — bảng (room, primary tenant, rent, start/end, status, actions)
- `src/components/contracts/CreateContractModal.tsx` — theo spec Mục 4.5:
  - Header bg-primary "Hợp Đồng Thuê Phòng"
  - Section 1: Bên A (pre-fill từ settings landlord_*) | Bên B (select tenant)
  - Section 2: Phòng select, giá thuê, tiền cọc | Textarea điều khoản
  - Footer: button "Xuất PDF" + "Xuất Word" outline | "Hủy" + "Lưu HĐ" filled
- `src/components/contracts/ExportFormatPicker.tsx` — modal nhỏ chọn PDF/Word khi export

### API gọi
- `api.contracts.list()`, `api.contracts.create()`, `api.contracts.update()`, `api.contracts.terminate()`
- `api.settings.getMany(['landlord_name', ...])` — pre-fill Bên A
- `api.tenants.listAll()` — select Bên B (filter is_primary)
- `api.rooms.listAll()` — select phòng
- `api.contractGen.exportPdf(id)`, `api.contractGen.exportWord(id)` — show save dialog

### Cách verify
- Tạo HĐ → row mới trong bảng, status='active'
- Click "Xuất PDF" → file mở được + đủ thông tin
- Click "Xuất Word" → mở Word OK, có thể chỉnh sửa
- 2026-06-06: Theo yêu cầu user, không test từng phase nữa; gom test một lượt sau khi build xong các phase.

### Files thực tế đã tạo/sửa
- `src/pages/Contracts.tsx`
- `src/components/contracts/ContractList.tsx`
- `src/components/contracts/CreateContractModal.tsx`
- `src/components/contracts/ExportFormatPicker.tsx`

### Ghi chú thay đổi so với plan
- Modal tạo hợp đồng pre-fill Bên A từ `settings` và lấy rooms/tenants từ API.
- Sau khi lưu hợp đồng, UI gọi `rooms.updateStatus(room_id, 'occupied')`.
- Xuất hợp đồng dùng modal chọn PDF/Word qua `api.contractGen.exportPdf/exportWord`.

### User cần OK
- [ ] Template chính xác các điều khoản chuẩn — tôi sẽ soạn 5-7 điều khoản phổ biến VN, bạn review và sửa sau.

---

## Phase 10 — Invoices / Billing 🔥

**Trang phức tạp nhất.** Spec Mục 4.6 + 6.1.

### Files sẽ tạo
- `src/pages/Invoices.tsx` — bento 12 col:
  - Cột trái 8: panel "Ghi chỉ số & Tính phí"
    - Dropdown chọn phòng (chỉ phòng đã occupied/debt)
    - Period chip "Kỳ tháng XX/YYYY"
    - Grid 2 cols:
      - Left: chỉ số điện cũ (readonly, auto-fill từ `api.meters.getPrevious`) + chỉ số điện mới (input), tương tự nước
      - Right: phí dịch vụ panel (list services active, hiển thị tên + qty + price tự tính)
    - Tổng dự kiến (realtime, gọi `api.billing.previewInvoice` debounced 300ms)
    - CTA "Chốt chỉ số & Tạo HĐ"
  - Cột phải 4:
    - Card "Tổng công nợ" bg-primary-container
    - Top debtors list
- Section dưới: bảng HĐ tháng hiện tại + filter Tab (Tất cả / Chưa thu / Đã thu)
- `src/components/invoices/MeterInput.tsx` — input chỉ số có validate (end >= start), warning nếu chênh quá cao
- `src/components/invoices/BillingPreview.tsx` — bảng dự kiến + tổng
- `src/components/invoices/InvoiceTable.tsx` — bảng row có 3 icon action (xem / gửi Zalo / in)
- `src/components/invoices/InvoiceDetailModal.tsx` — xem chi tiết HĐ + lịch sử payments
- `src/components/invoices/SendNotifyModal.tsx` — bulk gửi thông báo (giai đoạn đầu chỉ export Excel + show số điện thoại để user gửi tay)

### API gọi
- `api.billing.previewInvoice(...)` debounced — không insert, chỉ tính
- `api.billing.createInvoice(...)` — insert thật
- `api.invoices.listByPeriod(period)`, `api.invoices.get(id)`
- `api.meters.getPrevious(roomId)` — auto-fill chỉ số cũ
- `api.services.listActive()`
- `api.tenants.countActiveInRoom(roomId)` — số người để tính dịch vụ per_person
- `api.export.invoiceExcel(id)`

### Cách verify
- Chọn phòng D01 (sau khi đã có HĐ + tenant ở Phase 9) → chỉ số cũ = 0 (lần đầu), nhập chỉ số mới → tổng dự kiến đổi realtime
- Click "Chốt" → HĐ mới xuất hiện trong bảng, status='unpaid'
- Lần sau chọn D01 cùng phòng kỳ sau → chỉ số cũ tự fill từ kỳ trước
- 2026-06-06: Theo yêu cầu user, không test từng phase nữa; gom test một lượt sau khi build xong các phase.

### Files thực tế đã tạo/sửa
- `src/pages/Invoices.tsx`
- `src/components/invoices/MeterInput.tsx`
- `src/components/invoices/BillingPreview.tsx`
- `src/components/invoices/InvoiceTable.tsx`
- `src/components/invoices/InvoiceDetailModal.tsx`
- `src/components/invoices/SendNotifyModal.tsx`

### Ghi chú thay đổi so với plan
- Trang chỉ hiển thị phòng `occupied/debt` trong dropdown tính tiền.
- Preview gọi `api.billing.previewInvoice()` debounce 300ms.
- Tạo hóa đơn gọi `api.billing.createInvoice()` rồi reload danh sách theo kỳ hiện tại.
- Nút in/xuất từng hóa đơn đang dùng `api.export.invoiceExcel(id)`; phần in PDF hóa đơn có thể polish sau.
- Gửi thông báo hiện là modal nội dung + SĐT, chưa tích hợp Zalo.

### User cần OK
- [ ] Gửi thông báo Zalo: implement bằng cách show link `zalo://...` hay chỉ copy SĐT? (Zalo SDK desktop khó tích hợp, đề xuất chỉ copy SĐT + nội dung soạn sẵn)

---

## Phase 11 — Debts (Công nợ)

**Mục tiêu:** Theo dõi phòng nợ, ghi nhận thanh toán.

### Files sẽ tạo
- `src/pages/Debts.tsx`:
  - Card tổng nợ
  - Bảng: phòng, khách, số tiền nợ, số ngày quá hạn (calc từ created_at invoice), trạng thái chip
  - Filter theo khu + sort
- `src/components/debts/PaymentModal.tsx`:
  - Hiển thị invoice info (tổng / đã thu / còn nợ)
  - Input: số tiền thanh toán, method (cash/transfer radio), paid_at (default today), note
  - Submit → `api.payments.create()`, auto-recalc invoice status
- `src/components/debts/PaymentHistory.tsx` — list payments của 1 invoice

### API gọi
- `api.invoices.listUnpaid()` (kèm room + tenant join)
- `api.payments.create()` → auto trigger `invoices.recalcStatus()` ở repo
- `api.payments.listByInvoice()`

### Cách verify
- Tạo invoice, ghi payment 1 phần → status='partial', số nợ giảm tương ứng
- Ghi payment đủ → status='paid', không còn xuất hiện trong list nợ
- Room status tự đổi: nợ quá X ngày → 'debt' (logic ở repo hoặc background job)
- 2026-06-06: Theo yêu cầu user, không test từng phase nữa; gom test một lượt sau khi build xong các phase.

### Files thực tế đã tạo/sửa
- `src/pages/Debts.tsx`
- `src/components/debts/PaymentModal.tsx`
- `src/components/debts/PaymentHistory.tsx`

### Ghi chú thay đổi so với plan
- Có filter theo khu và sort theo số tiền nợ/quá hạn lâu nhất.
- Modal thanh toán load lịch sử payments theo invoice và gọi `api.payments.create()`; repo tự recalc invoice status.
- Room status tự đổi theo quá hạn chưa thêm background job riêng, để gom xử lý/polish ở Phase 13 nếu cần.

### User cần OK
- [ ] Ngưỡng "quá hạn" mặc định bao nhiêu ngày? (Spec gợi ý "> 5 ngày", confirm hay đổi?)

---

## Phase 12 — Reports (Báo cáo)

**Mục tiêu:** Phân tích doanh thu theo khu/tháng + xuất Excel.

### Files sẽ tạo
- `src/pages/Reports.tsx`:
  - Filter row: dropdown khu (default "Tất cả"), range month picker
  - Bar chart doanh thu theo tháng (recharts) — series per khu nếu filter "Tất cả"
  - Bảng tổng hợp: Khu | Doanh thu | Đã thu | Chưa thu | Tỷ lệ lấp đầy | Số HĐ
  - Button "Xuất Excel"
- `src/components/reports/RevenueChart.tsx`
- `src/components/reports/SummaryTable.tsx`

### API gọi
- `api.stats.revenueByArea({fromPeriod, toPeriod, areaId?})`
- `api.stats.revenueByMonth({year, areaId?})`
- `api.export.revenueExcel(filter)` — multi-sheet Excel

### Cách verify
- Filter "Khu D" → chart + bảng chỉ hiển thị Khu D
- Xuất Excel có đầy đủ data + format số tiền đẹp
- 2026-06-06: Theo yêu cầu user, không test từng phase nữa; gom test một lượt sau khi build xong các phase.

### Files thực tế đã tạo/sửa
- `src/pages/Reports.tsx`
- `src/components/reports/RevenueChart.tsx`
- `src/components/reports/SummaryTable.tsx`

### Ghi chú thay đổi so với plan
- Filter hiện có khu + năm; range tháng chi tiết có thể polish Phase 13.
- Chart dùng `api.stats.revenueByMonth(year)`; bảng theo khu dùng `api.stats.revenueByArea(12)`.
- Nút xuất Excel gọi `api.export.revenueExcel({ year, monthsBack: 12 })`.

### User cần OK
- [ ] Có cần thêm chart pie/donut tỷ trọng doanh thu theo khu không?

---

## Phase 13 — Settings + polish

**Mục tiêu:** Hoàn thiện trang cấu hình + auto-update + UI polish cuối.

### Files sẽ tạo/sửa
- `src/pages/Settings.tsx`:
  - Section 1: **Thông tin chủ trọ (Bên A)** — form 4 field landlord_name/cccd/phone/address, save vào `settings` table. Đây là dữ liệu pre-fill modal tạo HĐ.
  - Section 2: **Đơn giá mặc định** — default_electric_price, default_water_price (áp dụng khi tạo phòng mới)
  - Section 3: **Sao lưu & Khôi phục** — 2 button Backup/Restore (gọi `api.backup.*`)
  - Section 4: **Cập nhật phần mềm** — button "Kiểm tra cập nhật" + progress bar + button "Cài đặt và khởi động lại" (khi có bản mới)
  - Section 5: **Thông tin app** — version, DB path, log path
- `src/components/settings/UpdateChecker.tsx` — listen IPC `update:*` events
- `src/components/settings/BackupSection.tsx`
- Polish:
  - Toast notifications (success/error) — dùng `react-hot-toast` hoặc custom Headless
  - Empty states đẹp hơn
  - Skeleton loaders cho list
  - Confirm dialog cho delete actions
  - Keyboard shortcuts (Ctrl+S save modal, Esc close, Ctrl+K focus search)
- Bug fix round dựa trên test toàn flow
- Build thử installer: `npm run build:win` → kiểm tra installer chạy được trên máy sạch

### API gọi
- `api.settings.getAll()`, `api.settings.setMany()`
- `api.backup.backup()`, `api.backup.restore()`
- `api.update.check()`, `api.update.install()`, listen `update:*` events
- `api.system.getDbPath()`, `api.system.getVersion()`

### Cách verify
- Save landlord info → mở modal tạo HĐ thấy Bên A đã pre-fill
- Backup → có file JSON. Đổi data → Restore từ file → data quay lại
- Build NSIS thành công, installer cài đặt + chạy trên 1 máy/folder khác không lỗi
- 2026-06-06: Đã build code Phase 13, bắt đầu lượt test/compile cuối theo yêu cầu user.

### Files thực tế đã tạo/sửa
- `src/pages/Settings.tsx`
- `src/components/settings/UpdateChecker.tsx`
- `src/components/settings/BackupSection.tsx`

### Ghi chú thay đổi so với plan
- Toast tạm dùng message inline success/error trong Settings, chưa thêm dependency toast mới.
- Log path hiện nằm trong service `electron/services/log.ts`; UI hiển thị version + DB path, log path có thể bổ sung nếu cần sau test.
- Range polish/keyboard shortcuts để lại sau khi kiểm tra build tổng thể.

### User cần OK
- [ ] Tên kỹ thuật cuối cùng cho installer, repo GitHub Releases (placeholder hiện tại: `NQHxDev/PhongTroApp`)
- [ ] Phiên bản 1.0.0 release chính thức? Hay đặt thấp hơn (0.1.0 beta)?

---

## Phụ lục — Lưu ý kỹ thuật chung

### Thứ tự dependencies giữa các phase
```
Phase 0 → 1 → 2 → 3 → 4    (backend chuỗi không nhảy được)
                  ↓
              Phase 5         (frontend foundation, phụ thuộc Phase 4 cho window.api types)
                  ↓
        ┌─────────┼─────────┐
        ↓         ↓         ↓
    Phase 6   Phase 7   Phase 8 ...   (các trang độc lập, có thể đổi thứ tự)
        ↓
    Phase 9 ← cần Phase 7 (rooms) + 8 (tenants) trước
        ↓
    Phase 10 ← cần Phase 9 (contracts) trước
        ↓
    Phase 11 ← cần Phase 10 (invoices)
        ↓
    Phase 12 ← cần Phase 10
        ↓
    Phase 13
```

### Quy tắc đặt tên IPC channel
- Format: `{namespace}:{action}` — vd `rooms:list-by-area`, `invoices:create`
- Dấu `-` kebab-case trong action, namespace là tên repo/service

### Quy tắc commit (gợi ý — user tự quyết)
- `feat(phase-X): mô tả` — mỗi phase = 1 commit hoặc 1 series commit prefix giống nhau
- `fix(...)`, `refactor(...)`, `chore(...)`
