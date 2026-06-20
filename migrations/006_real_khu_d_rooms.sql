-- ============================================================
-- PhongTroApp — Migration 006: đổi cấu trúc phòng Khu D theo thực tế
--
-- Trước (002_seed.sql): Khu D có 23 phòng demo D01-D23.
-- Sau migration này: Khu D có 21 phòng thực tế theo danh sách chủ trọ Đê La Thành.
--
-- Phòng được đánh số 3-digit theo tầng (tầng + index):
--   Tầng 2: 201, 202, 203 (3 phòng)
--   Tầng 3: 301, 302, 303, 304 (4 phòng)
--   Tầng 4: 401, 402, 403, 404 (4 phòng)
--   Tầng 5: 501, 502 (2 phòng)
--   Tầng 6: 601, 602, 603, 604 (4 phòng)
--   Tầng 7: 701, 702, 703, 704 (4 phòng)
-- Tổng: 21 phòng.
--
-- Khu Láng và Khu Khâm Thiên giữ nguyên cấu trúc cũ.
--
-- An toàn:
--   - DELETE D01-D23: ON DELETE CASCADE sẽ tự xóa contracts/meter_readings/invoices liên quan
--     (tenants.room_id ON DELETE SET NULL — tenant không bị mất, chỉ unlink khỏi phòng).
--   - INSERT idempotent qua NOT EXISTS check theo tên phòng — chạy lại không nhân đôi.
-- ============================================================

-- 1. Xoá các phòng demo D01-D23 (chỉ trong Khu D, chỉ phòng có tiền tố "D")
DELETE FROM rooms
WHERE area_id = (SELECT id FROM areas WHERE name = 'Khu D')
  AND name LIKE 'D%';

-- 2. Insert 21 phòng thực tế cho Khu D
INSERT INTO rooms (area_id, name, floor, price, electric_unit_price, water_unit_price, max_people, status)
SELECT
    a.id,
    t.room_name,
    t.fl,
    0,                                              -- price: user nhập sau qua UI
    COALESCE(a.default_electric_price, 0),
    COALESCE(a.default_water_price, 0),
    4,                                              -- max_people default
    'vacant'
FROM areas a
CROSS JOIN (
    SELECT '201' AS room_name, 2 AS fl UNION ALL
    SELECT '202', 2 UNION ALL
    SELECT '203', 2 UNION ALL
    SELECT '301', 3 UNION ALL
    SELECT '302', 3 UNION ALL
    SELECT '303', 3 UNION ALL
    SELECT '304', 3 UNION ALL
    SELECT '401', 4 UNION ALL
    SELECT '402', 4 UNION ALL
    SELECT '403', 4 UNION ALL
    SELECT '404', 4 UNION ALL
    SELECT '501', 5 UNION ALL
    SELECT '502', 5 UNION ALL
    SELECT '601', 6 UNION ALL
    SELECT '602', 6 UNION ALL
    SELECT '603', 6 UNION ALL
    SELECT '604', 6 UNION ALL
    SELECT '701', 7 UNION ALL
    SELECT '702', 7 UNION ALL
    SELECT '703', 7 UNION ALL
    SELECT '704', 7
) t
WHERE a.name = 'Khu D'
  AND NOT EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.area_id = a.id AND r.name = t.room_name
  );
