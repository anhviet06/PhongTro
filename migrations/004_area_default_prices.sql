-- ============================================================
-- PhongTroApp — Migration 004: Default prices per area
--
-- Mỗi khu có đơn giá điện/nước riêng vì chất lượng + nhà cung cấp khác nhau.
-- Khi tạo phòng mới ở khu nào, phòng sẽ tự dùng đơn giá khu đó (form Add Room
-- pre-fill từ area.default_*). Phòng đặc biệt có thể override ở room level.
-- ============================================================

ALTER TABLE areas ADD COLUMN default_electric_price REAL NOT NULL DEFAULT 0;
ALTER TABLE areas ADD COLUMN default_water_price    REAL NOT NULL DEFAULT 0;

-- Backfill từ giá phòng hiện có (lấy max của các phòng trong khu — phổ biến nhất)
-- Nếu khu chưa có phòng nào set giá → giữ default = 0.
UPDATE areas
SET default_electric_price = COALESCE(
    (
        SELECT MAX(electric_unit_price) FROM rooms
        WHERE rooms.area_id = areas.id AND electric_unit_price > 0
    ),
    0
);

UPDATE areas
SET default_water_price = COALESCE(
    (
        SELECT MAX(water_unit_price) FROM rooms
        WHERE rooms.area_id = areas.id AND water_unit_price > 0
    ),
    0
);

-- Bỏ 2 settings cũ (chỉ dùng cho landlord + global config), giữ landlord_*
DELETE FROM settings WHERE key IN ('default_electric_price', 'default_water_price');
