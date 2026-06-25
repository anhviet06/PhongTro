-- ============================================================
-- PhongTroApp — Migration 011: Price templates table
-- ============================================================

CREATE TABLE IF NOT EXISTS price_templates (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    price               REAL NOT NULL DEFAULT 0,
    electric_unit_price REAL NOT NULL DEFAULT 0,
    water_unit_price    REAL NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Thêm cột price_template_id vào rooms
ALTER TABLE rooms ADD COLUMN price_template_id INTEGER REFERENCES price_templates(id) ON DELETE SET NULL;

-- Chèn dữ liệu mẫu cho bảng giá
INSERT INTO price_templates (name, price, electric_unit_price, water_unit_price) VALUES
('Bảng giá Phổ thông', 2000000, 3500, 25000),
('Bảng giá Cao cấp', 3500000, 4000, 30000),
('Bảng giá Cơ bản', 0, 3500, 25000);
