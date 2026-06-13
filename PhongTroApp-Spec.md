# PhongTroApp — Tài liệu tổng hợp yêu cầu & Kế hoạch triển khai

> **Mục đích file này:** Đây là single source of truth cho toàn bộ dự án. Agent đọc file này trước khi bắt tay vào bất kỳ phase nào.

---

## 1. Tổng quan dự án

### 1.1 Mô tả
App desktop quản lý phòng trọ dành cho **chủ trọ** (một người duy nhất sử dụng). Không có cổng cho khách thuê. Chủ trọ quản lý **nhiều khu trọ**, mỗi khu có chất lượng và doanh thu khác nhau.

### 1.2 Tech Stack

| Layer | Tech | Ghi chú |
|-------|------|---------|
| Desktop wrapper | Electron 30 | Cross-platform, đóng gói installer |
| Build tool | Vite 5 + vite-plugin-electron | Hot reload, tách main/renderer |
| UI | React 18 + TypeScript | Type safety |
| Style | Tailwind v4 | Inline class, MD3 color tokens |
| State | Zustand + React local state | Đủ cho app offline 1 user |
| Routing | react-router-dom (HashRouter) | Chạy được trong file:// |
| DB | better-sqlite3 | Sync API, WAL mode |
| Excel | exceljs | Xuất báo cáo, hóa đơn |
| Icons | lucide-react | Tree-shake tốt |
| Update | electron-updater + GitHub Releases | Free, auto |
| Installer | electron-builder (NSIS Windows) | Industry standard |

### 1.3 Repo hiện có (đè lên)
Dự án được xây trên repo Electron có sẵn . Giữ nguyên skeleton: `electron-builder.json5`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `package.json`, `index.html`, `Makefile`, `.eslintrc.cjs`, `.prettierrc`, `removeLocales.cjs`. Đập đi xây lại phần: `electron/`, `src/`, `migrations/`, `Database.sqlite3`.

### 1.4 Cấu trúc thư mục mục tiêu

```
D:\PhongTroApp\
├── electron/
│   ├── main.ts                    # Entry point, IPC handlers, app lifecycle
│   ├── preload.ts                 # Bridge main ↔ renderer, expose window.api
│   ├── database/
│   │   ├── index.ts               # SQLite init (WAL, pragma, foreign_keys)
│   │   ├── migrate.ts             # Migration runner (giữ pattern cũ)
│   │   └── repositories/
│   │       ├── areas.repo.ts      # Khu trọ
│   │       ├── rooms.repo.ts      # Phòng
│   │       ├── tenants.repo.ts    # Khách thuê
│   │       ├── vehicles.repo.ts   # Xe máy
│   │       ├── services.repo.ts   # Dịch vụ chung
│   │       ├── contracts.repo.ts  # Hợp đồng
│   │       ├── meters.repo.ts     # Chỉ số điện nước
│   │       ├── invoices.repo.ts   # Hóa đơn
│   │       ├── payments.repo.ts   # Thanh toán
│   │       └── stats.repo.ts      # Báo cáo, thống kê
│   └── services/
│       ├── billing.ts             # Tính tiền hàng tháng (LÕI NGHIỆP VỤ)
│       ├── contract-gen.ts        # Sinh hợp đồng mẫu
│       ├── excel-export.ts        # Xuất Excel (hóa đơn + báo cáo)
│       ├── backup.ts              # Backup/restore DB (giữ pattern cũ)
│       └── log.ts                 # File logger (giữ pattern cũ)
│
├── src/
│   ├── App.tsx                    # HashRouter, 8 routes
│   ├── main.tsx                   # React mount
│   ├── index.css                  # Tailwind + MD3 tokens + animations
│   ├── vite-env.d.ts              # window.api type definitions
│   ├── shared/types.ts            # Shared types dùng cả 2 process
│   ├── stores/
│   │   └── appStore.ts            # Zustand store
│   ├── components/
│   │   ├── Layout.tsx             # Sidebar + TopNav
│   │   ├── Dialog.tsx             # confirm/alert/prompt modal
│   │   ├── Spinner.tsx            # Loading
│   │   └── StatCard.tsx           # Card thống kê tái sử dụng
│   └── pages/
│       ├── Dashboard.tsx          # Tổng quan
│       ├── Rooms.tsx              # Phòng trọ (gộp khu trọ dạng tab)
│       ├── Tenants.tsx            # Khách thuê
│       ├── Contracts.tsx          # Hợp đồng
│       ├── Invoices.tsx           # Hóa đơn & tính tiền
│       ├── Debts.tsx              # Công nợ
│       ├── Reports.tsx            # Báo cáo doanh thu
│       └── Settings.tsx           # Backup/restore
│
├── migrations/
│   ├── 001_init.sql               # Schema phòng trọ
│   └── 002_seed.sql               # Dữ liệu mẫu (tuỳ chọn)
│
├── package.json
├── vite.config.ts
├── electron-builder.json5
└── tsconfig.json
```

