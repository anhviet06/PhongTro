# PhongTroApp

App desktop quản lý phòng trọ dành cho **chủ trọ** (offline, single user). Quản lý nhiều khu trọ, phòng, khách thuê, hợp đồng, hóa đơn, công nợ, báo cáo doanh thu.

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop shell | Electron 30 |
| Build | Vite 5 + vite-plugin-electron |
| UI | React 18 + TypeScript + Tailwind 4 |
| State | Zustand |
| Routing | react-router-dom (HashRouter) |
| DB | better-sqlite3 (WAL mode, foreign keys ON) |
| Excel | exceljs |
| Contract export | docx + pdfkit |
| Icons | lucide-react |
| Update | electron-updater + GitHub Releases |
| Installer | electron-builder (NSIS Windows) |

## Yêu cầu môi trường

- Node.js v20+
- npm v10+
- Windows (target chính), macOS / Linux (target phụ)

## Lệnh thường dùng

```bash
npm install                       # cài đặt dependencies
npx electron-rebuild -f -w better-sqlite3   # rebuild native module nếu cần
npm run dev                       # chạy app dev (Vite + Electron, hot reload)
npm run build:win                 # build installer Windows NSIS
make clean                        # dọn dist, dist-electron, release
```

## Cấu trúc thư mục

```
electron/             # Electron main process
  ├── main.ts         # Entry, IPC handlers, app lifecycle
  ├── preload.ts      # Bridge: expose window.api
  ├── database/       # SQLite init, migrations, repositories
  └── services/       # Business logic (billing, contract-gen, excel)

src/                  # React renderer
  ├── App.tsx         # Router
  ├── pages/          # 8 trang (Dashboard, Rooms, Tenants, ...)
  ├── components/     # UI components
  ├── stores/         # Zustand stores
  └── shared/         # Types dùng chung 2 process

migrations/           # SQL migrations (chạy theo thứ tự tên)
public/               # favicon, logo
```

## Tài liệu

- [PhongTroApp-Spec.md](./PhongTroApp-Spec.md) — Spec chi tiết, single source of truth
- [PROGRESS.md](./PROGRESS.md) — Tiến độ triển khai từng phase
