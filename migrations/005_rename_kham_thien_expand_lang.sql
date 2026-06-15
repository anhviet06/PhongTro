-- ============================================================
-- PhongTroApp — Migration 005
-- 1. Đổi tên "Khu Thâm Thiên" → "Khu Khâm Thiên" (đúng chính tả)
-- 2. Mở rộng Khu Láng: thêm 13 phòng (L11-L23) → tổng 23 phòng
-- ============================================================

-- 1. Rename area
UPDATE areas
SET name = 'Khu Khâm Thiên'
WHERE name = 'Khu Thâm Thiên';

-- Cập nhật description nếu vẫn dùng "Thâm Thiên"
UPDATE areas
SET description = REPLACE(description, 'Thâm Thiên', 'Khâm Thiên')
WHERE description LIKE '%Thâm Thiên%';

-- 2. Thêm 13 phòng L11-L23 vào Khu Láng (status='vacant', giá lấy từ phòng đã có)
-- Floor 2: L11-L23 (13 phòng)
INSERT INTO rooms (area_id, name, floor, price, electric_unit_price, water_unit_price, max_people, status)
SELECT
    a.id,
    room_name,
    2,                                                            -- floor 2
    COALESCE((SELECT MAX(price) FROM rooms WHERE area_id = a.id), 0),
    a.default_electric_price,
    a.default_water_price,
    4,
    'vacant'
FROM areas a
CROSS JOIN (
    SELECT 'L11' AS room_name UNION ALL SELECT 'L12' UNION ALL SELECT 'L13'
    UNION ALL SELECT 'L14' UNION ALL SELECT 'L15' UNION ALL SELECT 'L16'
    UNION ALL SELECT 'L17' UNION ALL SELECT 'L18' UNION ALL SELECT 'L19'
    UNION ALL SELECT 'L20' UNION ALL SELECT 'L21' UNION ALL SELECT 'L22'
    UNION ALL SELECT 'L23'
) AS new_rooms
WHERE a.name = 'Khu Láng'
  AND NOT EXISTS (
      SELECT 1 FROM rooms r WHERE r.area_id = a.id AND r.name = new_rooms.room_name
  );