---

## 2. Yêu cầu chức năng

### 2.1 Quản lý khu trọ
- Chủ trọ quản lý **nhiều khu**, mỗi khu có tên, địa chỉ, mô tả chất lượng.
- Khu trọ **không phải trang riêng** — hiển thị dạng **tab bar** trong trang Phòng trọ.
- Mỗi khu có doanh thu và chất lượng khác nhau.

### 2.2 Quản lý phòng
- Mỗi phòng thuộc một khu, có: tên phòng, tầng, diện tích (m²), giá thuê, đơn giá điện, đơn giá nước.
- Trạng thái phòng: **Trống** / **Đã thuê** / **Nợ tiền**.
- Đơn giá điện/nước có thể khác nhau giữa các khu.

### 2.3 Quản lý khách thuê
- Mỗi phòng khi có khách sẽ lưu **danh sách người ở** (1 phòng nhiều người).
- Mỗi người: họ tên, CCCD, ngày sinh, SĐT, thường trú.
- Một người là **người đại diện** (is_primary) — ký hợp đồng, nhận hóa đơn.
- **Xe máy**: lưu biển số để kiểm soát 1 phòng có mấy xe. Mỗi người có thể có nhiều xe.
- Phòng lưu thêm: tổng người ở, giá cọc, ngày vào, ngày ra.

### 2.4 Hợp đồng
- Khi khách nhận phòng, hệ thống **tự sinh hợp đồng mẫu** từ thông tin: khu, phòng, khách (Bên A = chủ trọ, Bên B = khách thuê), giá thuê, tiền cọc, ngày bắt đầu, điều khoản bổ sung.
- Chủ trọ có thể **xuất file** (PDF hoặc Word) để in ký.
- Trạng thái: active / expired / terminated.

### 2.5 Tính tiền hàng tháng (LÕI NGHIỆP VỤ)
Đây là chức năng quan trọng nhất. Công thức:

```
Tiền điện = (Chỉ số điện cuối - Chỉ số điện đầu) × Đơn giá điện
Tiền nước = (Chỉ số nước cuối - Chỉ số nước đầu) × Đơn giá nước
Tiền dịch vụ = Σ (Đơn giá dịch vụ × Số người trong phòng)  [với dịch vụ per_person]
             + Σ (Đơn giá dịch vụ × 1)                      [với dịch vụ cố định theo phòng]
TỔNG = Tiền phòng + Tiền điện + Tiền nước + Tiền dịch vụ
```

Quy tắc chỉ số:
- **Lần đầu tiên**: chủ trọ nhập tay cả chỉ số đầu và chỉ số cuối.
- **Từ tháng sau**: chỉ nhập chỉ số cuối. Chỉ số đầu **tự động lấy từ chỉ số cuối của tháng trước**.
- Validate: chỉ số mới >= chỉ số cũ.

### 2.6 Dịch vụ chung
- Ví dụ: wifi, rác, gửi xe, bảo vệ, internet...
- Mỗi dịch vụ có đơn giá và loại tính: **theo đầu người** hoặc **cố định theo phòng**.
- Chủ trọ chỉ nhập đơn giá ban đầu, hệ thống tự nhân lên (× số người hoặc × 1).
- Tất cả phòng cùng khu dùng chung danh sách dịch vụ (cấu hình ở cấp khu hoặc global).

### 2.7 Thanh toán & Công nợ
- Theo dõi trạng thái hóa đơn: **Chưa trả** / **Đã trả** / **Trả một phần**.
- Ghi nhận thanh toán: số tiền, hình thức (tiền mặt / chuyển khoản), ngày, ghi chú.
- Hiển thị danh sách phòng còn nợ, số ngày quá hạn.

### 2.8 Báo cáo doanh thu
- Doanh thu **theo khu**, **theo tháng**.
- So sánh hiệu quả giữa các khu.
- Xuất Excel.

---

## 3. UI/UX Specification

### 3.1 Design System

