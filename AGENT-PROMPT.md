# Prompt giao việc cho agent mới — PhongTroApp

> Copy nguyên đoạn dưới đây (từ dòng `---` trở xuống) paste vào agent mới.

---

Bạn là agent tiếp nhận dự án **PhongTroApp** — app desktop Electron quản lý phòng trọ. Project đã có spec + kế hoạch chi tiết do agent trước viết. **Việc của bạn là đọc kỹ tài liệu rồi triển khai tuần tự các phase còn lại.**

## Bước 1 — Đọc bắt buộc trước khi làm bất kỳ việc gì

Đọc theo thứ tự sau, **không skip**:

1. **`D:\PhongTroApp\PhongTroApp-Spec.md`** — Spec đầy đủ (tech stack, schema, UI mockup từng trang, business rules). Đây là single source of truth.
2. **`D:\PhongTroApp\PROGRESS.md`** — Kế hoạch 14 phases. Mỗi phase đã được vạch sẵn: mục tiêu, files cần tạo, API, cách verify, user cần OK gì.
3. **`D:\PhongTroApp\README.md`** — Tổng quan + lệnh chạy.
4. **`D:\OmniWare\`** — Skeleton Electron gốc dùng làm reference cho các pattern (database init, IPC, backup/restore, electron-builder config). KHÔNG sửa folder này, chỉ đọc.

Sau khi đọc xong, tóm tắt lại với user trong 5-7 dòng: project là gì, đang ở phase nào, phase tiếp theo cần làm gì, có thắc mắc gì không. **KHÔNG bắt đầu code ngay** — chờ user xác nhận đã đọc đúng.

## Bước 2 — Quy tắc làm việc

### Tuân thủ tuyệt đối

- **Đọc PROGRESS.md trước mỗi phase** — section của phase đó liệt kê chính xác files cần tạo, API gọi, cách verify. Bám sát kế hoạch, không tự ý đổi.
- **Spec PhongTroApp-Spec.md là chân lý** — nếu PROGRESS.md mâu thuẫn với spec, theo spec (báo user biết để cập nhật PROGRESS.md).
- **Mỗi phase xong → cập nhật PROGRESS.md** — đánh dấu ✅, liệt kê files thực tế đã tạo, ghi các thay đổi so với plan ban đầu (nếu có).
- **Báo cáo user sau mỗi phase, chờ OK trước khi sang phase tiếp theo.** Đây là yêu cầu của user. Không gộp nhiều phase trong 1 lượt.

### Các quyết định kỹ thuật đã chốt (không cần hỏi lại)

- **App identity:** name `PhongTroApp`, AppID `com.phongtro.app`, GitHub repo placeholder `NQHxDev/PhongTroApp`
- **Tech stack:** Electron 30 + Vite 5 + React 18 + TS + Tailwind v4 + better-sqlite3 + Zustand + react-router-dom (HashRouter) + lucide-react + recharts + exceljs + docx + pdfkit + electron-updater
- **Setup pattern:** Project dựa trên `D:\OmniWare\` skeleton. Đã copy + đổi configs ở Phase 0. KHÔNG tự ý đổi pattern.
- **Landlord info (Bên A) lưu trong bảng `settings` key-value SQLite** — KHÔNG dùng file settings.json riêng.
- **Contract export hỗ trợ CẢ PDF (pdfkit) + Word (docx)** — modal cho user chọn format khi export.
- **Migration pattern:** folder `migrations/` chứa các file `001_*.sql`, `002_*.sql`... Đã có migration runner ở `electron/database/migrate.ts`. Phase sau cần migration mới thì tạo file `003_*.sql`, `004_*.sql`...
- **3 khu đã seed:** Khu D (23 phòng D01–D23), Khu Láng (10 phòng L01–L10), Khu Thâm Thiên (23 phòng TT01–TT23). Tất cả status='vacant'.

### Style code (giữ nhất quán với Phase 0+1 đã tạo)

- TypeScript strict mode
- Prettier: 3-space indent, single quote, semi, trailingComma es5, printWidth 100
- ESLint: theo `.eslintrc.cjs`
- Repository pattern: export functions thuần (KHÔNG class). Mỗi repo 1 file.
- Comment tiếng Việt OK cho business logic. Code identifier giữ tiếng Anh.
- File header: 1 đoạn comment ngắn mô tả vai trò file (như các file đã có ở Phase 0+1).

### Ngôn ngữ giao tiếp với user

- Tiếng Việt, **ngắn gọn trực tiếp**. User không thích văn dài dòng.
- Khi cần lựa chọn kỹ thuật, đưa khuyến nghị + lý do ngắn, không liệt kê tất cả options.
- Không lặp lại spec — user đã viết rồi, không cần Claude paste lại.

## Bước 3 — Tình trạng hiện tại (tính đến ngày bàn giao)

**Đã xong:**
- Phase 0: Setup skeleton (26 files config + folder structure)
- Phase 1: DB Schema + Migration runner (`migrations/001_init.sql` + `002_seed.sql` + `electron/database/index.ts` + `migrate.ts` + minimal `main.ts` + `preload.ts` + placeholder React)

**Pending — user cần làm thủ công trước khi agent test được:**
1. Copy 2 file binary từ OmniWare:
   - `D:\OmniWare\public\favicon.ico` → `D:\PhongTroApp\public\favicon.ico`
   - `D:\OmniWare\public\Logo.png` → `D:\PhongTroApp\public\Logo.png`
2. Chạy:
   ```
   cd D:\PhongTroApp
   npm install
   npx electron-rebuild -f -w better-sqlite3
   ```

**Câu hỏi user còn nợ trước khi sang Phase 2 (đọc cuối section Phase 1 trong PROGRESS.md):**
- App `npm run dev` chạy OK chưa?
- Schema 13 tables + seed 56 phòng đúng chưa?
- Format tên phòng (D01–D23 / L01–L10 / TT01–TT23) giữ hay đổi sang format khác (vd P.101)?

Hỏi user 3 câu trên trước khi bắt đầu Phase 2.

## Bước 4 — Sau khi user OK Phase 1, bắt đầu Phase 2

Đọc lại section **"Phase 2 — Repositories (data layer)"** trong `PROGRESS.md`, làm theo đúng:

- Tạo `src/shared/types.ts` (interfaces dùng chung 2 process)
- Tạo 10 file repo trong `electron/database/repositories/`: areas, rooms, services, tenants, vehicles, contracts, meters, invoices, payments, settings, stats
- Verify bằng cách compile TS không lỗi + viết script smoke test

Khi xong:
1. Cập nhật section Phase 2 trong `PROGRESS.md` (✅, files thực tế đã tạo)
2. Báo user, đặt câu hỏi trong checklist "User cần OK"
3. Chờ OK rồi sang Phase 3

## Cuối cùng

Nếu lúc làm gặp tình huống không có trong spec/PROGRESS.md → hỏi user, không tự quyết. Nếu phát hiện lỗi trong spec/PROGRESS.md → báo user, đề xuất sửa.

Bắt đầu bằng việc đọc 4 file ở Bước 1, rồi tóm tắt cho user.
