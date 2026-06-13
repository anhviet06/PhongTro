-- ============================================================
-- PhongTroApp — Migration 001: Initial schema
-- Tham chiếu: PhongTroApp-Spec.md Mục 5
-- ============================================================

-- ========================================
-- Khu trọ
-- ========================================
CREATE TABLE IF NOT EXISTS areas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,                          -- "Khu D"
    address     TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',               -- ghi chú chất lượng
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========================================
-- Phòng
-- ========================================
CREATE TABLE IF NOT EXISTS rooms (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id             INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,                  -- "D01"
    floor               INTEGER NOT NULL DEFAULT 1,
    area_m2             REAL NOT NULL DEFAULT 0,        -- diện tích m²
    price               REAL NOT NULL DEFAULT 0,        -- tiền phòng / tháng
    electric_unit_price REAL NOT NULL DEFAULT 0,        -- đơn giá điện / kWh
    water_unit_price    REAL NOT NULL DEFAULT 0,        -- đơn giá nước / m³
    max_people          INTEGER NOT NULL DEFAULT 4,
    status              TEXT NOT NULL DEFAULT 'vacant'
        CHECK (status IN ('vacant', 'occupied', 'debt')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rooms_area ON rooms(area_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- ========================================
-- Dịch vụ chung
-- ========================================
CREATE TABLE IF NOT EXISTS services (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,                          -- "Wifi", "Rác", "Gửi xe"
    unit_price  REAL NOT NULL DEFAULT 0,                -- đơn giá
    per_person  INTEGER NOT NULL DEFAULT 1,             -- 1 = theo đầu người, 0 = cố định theo phòng
    icon        TEXT NOT NULL DEFAULT '',               -- tên icon lucide (wifi, trash2, car...)
    is_active   INTEGER NOT NULL DEFAULT 1,             -- 1 = đang dùng, 0 = ẩn
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========================================
-- Khách thuê
-- ========================================
CREATE TABLE IF NOT EXISTS tenants (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id           INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    full_name         TEXT NOT NULL,
    cccd              TEXT NOT NULL DEFAULT '',         -- căn cước công dân
    dob               TEXT NOT NULL DEFAULT '',         -- ngày sinh (YYYY-MM-DD)
    phone             TEXT NOT NULL DEFAULT '',
    permanent_address TEXT NOT NULL DEFAULT '',         -- thường trú
    is_primary        INTEGER NOT NULL DEFAULT 0,       -- 1 = người đại diện
    move_in_date      TEXT NOT NULL DEFAULT '',         -- ngày vào
    move_out_date     TEXT NOT NULL DEFAULT '',         -- ngày ra (rỗng = đang ở)
    deposit           REAL NOT NULL DEFAULT 0,          -- tiền cọc cá nhân
    note              TEXT NOT NULL DEFAULT '',
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tenants_room ON tenants(room_id);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(room_id, move_out_date);

-- ========================================
-- Xe máy / xe đạp / ô tô
-- ========================================
CREATE TABLE IF NOT EXISTS vehicles (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plate_number  TEXT NOT NULL,                        -- biển số
    vehicle_type  TEXT NOT NULL DEFAULT 'motorbike'     -- motorbike | bicycle | car
        CHECK (vehicle_type IN ('motorbike', 'bicycle', 'car')),
    note          TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON vehicles(tenant_id);

-- ========================================
-- Hợp đồng
-- ========================================
CREATE TABLE IF NOT EXISTS contracts (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id             INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    primary_tenant_id   INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    deposit             REAL NOT NULL DEFAULT 0,
    rent_price          REAL NOT NULL DEFAULT 0,        -- giá thuê ghi trong HĐ
    start_date          TEXT NOT NULL,                  -- YYYY-MM-DD
    end_date            TEXT NOT NULL DEFAULT '',       -- YYYY-MM-DD, rỗng = vô thời hạn
    terms               TEXT NOT NULL DEFAULT '',       -- điều khoản bổ sung
    landlord_name       TEXT NOT NULL DEFAULT '',       -- Bên A snapshot
    landlord_cccd       TEXT NOT NULL DEFAULT '',       -- Bên A snapshot
    landlord_phone      TEXT NOT NULL DEFAULT '',
    landlord_address    TEXT NOT NULL DEFAULT '',
    status              TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'terminated')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contracts_room ON contracts(room_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

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
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(room_id, period)                              -- mỗi phòng 1 record/tháng
);
CREATE INDEX IF NOT EXISTS idx_meters_room_period ON meter_readings(room_id, period);

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
    paid_amount     REAL NOT NULL DEFAULT 0,             -- tổng đã thu (cập nhật khi có payment)
    status          TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (status IN ('unpaid', 'paid', 'partial')),
    note            TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(room_id, period)
);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ========================================
-- Chi tiết dịch vụ trong hóa đơn
-- ========================================
CREATE TABLE IF NOT EXISTS invoice_services (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id   INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_id   INTEGER REFERENCES services(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,                          -- snapshot lúc tạo
    quantity     INTEGER NOT NULL DEFAULT 1,             -- số người hoặc 1
    unit_price   REAL NOT NULL DEFAULT 0,                -- snapshot lúc tạo
    amount       REAL NOT NULL DEFAULT 0                 -- quantity × unit_price
);
CREATE INDEX IF NOT EXISTS idx_invoice_services_invoice ON invoice_services(invoice_id);

-- ========================================
-- Thanh toán
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount      REAL NOT NULL DEFAULT 0,
    method      TEXT NOT NULL DEFAULT 'cash'
        CHECK (method IN ('cash', 'transfer')),
    paid_at     TEXT NOT NULL DEFAULT (datetime('now')),
    note        TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- ========================================
-- Settings (key-value)
-- Dùng cho: landlord info, default electric/water price, app config...
-- ========================================
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