**Font:** Inter (400, 500, 600, 700, 800, 900)
**Icons:** Material Symbols Outlined (trong mockup) → chuyển sang `lucide-react` khi code React. Mapping tương đương:
- `dashboard` → `LayoutDashboard`
- `door_front` → `DoorOpen`
- `group` → `Users`
- `description` → `FileText`
- `receipt_long` → `Receipt`
- `account_balance_wallet` → `Wallet`
- `leaderboard` → `BarChart3`
- `settings` → `Settings`
- `notifications` → `Bell`
- `search` → `Search`
- `add` / `add_circle` → `Plus` / `PlusCircle`
- `check_circle` → `CheckCircle`
- `warning` → `AlertTriangle`
- `priority_high` → `AlertCircle`
- `person_off` → `UserX`
- `apartment` → `Building2`
- `meeting_room` → `DoorOpen`
- `payments` → `Banknote`
- `history_edu` → `ScrollText`
- `edit_note` → `PenLine`
- `calculate` → `Calculator`
- `file_download` → `Download`
- `send` → `Send`
- `visibility` → `Eye`
- `chat` → `MessageCircle`
- `print` → `Printer`
- `filter_list` → `Filter`
- `download` → `Download`
- `chevron_left/right` → `ChevronLeft` / `ChevronRight`
- `close` → `X`
- `delete` → `Trash2`
- `info` → `Info`
- `wifi` → `Wifi`
- `local_parking` → `Car`
- `water_drop` → `Droplets`
- `schedule` → `Clock`
- `calendar_today` → `Calendar`
- `trending_up` → `TrendingUp`
- `more_horiz` → `MoreHorizontal`
- `add_task` → `ListPlus`

### 3.2 Color Palette (MD3 tokens)

Thêm vào `tailwind.config.ts` → `theme.extend.colors`:

```ts
colors: {
  // Primary
  "primary": "#005bbf",
  "on-primary": "#ffffff",
  "primary-container": "#1a73e8",
  "on-primary-container": "#ffffff",
  "primary-fixed": "#d8e2ff",
  "primary-fixed-dim": "#adc7ff",
  "on-primary-fixed": "#001a41",
  "on-primary-fixed-variant": "#004493",
  "inverse-primary": "#adc7ff",

  // Secondary (green — trạng thái tốt)
  "secondary": "#006e2c",
  "on-secondary": "#ffffff",
  "secondary-container": "#86f898",
  "on-secondary-container": "#00722f",
  "secondary-fixed": "#89fa9b",
  "secondary-fixed-dim": "#6ddd81",
  "on-secondary-fixed": "#002108",
  "on-secondary-fixed-variant": "#005320",

  // Tertiary (red — cảnh báo, nợ)
  "tertiary": "#b81d17",
  "on-tertiary": "#ffffff",
  "tertiary-container": "#dc392c",
  "on-tertiary-container": "#ffffff",
  "tertiary-fixed": "#ffdad5",
  "tertiary-fixed-dim": "#ffb4a9",
  "on-tertiary-fixed": "#410001",
  "on-tertiary-fixed-variant": "#930004",

  // Error
  "error": "#ba1a1a",
  "on-error": "#ffffff",
  "error-container": "#ffdad6",
  "on-error-container": "#93000a",

  // Surface & Background
  "surface": "#f7f9ff",
  "on-surface": "#181c20",
  "surface-dim": "#d7dae0",
  "surface-bright": "#f7f9ff",
  "surface-variant": "#dfe3e8",
  "on-surface-variant": "#414754",
  "surface-container-lowest": "#ffffff",
  "surface-container-low": "#f1f4fa",
  "surface-container": "#ebeef4",
  "surface-container-high": "#e5e8ee",
  "surface-container-highest": "#dfe3e8",
  "surface-tint": "#005bc0",
  "inverse-surface": "#2d3135",
  "inverse-on-surface": "#eef1f7",
  "background": "#f7f9ff",
  "on-background": "#181c20",

  // Outline
  "outline": "#727785",
  "outline-variant": "#c1c6d6",
}
```

### 3.3 Typography (Tailwind custom)

```ts
fontSize: {
  "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
  "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
  "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
  "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
  "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "500" }],
  "label-sm": ["11px", { lineHeight: "14px", fontWeight: "600" }],
}
```

### 3.4 Spacing

```ts
spacing: {
  "xs": "4px",
  "sm": "8px",
  "base": "4px",
  "md": "16px",
  "lg": "24px",
  "xl": "32px",
  "gutter": "16px",
  "container-margin": "24px",
}
```

### 3.5 Border Radius

```ts
borderRadius: {
  DEFAULT: "0.25rem",
  lg: "0.5rem",
  xl: "0.75rem",
  full: "9999px",
}
```

---

## 4. Chi tiết từng trang UI

### 4.1 Layout chung (mọi trang)

