-- ============================================================
-- PhongTroApp — Migration 002: Seed data
-- 3 khu: Khu D (23 phòng), Khu Láng (10 phòng), Khu Thâm Thiên (23 phòng)
-- Tất cả phòng status='vacant', đơn giá điện/nước = 0 (user nhập sau qua UI).
-- ============================================================

-- ========================================
-- Areas (3 khu)
-- ========================================
INSERT INTO areas (id, name, address, description) VALUES
    (1, 'Khu D',          '', 'Khu D — 23 phòng'),
    (2, 'Khu Láng',       '', 'Khu Láng — 10 phòng'),
    (3, 'Khu Thâm Thiên', '', 'Khu Thâm Thiên — 23 phòng');

-- ========================================
-- Rooms — Khu D (23 phòng, floor 1: D01-D12, floor 2: D13-D23)
-- ========================================
INSERT INTO rooms (area_id, name, floor, status) VALUES
    (1, 'D01', 1, 'vacant'),
    (1, 'D02', 1, 'vacant'),
    (1, 'D03', 1, 'vacant'),
    (1, 'D04', 1, 'vacant'),
    (1, 'D05', 1, 'vacant'),
    (1, 'D06', 1, 'vacant'),
    (1, 'D07', 1, 'vacant'),
    (1, 'D08', 1, 'vacant'),
    (1, 'D09', 1, 'vacant'),
    (1, 'D10', 1, 'vacant'),
    (1, 'D11', 1, 'vacant'),
    (1, 'D12', 1, 'vacant'),
    (1, 'D13', 2, 'vacant'),
    (1, 'D14', 2, 'vacant'),
    (1, 'D15', 2, 'vacant'),
    (1, 'D16', 2, 'vacant'),
    (1, 'D17', 2, 'vacant'),
    (1, 'D18', 2, 'vacant'),
    (1, 'D19', 2, 'vacant'),
    (1, 'D20', 2, 'vacant'),
    (1, 'D21', 2, 'vacant'),
    (1, 'D22', 2, 'vacant'),
    (1, 'D23', 2, 'vacant');

-- ========================================
-- Rooms — Khu Láng (10 phòng, tất cả floor 1)
-- ========================================
INSERT INTO rooms (area_id, name, floor, status) VALUES
    (2, 'L01', 1, 'vacant'),
    (2, 'L02', 1, 'vacant'),
    (2, 'L03', 1, 'vacant'),
    (2, 'L04', 1, 'vacant'),
    (2, 'L05', 1, 'vacant'),
    (2, 'L06', 1, 'vacant'),
    (2, 'L07', 1, 'vacant'),
    (2, 'L08', 1, 'vacant'),
    (2, 'L09', 1, 'vacant'),
    (2, 'L10', 1, 'vacant');

-- ========================================
-- Rooms — Khu Thâm Thiên (23 phòng, floor 1: TT01-TT12, floor 2: TT13-TT23)
-- ========================================
INSERT INTO rooms (area_id, name, floor, status) VALUES
    (3, 'TT01', 1, 'vacant'),
    (3, 'TT02', 1, 'vacant'),
    (3, 'TT03', 1, 'vacant'),
    (3, 'TT04', 1, 'vacant'),
    (3, 'TT05', 1, 'vacant'),
    (3, 'TT06', 1, 'vacant'),
    (3, 'TT07', 1, 'vacant'),
    (3, 'TT08', 1, 'vacant'),
    (3, 'TT09', 1, 'vacant'),
    (3, 'TT10', 1, 'vacant'),
    (3, 'TT11', 1, 'vacant'),
    (3, 'TT12', 1, 'vacant'),
    (3, 'TT13', 2, 'vacant'),
    (3, 'TT14', 2, 'vacant'),
    (3, 'TT15', 2, 'vacant'),
    (3, 'TT16', 2, 'vacant'),
    (3, 'TT17', 2, 'vacant'),
    (3, 'TT18', 2, 'vacant'),
    (3, 'TT19', 2, 'vacant'),
    (3, 'TT20', 2, 'vacant'),
    (3, 'TT21', 2, 'vacant'),
    (3, 'TT22', 2, 'vacant'),
    (3, 'TT23', 2, 'vacant');

-- ========================================
-- Settings — landlord info (key-value, để rỗng, user nhập qua trang Settings)
-- ========================================
INSERT INTO settings (key, value) VALUES
    ('landlord_name',    ''),
    ('landlord_cccd',    ''),
    ('landlord_phone',   ''),
    ('landlord_address', ''),
    ('default_electric_price', '0'),
    ('default_water_price',    '0');