**Sidebar (fixed left, w-64, ẩn trên mobile):**
```
┌─────────────────────┐
│  "Quản lý nhà"      │  ← headline-md, bold, text-primary
│  "Hệ thống vận hành"│  ← body-md, text-on-surface-variant
├─────────────────────┤
│  📊 Tổng quan        │  ← nav items, active = bg-primary-container
│  🚪 Phòng trọ        │     text-on-primary-container, bold, scale-[0.98]
│  👥 Khách thuê       │     inactive = text-on-surface-variant
│  📄 Hợp đồng         │     hover = bg-surface-container-high
│  🧾 Hóa đơn          │
│  💰 Công nợ          │
│  📈 Báo cáo          │
├─────────────────────┤
│  [+ Thêm hóa đơn mới]│  ← CTA button, bg-primary, full width
└─────────────────────┘
```

**Top Nav (fixed, h-16):**
- Bên trái: Search bar (rounded-full, bg-surface-container-low, placeholder "Tìm kiếm phòng, khách thuê...")
- Bên phải: Notification bell (có badge đỏ) + Settings gear + Avatar + tên "Admin"

### 4.2 Trang Dashboard (`/`)

**4 Stat cards** (grid 4 cols):
1. **Doanh thu tháng này** — icon payments, badge "+12.5%" (secondary), giá trị lớn "125.4M", sub "VNĐ (Đã thu 85%)"
2. **Số phòng trống** — icon meeting_room, badge "Trống 8/45", giá trị "08", progress bar 18%
3. **Tổng công nợ** — icon warning (tertiary), badge "15 Hóa đơn" (error), giá trị "42.8M" text-tertiary, sub "Quá hạn > 5 ngày"
4. **Hợp đồng sắp hết hạn** — icon history_edu, giá trị "05", sub "Cần gia hạn trong 30 ngày"

**Grid 12 cols bên dưới:**
- **Cột trái (8 cols):** Bar chart "Doanh thu 6 tháng gần nhất" — có legend (Doanh thu / Chi phí), 6 cột bar, hover hiện tooltip giá trị. Dùng `recharts` thay vì CSS bars.
- **Cột phải (4 cols):** "Việc cần làm hôm nay" — checklist, mỗi item có checkbox + mô tả + deadline/priority tag + nút xóa hover. Nút "+ Thêm công việc" (border dashed).

**Section dưới:** "Phòng mới trống" — grid 4 cols card phòng (tên phòng, badge TRỐNG, diện tích, giá thuê, nút "Xem chi tiết").

### 4.3 Trang Phòng trọ (`/rooms`)

**Header:** h2 "Quản lý Khu và Phòng", sub "Xem sơ đồ trực quan và quản lý trạng thái vận hành". Bên phải: nút "Thêm khu mới" (outline) + "Thêm phòng mới" (filled).

**4 Stat cards nhỏ:** Tổng số phòng / Phòng trống / Đã thuê / Đang nợ tiền.

**Tab bar chuyển khu:** "Tất cả khu" (active, border-b-2 primary) | "Khu A (Lầu 1-2)" | "Khu B (Lầu 3-4)" | ...

**Legend:** Chú thích 3 màu: □ Phòng trống / ■ Đã thuê (secondary-container) / ■ Đang nợ (tertiary-container).

**Room grid** per section (mỗi khu 1 section):
- Section header: icon apartment + "Khu A - Dãy lầu 1 & 2" + "24 Phòng • 6 Trống"
- Grid: `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`, gap 16px.
- **Card Phòng trống:** bg-surface-container-lowest, border-outline-variant. Hiện: tên phòng (bold headline-sm), badge "PHÒNG TRỐNG", giá, icon person_off + diện tích.
- **Card Đã thuê:** bg-secondary-container, border-secondary. Hiện: tên phòng, badge "ĐÃ THUÊ", tên khách, icon group + diện tích.
- **Card Nợ tiền:** bg-tertiary-container, border-tertiary. Hiện: tên phòng, badge "NỢ TIỀN", tên khách, icon priority_high + diện tích.
- Click card → mở **slide-over panel** bên phải.

**Slide-over (Quick Info):**
- Slide từ phải, max-w-md, rounded-2xl, glass-panel effect.
- Nội dung: Tên phòng (display-lg, primary) + khu/tầng, grid 2 cols (giá phòng + diện tích), trạng thái chip, thông tin khách thuê (avatar + tên + mã HĐ).
- 2 nút: "Xem chi tiết hợp đồng" (filled) + "Chỉnh sửa thông tin" (outline).

### 4.4 Trang Khách thuê (`/tenants`)

**4 Stat cards:** Tổng khách thuê / Hợp đồng sắp hết hạn / Phòng trống / CTA "Tạo hợp đồng mới".

**Bảng danh sách:**
- Header: "Danh sách khách thuê" + nút "Lọc" + "Xuất Excel".
- Columns: Họ và tên (bold) | Số điện thoại | Phòng (badge bg-surface-container-high) | Ngày bắt đầu | Trạng thái (chip: "Đang thuê" secondary / "Hết hạn" tertiary) | Thao tác (link "Chi tiết").
- Pagination ở footer: "Hiển thị 4 trong tổng số 48" + page buttons.

### 4.5 Trang Hợp đồng (`/contracts`)

Danh sách hợp đồng + **Modal tạo hợp đồng mới:**

**Modal header:** bg-primary, text-on-primary. "Hợp Đồng Thuê Phòng" + sub "Mẫu hợp đồng pháp lý chuẩn". Nút close.

**Modal body (2 sections):**

Section 1 — Các bên (grid 2 cols):
- Bên A (Chủ cho thuê): Họ tên (pre-filled), Số CCCD.
- Bên B (Khách thuê): Họ tên, Số điện thoại.

Section 2 — Thông tin thuê & Điều khoản:
- Grid 3 cols: Phòng thuê (select), Giá thuê (number), Tiền cọc (number).
- Textarea: Điều khoản bổ sung (placeholder: "Ví dụ: Giờ giấc tự do, không nuôi thú cưng...").

**Modal footer:**
- Bên trái: nút "Xuất file PDF" (outline, icon picture_as_pdf).
- Bên phải: "Hủy" + "Lưu hợp đồng" (filled, shadow-md).

### 4.6 Trang Hóa đơn / Tính tiền (`/invoices`)

**Header:** "Thanh toán & Hóa đơn" + sub "Quản lý chỉ số, phí dịch vụ và thu tiền định kỳ." Nút "Xuất báo cáo" + "Gửi thông báo hàng loạt".

**Bento grid 12 cols:**

**Cột trái (8 cols) — "Ghi chỉ số & Tính phí":**
- Header: icon edit_note + title + badge "Kỳ tháng 10/2023".
- Grid 2 cols bên trong:
  - **Bên trái:** Dropdown chọn phòng (hiện "Phòng 101 - Nguyễn Văn A"). 2 hàng input: Chỉ số điện cũ (readonly, bg-surface-container-low, cursor-not-allowed) + Chỉ số điện mới (border-primary, bold). Tương tự cho nước.
  - **Bên phải:** Panel "Phí dịch vụ cố định" (bg-surface-container-low/50). Mỗi dịch vụ 1 row: icon + tên + "(3 người)" hoặc "(2 chiếc)" + giá. Ví dụ: Wifi (Theo phòng) = 100.000đ, Rác (3 người) = 45.000đ, Xe máy (2 chiếc) = 200.000đ.
  - **Tổng dự kiến:** headline-sm, text-primary. Ví dụ: 3.545.000đ.
  - **Nút CTA:** "Chốt chỉ số & Tạo hóa đơn" (bg-primary, icon calculate, full width, shadow-md, hover:scale-[1.02]).

**Cột phải (4 cols):**
- **Card công nợ:** bg-primary-container, text-on-primary-container. "Tổng công nợ chưa thu" + giá trị lớn "42.850.000đ" + "12 phòng quá hạn thanh toán". Background decoration icon.
- **Danh sách nợ cao nhất:** mỗi row: avatar số phòng (bg-error-container) + tên + "Quá hạn X ngày" (text-error) + số tiền.
- Link "Xem tất cả công nợ".

**Section dưới (full 12 cols) — "Hóa đơn tháng hiện tại":**
- Tab filter: Tất cả / Chưa thu / Đã thu (toggle buttons bg-surface-container-high).
- Bảng: Phòng (bold, primary) | Khách thuê | Ngày lập (center) | Tổng tiền (right, bold) | Trạng thái (chip: "Đã thanh toán" secondary / "Chưa thanh toán" tertiary) | Hành động (3 icon buttons: xem / gửi Zalo / in — opacity-40, group-hover:opacity-100).

### 4.7 Trang Công nợ (`/debts`)

- Bảng các phòng còn nợ: phòng, khách thuê, số tiền nợ, số ngày quá hạn, trạng thái.
- Nút ghi nhận thanh toán → modal: nhập số tiền, chọn hình thức (tiền mặt / chuyển khoản), ghi chú.
- Cập nhật invoice status tự động khi thanh toán.

### 4.8 Trang Báo cáo (`/reports`)

- Dropdown chọn khu + range tháng.
- Bar chart doanh thu theo tháng (recharts).
- Bảng tổng hợp: doanh thu, đã thu, chưa thu, tỷ lệ lấp đầy — theo từng khu.
- Nút xuất Excel.

### 4.9 Settings (gear icon trên top nav)

- Backup / restore database (giữ pattern cũ, đổi UI).
- Xem log.

---

## 5. Database Schema

### 5.1 File: `migrations/001_init.sql`

```sql
-- Bật pragmas
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ========================================
-- Khu trọ
-- ========================================
CREATE TABLE IF NOT EXISTS areas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,                          -- "Khu A - Dãy lầu 1 & 2"
    address     TEXT DEFAULT '',
    description TEXT DEFAULT '',                        -- ghi chú chất lượng
    created_at  TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Phòng
-- ========================================
CREATE TABLE IF NOT EXISTS rooms (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id           INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,                    -- "P.101"
    floor             INTEGER DEFAULT 1,
    area_m2           REAL DEFAULT 0,                   -- diện tích m²
    price             REAL NOT NULL DEFAULT 0,          -- tiền phòng / tháng
    electric_unit_price REAL NOT NULL DEFAULT 0,        -- đơn giá điện / kWh
    water_unit_price  REAL NOT NULL DEFAULT 0,          -- đơn giá nước / m³
    max_people        INTEGER DEFAULT 4,
    status            TEXT NOT NULL DEFAULT 'vacant'     -- vacant | occupied | debt
        CHECK (status IN ('vacant', 'occupied', 'debt')),
    created_at        TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_rooms_area ON rooms(area_id);
CREATE INDEX idx_rooms_status ON rooms(status);

-- ========================================
-- Dịch vụ chung
-- ========================================
CREATE TABLE IF NOT EXISTS services (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,                          -- "Wifi", "Rác", "Gửi xe"
    unit_price  REAL NOT NULL DEFAULT 0,               -- đơn giá
    per_person  INTEGER NOT NULL DEFAULT 1,            -- 1 = tính theo đầu người, 0 = cố định theo phòng
    icon        TEXT DEFAULT '',                        -- tên icon lucide (wifi, trash2, car...)
    created_at  TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Khách thuê
-- ========================================
CREATE TABLE IF NOT EXISTS tenants (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id           INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    full_name         TEXT NOT NULL,
    cccd              TEXT DEFAULT '',                  -- căn cước công dân
    dob               TEXT DEFAULT '',                  -- ngày sinh (YYYY-MM-DD)
    phone             TEXT DEFAULT '',
    permanent_address TEXT DEFAULT '',                  -- thường trú
    is_primary        INTEGER NOT NULL DEFAULT 0,      -- 1 = người đại diện
    move_in_date      TEXT DEFAULT '',                  -- ngày vào
    move_out_date     TEXT DEFAULT '',                  -- ngày ra
    deposit           REAL DEFAULT 0,                   -- tiền cọc
    created_at        TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_tenants_room ON tenants(room_id);

-- ========================================
-- Xe máy
-- ========================================
CREATE TABLE IF NOT EXISTS vehicles (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plate_number  TEXT NOT NULL,                        -- biển số
    vehicle_type  TEXT DEFAULT 'motorbike',             -- motorbike | bicycle | car
    created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);

-- ========================================
-- Hợp đồng
-- ========================================
CREATE TABLE IF NOT EXISTS contracts (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id             INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    primary_tenant_id   INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    deposit             REAL DEFAULT 0,
    rent_price          REAL DEFAULT 0,                 -- giá thuê ghi trong HĐ
    start_date          TEXT NOT NULL,                   -- YYYY-MM-DD
    end_date            TEXT DEFAULT '',                 -- YYYY-MM-DD, rỗng = vô thời hạn
    terms               TEXT DEFAULT '',                 -- điều khoản bổ sung
    landlord_name       TEXT DEFAULT '',                 -- Bên A: họ tên chủ trọ
    landlord_cccd       TEXT DEFAULT '',                 -- Bên A: CCCD
    status              TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'terminated')),
    created_at          TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_contracts_room ON contracts(room_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- ========================================
-- Chỉ số điện nước
-- ========================================
CREATE TABLE IF NOT EXISTS meter_readings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id         INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    period          TEXT NOT NULL,                       -- "2024-10" (YYYY-MM)
    electric_start  REAL NOT NULL DEFAULT 0,
    electric_end    REAL NOT NULL DEFAULT 0,
    water_start     REAL NOT NULL DEFAULT 0,
    water_end       REAL NOT NULL DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(room_id, period)                              -- mỗi phòng 1 record/tháng
);
CREATE INDEX idx_meters_room_period ON meter_readings(room_id, period);

-- ========================================
-- Hóa đơn
-- ========================================
CREATE TABLE IF NOT EXISTS invoices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id         INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    contract_id     INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
    period          TEXT NOT NULL,                       -- "2024-10"
    room_fee        REAL NOT NULL DEFAULT 0,
    electric_fee    REAL NOT NULL DEFAULT 0,
    water_fee       REAL NOT NULL DEFAULT 0,
    service_fee     REAL NOT NULL DEFAULT 0,
    total           REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (status IN ('unpaid', 'paid', 'partial')),
    created_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(room_id, period)
);
CREATE INDEX idx_invoices_period ON invoices(period);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ========================================
-- Chi tiết dịch vụ trong hóa đơn
-- ========================================
CREATE TABLE IF NOT EXISTS invoice_services (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_id  INTEGER REFERENCES services(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,                          -- snapshot tên dịch vụ lúc tạo
    quantity    INTEGER NOT NULL DEFAULT 1,              -- số người hoặc 1
    unit_price  REAL NOT NULL DEFAULT 0,                -- snapshot đơn giá lúc tạo
    amount      REAL NOT NULL DEFAULT 0                 -- quantity × unit_price
);
CREATE INDEX idx_invoice_services_invoice ON invoice_services(invoice_id);

-- ========================================
-- Thanh toán
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount      REAL NOT NULL DEFAULT 0,
    method      TEXT NOT NULL DEFAULT 'cash'
        CHECK (method IN ('cash', 'transfer')),
    paid_at     TEXT DEFAULT (datetime('now')),
    note        TEXT DEFAULT ''
);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- ========================================
-- Migration tracking (giữ pattern cũ)
-- ========================================
CREATE TABLE IF NOT EXISTS _migrations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    applied_at  TEXT DEFAULT (datetime('now'))
);
```

---

## 6. Quy tắc nghiệp vụ quan trọng

### 6.1 Billing logic (file `billing.ts`)
```
Input:  room_id, period (YYYY-MM), electric_end, water_end
        (lần đầu cần thêm: electric_start, water_start)

Process:
1. Lấy chỉ số kỳ trước: SELECT electric_end, water_end FROM meter_readings
   WHERE room_id = ? AND period = previousPeriod(period)
   → Nếu không có (lần đầu) → bắt buộc truyền electric_start, water_start
   → Nếu có → electric_start = row.electric_end, water_start = row.water_end

2. Validate: electric_end >= electric_start, water_end >= water_start

3. Lấy thông tin phòng: price, electric_unit_price, water_unit_price

4. Tính:
   electric_fee = (electric_end - electric_start) × electric_unit_price
   water_fee    = (water_end - water_start) × water_unit_price

5. Đếm số người trong phòng:
   people_count = SELECT COUNT(*) FROM tenants WHERE room_id = ? AND move_out_date = ''

6. Lấy danh sách dịch vụ, tính service_fee:
   Với mỗi service:
     if per_person: amount = unit_price × people_count
     else:          amount = unit_price × 1

7. total = room_fee + electric_fee + water_fee + Σ service amounts

8. Trong 1 TRANSACTION:
   - INSERT meter_readings (room_id, period, electric_start, electric_end, water_start, water_end)
   - INSERT invoices (room_id, contract_id, period, room_fee, electric_fee, water_fee, service_fee, total, status='unpaid')
   - INSERT invoice_services (cho từng dịch vụ — snapshot tên + giá)

Output: invoice object
```

### 6.2 Trạng thái phòng tự động
- Khi tạo hợp đồng → room.status = 'occupied'
- Khi hóa đơn quá hạn (unpaid > X ngày) → room.status = 'debt'
- Khi thanh toán hết nợ → room.status = 'occupied'
- Khi kết thúc hợp đồng / trả phòng → room.status = 'vacant'

### 6.3 Thanh toán
- Khi ghi payment → cộng tổng payments cho invoice đó
- Nếu tổng payments >= invoice.total → invoice.status = 'paid'
- Nếu tổng payments > 0 nhưng < total → invoice.status = 'partial'
- Nếu tổng = 0 → invoice.status = 'unpaid'

---

## 7. Phân chia Phase triển khai

### PHASE 1 — Database Schema
**Mục tiêu:** Tạo `migrations/001_init.sql` + cập nhật `electron/database/index.ts` + `migrate.ts`.
**Output:** App khởi động được, tạo DB rỗng đúng schema.
**Tham chiếu:** Mục 5 trong file này.

### PHASE 2 — Repositories (Data Layer)
**Mục tiêu:** Tạo toàn bộ file trong `electron/database/repositories/`.
**Pattern:** Export functions thuần (không class). Import db từ `../index.ts`. Dùng better-sqlite3 sync API.
**Files:** areas, rooms, tenants, vehicles, services, contracts, meters, invoices, payments, stats.
**Tham chiếu:** Mục 5 (schema) để biết cấu trúc bảng.

### PHASE 3 — Services (Business Logic)
**Mục tiêu:** Tạo `electron/services/billing.ts`, `contract-gen.ts`, `excel-export.ts`. Giữ lại `backup.ts`, `log.ts` từ app cũ.
**Tham chiếu:** Mục 6 (quy tắc nghiệp vụ).

### PHASE 4 — IPC Bridge
**Mục tiêu:** Cập nhật `preload.ts` expose `window.api` + `main.ts` đăng ký `ipcMain.handle`.
**Namespaces:** `api.areas.*`, `api.rooms.*`, `api.tenants.*`, `api.vehicles.*`, `api.services.*`, `api.contracts.*`, `api.meters.*`, `api.invoices.*`, `api.payments.*`, `api.stats.*`, `api.billing.*`, `api.export.*`, `api.backup.*`.
**Cập nhật:** `src/vite-env.d.ts` khai báo types cho `window.api`.

### PHASE 5 — Frontend Foundation
**Mục tiêu:** Layout + routing + store + design tokens.
**Files:** `index.css` (MD3 tokens), `stores/appStore.ts`, `components/Layout.tsx`, `components/StatCard.tsx`, `components/Dialog.tsx`, `App.tsx` (routes).
**Tham chiếu:** Mục 3 (design system), Mục 4.1 (layout).

### PHASE 6 — Trang Dashboard
**File:** `src/pages/Dashboard.tsx`
**API calls:** `api.stats.monthlyRevenue()`, `api.stats.vacantCount()`, `api.stats.totalDebt()`, `api.contracts.expiringSoon(30)`
**Tham chiếu:** Mục 4.2.

### PHASE 7 — Trang Phòng trọ
**File:** `src/pages/Rooms.tsx`
**API calls:** `api.areas.list()`, `api.rooms.listByArea(areaId)`, `api.tenants.getByRoom(roomId)`
**Tham chiếu:** Mục 4.3.

### PHASE 8 — Trang Khách thuê
**File:** `src/pages/Tenants.tsx`
**API calls:** `api.tenants.listAll()`, `api.vehicles.listByTenant(tenantId)`, `api.export.tenantsExcel()`
**Tham chiếu:** Mục 4.4.

### PHASE 9 — Trang Hợp đồng
**File:** `src/pages/Contracts.tsx`
**API calls:** `api.contracts.create()`, `api.contracts.list()`, `api.contractGen.generate(contractId)`
**Tham chiếu:** Mục 4.5.

### PHASE 10 — Trang Hóa đơn (Billing)
**File:** `src/pages/Invoices.tsx`
**API calls:** `api.billing.createInvoice()`, `api.invoices.listByPeriod()`, `api.meters.getPrevious(roomId)`
**Đây là trang phức tạp nhất.** Tham chiếu: Mục 4.6 + Mục 6.1.

### PHASE 11 — Trang Công nợ
**File:** `src/pages/Debts.tsx`
**API calls:** `api.invoices.listUnpaid()`, `api.payments.create()`, `api.stats.totalDebt()`
**Tham chiếu:** Mục 4.7.

### PHASE 12 — Trang Báo cáo
**File:** `src/pages/Reports.tsx`
**API calls:** `api.stats.revenueByArea()`, `api.stats.revenueByMonth()`, `api.export.revenueExcel()`
**Tham chiếu:** Mục 4.8.

### PHASE 13 — Settings + Polish
**File:** `src/pages/Settings.tsx`
**Tham chiếu:** Mục 4.9. Giữ pattern backup/restore cũ, đổi UI.

---

## 8. Thứ tự thực hiện

```
PHASE 1 → 2 → 3 → 4    (backend hoàn chỉnh trước)
         ↓
PHASE 5                  (frontend foundation)
         ↓
PHASE 6 → 7 → 8 → 9 → 10 → 11 → 12    (từng trang, có thể song song)
         ↓
PHASE 13                 (polish cuối cùng)
```

Mỗi phase sau khi xong cần test: backend phases test bằng simple script gọi repo/service trực tiếp, frontend phases test bằng chạy `npm run dev` kiểm tra UI render đúng.
