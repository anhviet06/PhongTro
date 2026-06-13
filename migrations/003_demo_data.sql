-- ============================================================
-- PhongTroApp — Migration 003: Demo data for testing
--
-- Mục đích:
--   - Cập nhật giá thuê + đơn giá điện/nước cho all rooms (chỉ phòng giá=0 — không đè user data)
--   - Cập nhật landlord info trong settings (lần đầu)
--   - Insert 5 dịch vụ chung (Wifi, Rác, Xe máy, Vệ sinh, Internet)
--   - Set 30 rooms 'occupied' + tenants + contracts + vehicles
--   - Tạo meter readings cho kỳ trước (2026-05) → test billing auto-fill chỉ số cũ
--   - Tạo invoices kỳ 2026-05 ở nhiều trạng thái: paid / partial / unpaid
--   - Tạo payments tương ứng
--
-- Phân bố 30 phòng đã thuê:
--   - Khu D (area_id=1):          D01-D13 → 13 phòng
--   - Khu Láng (area_id=2):       L01-L06 → 6 phòng
--   - Khu Thâm Thiên (area_id=3): TT01-TT11 → 11 phòng
--   Tổng: 30 occupied / 26 vacant
-- ============================================================

-- ========================================
-- 1. Cập nhật giá thuê + đơn giá điện/nước (chỉ phòng giá=0)
-- ========================================
UPDATE rooms SET
    price = 2000000, electric_unit_price = 3500, water_unit_price = 25000, max_people = 3
WHERE area_id = 1 AND name IN ('D01','D02','D03','D04','D05','D06','D07','D08') AND price = 0;

UPDATE rooms SET
    price = 2500000, electric_unit_price = 3500, water_unit_price = 25000, max_people = 4
WHERE area_id = 1 AND name IN ('D09','D10','D11','D12') AND price = 0;

UPDATE rooms SET
    price = 2200000, electric_unit_price = 3500, water_unit_price = 25000, max_people = 3
WHERE area_id = 1 AND name IN ('D13','D14','D15','D16','D17','D18','D19','D20','D21','D22','D23')
  AND price = 0;

UPDATE rooms SET
    price = 2800000, electric_unit_price = 3500, water_unit_price = 25000, max_people = 3
WHERE area_id = 2 AND name IN ('L01','L02','L03','L04','L05') AND price = 0;

UPDATE rooms SET
    price = 3200000, electric_unit_price = 3500, water_unit_price = 25000, max_people = 4
WHERE area_id = 2 AND name IN ('L06','L07','L08','L09','L10') AND price = 0;

UPDATE rooms SET
    price = 1800000, electric_unit_price = 3500, water_unit_price = 25000, max_people = 2
WHERE area_id = 3 AND name IN ('TT01','TT02','TT03','TT04','TT05','TT06','TT07','TT08','TT09','TT10','TT11','TT12')
  AND price = 0;

UPDATE rooms SET
    price = 2000000, electric_unit_price = 3500, water_unit_price = 25000, max_people = 3
WHERE area_id = 3 AND name LIKE 'TT1%' AND name NOT IN ('TT10','TT11','TT12') AND price = 0;

UPDATE rooms SET
    price = 2000000, electric_unit_price = 3500, water_unit_price = 25000, max_people = 3
WHERE area_id = 3 AND name LIKE 'TT2%' AND price = 0;

-- ========================================
-- 2. Landlord info (settings) — chỉ ghi đè nếu rỗng
-- ========================================
UPDATE settings SET value = 'Nguyễn Văn Thành'                              WHERE key = 'landlord_name'    AND value = '';
UPDATE settings SET value = '001083012345'                                   WHERE key = 'landlord_cccd'    AND value = '';
UPDATE settings SET value = '0912345678'                                     WHERE key = 'landlord_phone'   AND value = '';
UPDATE settings SET value = 'Số 12 ngõ 45 Khương Trung, Thanh Xuân, Hà Nội' WHERE key = 'landlord_address' AND value = '';
UPDATE settings SET value = '3500'                                           WHERE key = 'default_electric_price' AND value = '0';
UPDATE settings SET value = '25000'                                          WHERE key = 'default_water_price'    AND value = '0';

-- ========================================
-- 3. Services (5 dịch vụ chung)
-- ========================================
INSERT INTO services (name, unit_price, per_person, icon, is_active) VALUES
    ('Wifi',          100000, 0, 'wifi',    1),   -- 100k/phòng
    ('Rác',           15000,  1, 'trash2',  1),   -- 15k/người
    ('Xe máy',        100000, 0, 'car',     1),   -- 100k/phòng (nếu có xe)
    ('Vệ sinh chung', 20000,  1, 'sparkles',1),   -- 20k/người
    ('Bảo vệ',        30000,  0, 'shield',  1);   -- 30k/phòng

-- ========================================
-- 4. Khách thuê (30 primary tenants, 1 per room)
-- room_id chính xác sẽ được tham chiếu qua subquery để tránh hardcode id
-- ========================================

-- Khu D: D01-D13
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date, deposit) VALUES
    ((SELECT id FROM rooms WHERE name='D01' AND area_id=1), 'Nguyễn Văn An',     '001094012345', '1994-03-15', '0912345001', 'Số 23 Phố Huế, Hai Bà Trưng, Hà Nội',                  1, '2025-09-01', 4000000),
    ((SELECT id FROM rooms WHERE name='D02' AND area_id=1), 'Trần Thị Bình',     '038095023456', '1995-07-22', '0987345002', 'Thôn Đại An, Vĩnh Tường, Vĩnh Phúc',                    1, '2025-10-01', 4000000),
    ((SELECT id FROM rooms WHERE name='D03' AND area_id=1), 'Lê Hoàng Cường',    '022096034567', '1996-01-08', '0904345003', 'Phường Nông Tiến, TP Tuyên Quang, Tuyên Quang',         1, '2025-11-15', 4000000),
    ((SELECT id FROM rooms WHERE name='D04' AND area_id=1), 'Phạm Minh Đức',     '034090045678', '1990-11-30', '0976345004', 'Xã Thái Thịnh, Đông Hưng, Thái Bình',                   1, '2025-08-15', 4000000),
    ((SELECT id FROM rooms WHERE name='D05' AND area_id=1), 'Hoàng Thị Hằng',    '040097056789', '1997-05-19', '0938345005', 'Phường Hùng Vương, TP Phúc Yên, Vĩnh Phúc',             1, '2025-12-01', 4000000),
    ((SELECT id FROM rooms WHERE name='D06' AND area_id=1), 'Đỗ Văn Phong',      '027092067890', '1992-09-04', '0965345006', 'Xã Hồng Phong, An Dương, Hải Phòng',                    1, '2026-01-10', 4000000),
    ((SELECT id FROM rooms WHERE name='D07' AND area_id=1), 'Bùi Thị Giang',     '019093078901', '1993-12-25', '0349345007', 'Phường Trần Phú, TP Móng Cái, Quảng Ninh',              1, '2026-02-01', 4000000),
    ((SELECT id FROM rooms WHERE name='D08' AND area_id=1), 'Vũ Quang Hải',      '037088089012', '1988-06-11', '0823345008', 'Xã Diễn Trung, Diễn Châu, Nghệ An',                     1, '2025-07-01', 4000000),
    ((SELECT id FROM rooms WHERE name='D09' AND area_id=1), 'Đặng Văn Khoa',     '001091090123', '1991-04-17', '0915345009', 'Số 78 Cầu Giấy, Cầu Giấy, Hà Nội',                      1, '2025-06-15', 5000000),
    ((SELECT id FROM rooms WHERE name='D10' AND area_id=1), 'Ngô Thị Lan',       '030094012340', '1994-08-29', '0945345010', 'Phường Phú Lương, Hà Đông, Hà Nội',                     1, '2025-09-20', 5000000),
    ((SELECT id FROM rooms WHERE name='D11' AND area_id=1), 'Mai Văn Minh',      '036089023401', '1989-02-14', '0978345011', 'Xã Hoàng Đồng, TP Lạng Sơn, Lạng Sơn',                  1, '2025-10-05', 5000000),
    ((SELECT id FROM rooms WHERE name='D12' AND area_id=1), 'Lý Hoàng Nam',      '025095034012', '1995-10-07', '0911345012', 'Phường Cẩm Phú, TP Cẩm Phả, Quảng Ninh',                1, '2025-11-01', 5000000),
    ((SELECT id FROM rooms WHERE name='D13' AND area_id=1), 'Đinh Thị Oanh',     '042096045123', '1996-12-03', '0967345013', 'Xã Diễn Lâm, Diễn Châu, Nghệ An',                       1, '2026-03-01', 4400000);

-- Khu Láng: L01-L06
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date, deposit) VALUES
    ((SELECT id FROM rooms WHERE name='L01' AND area_id=2), 'Cao Văn Phú',       '031090056234', '1990-07-18', '0986345014', 'Xã Đại Đồng, Tứ Kỳ, Hải Dương',                        1, '2025-05-15', 5600000),
    ((SELECT id FROM rooms WHERE name='L02' AND area_id=2), 'Đoàn Thị Quỳnh',    '001092067345', '1992-03-21', '0913345015', 'Số 145 Tây Sơn, Đống Đa, Hà Nội',                       1, '2025-07-10', 5600000),
    ((SELECT id FROM rooms WHERE name='L03' AND area_id=2), 'Phan Hoàng Phú',    '028093078456', '1993-09-12', '0944345016', 'Phường Trần Hưng Đạo, TP Hạ Long, Quảng Ninh',          1, '2025-08-25', 5600000),
    ((SELECT id FROM rooms WHERE name='L04' AND area_id=2), 'Trịnh Văn Sơn',     '033091089567', '1991-11-28', '0976345017', 'Xã Đông Phương, Đông Hưng, Thái Bình',                  1, '2025-09-12', 5600000),
    ((SELECT id FROM rooms WHERE name='L05' AND area_id=2), 'Hà Thị Thu',        '038094090678', '1994-06-06', '0928345018', 'Phường Quang Trung, TP Vĩnh Yên, Vĩnh Phúc',            1, '2025-10-20', 5600000),
    ((SELECT id FROM rooms WHERE name='L06' AND area_id=2), 'Lưu Văn Uy',        '024088012789', '1988-01-15', '0982345019', 'Xã Mỹ Đình 2, Nam Từ Liêm, Hà Nội',                     1, '2025-04-01', 6400000);

-- Khu Thâm Thiên: TT01-TT11
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date, deposit) VALUES
    ((SELECT id FROM rooms WHERE name='TT01' AND area_id=3), 'Đào Thị Vân',      '029095023890', '1995-04-08', '0918345020', 'Xã Thanh Long, Hồng Bàng, Hải Phòng',                    1, '2025-06-01', 3600000),
    ((SELECT id FROM rooms WHERE name='TT02' AND area_id=3), 'Nguyễn Văn Xuân',  '040093034901', '1993-12-17', '0938345021', 'Phường Liễu Giai, Ba Đình, Hà Nội',                      1, '2025-08-01', 3600000),
    ((SELECT id FROM rooms WHERE name='TT03' AND area_id=3), 'Trần Thị Yến',     '017096045012', '1996-08-25', '0976345022', 'Xã Quảng Phú, TP Thanh Hoá, Thanh Hoá',                  1, '2025-09-15', 3600000),
    ((SELECT id FROM rooms WHERE name='TT04' AND area_id=3), 'Lê Văn Tâm',       '015089056123', '1989-05-11', '0911345023', 'Phường Quang Hanh, TP Cẩm Phả, Quảng Ninh',              1, '2025-07-20', 3600000),
    ((SELECT id FROM rooms WHERE name='TT05' AND area_id=3), 'Phạm Thị Mai',     '008094067234', '1994-02-28', '0987345024', 'Xã Yên Đức, Đông Triều, Quảng Ninh',                     1, '2025-10-01', 3600000),
    ((SELECT id FROM rooms WHERE name='TT06' AND area_id=3), 'Hoàng Văn Bảo',    '032091078345', '1991-10-04', '0945345025', 'Phường Nguyễn Trãi, TP Hà Giang, Hà Giang',              1, '2025-11-10', 3600000),
    ((SELECT id FROM rooms WHERE name='TT07' AND area_id=3), 'Đỗ Thị Chi',       '021097089456', '1997-07-15', '0978345026', 'Xã Tân Tiến, Văn Giang, Hưng Yên',                       1, '2026-01-05', 3600000),
    ((SELECT id FROM rooms WHERE name='TT08' AND area_id=3), 'Bùi Văn Dũng',     '009090090567', '1990-09-22', '0915345027', 'Phường Đồng Tâm, TP Yên Bái, Yên Bái',                   1, '2025-12-15', 3600000),
    ((SELECT id FROM rooms WHERE name='TT09' AND area_id=3), 'Vũ Thị Hà',        '035094012678', '1994-11-09', '0913345028', 'Xã Đông Quang, Ba Vì, Hà Nội',                           1, '2026-02-20', 3600000),
    ((SELECT id FROM rooms WHERE name='TT10' AND area_id=3), 'Đặng Văn Hiếu',    '018092023789', '1992-03-31', '0944345029', 'Phường Cẩm Tây, TP Cẩm Phả, Quảng Ninh',                 1, '2025-08-10', 3600000),
    ((SELECT id FROM rooms WHERE name='TT11' AND area_id=3), 'Ngô Thị Hương',    '041095034890', '1995-06-14', '0967345030', 'Xã Trung Sơn, Việt Yên, Bắc Giang',                      1, '2025-09-01', 3600000);

-- ========================================
-- 5. Secondary tenants (3 phòng có thêm 1 người ở chung)
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date, deposit) VALUES
    ((SELECT id FROM rooms WHERE name='D09' AND area_id=1), 'Trần Văn Tài',  '001093098234', '1993-08-12', '0915345101', 'Số 78 Cầu Giấy, Cầu Giấy, Hà Nội',         0, '2025-06-15', 0),
    ((SELECT id FROM rooms WHERE name='D10' AND area_id=1), 'Lê Thị Hạnh',   '030094019345', '1994-09-30', '0945345102', 'Phường Phú Lương, Hà Đông, Hà Nội',        0, '2025-09-20', 0),
    ((SELECT id FROM rooms WHERE name='L06' AND area_id=2), 'Phạm Văn Tùng', '024089023567', '1989-04-22', '0982345103', 'Xã Mỹ Đình 2, Nam Từ Liêm, Hà Nội',        0, '2025-04-01', 0);

-- ========================================
-- 6. Vehicles (20 tenants có xe máy)
-- ========================================
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type) VALUES
    ((SELECT id FROM tenants WHERE full_name='Nguyễn Văn An'    LIMIT 1), '29-H1 234.56', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Trần Thị Bình'    LIMIT 1), '88-B2 145.78', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Lê Hoàng Cường'   LIMIT 1), '22-N1 356.90', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Phạm Minh Đức'    LIMIT 1), '17-K3 478.12', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Hoàng Thị Hằng'   LIMIT 1), '88-L1 589.34', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Vũ Quang Hải'     LIMIT 1), '37-G2 691.56', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Đặng Văn Khoa'    LIMIT 1), '29-P5 712.78', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Trần Văn Tài'     LIMIT 1), '29-Y2 823.90', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Ngô Thị Lan'      LIMIT 1), '29-V4 934.12', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Lê Thị Hạnh'      LIMIT 1), '29-T7 045.34', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Mai Văn Minh'     LIMIT 1), '12-B1 156.78', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Lý Hoàng Nam'     LIMIT 1), '14-M3 267.90', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Cao Văn Phú'      LIMIT 1), '34-A2 378.12', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Đoàn Thị Quỳnh'   LIMIT 1), '29-K9 489.34', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Hà Thị Thu'       LIMIT 1), '88-P3 590.56', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Lưu Văn Uy'       LIMIT 1), '29-R1 601.78', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Phạm Văn Tùng'    LIMIT 1), '29-S2 712.90', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Nguyễn Văn Xuân'  LIMIT 1), '29-D6 823.12', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Hoàng Văn Bảo'    LIMIT 1), '23-N1 934.34', 'motorbike'),
    ((SELECT id FROM tenants WHERE full_name='Bùi Văn Dũng'     LIMIT 1), '21-T4 045.56', 'motorbike');

-- ========================================
-- 7. Cập nhật room status → 'occupied' cho 30 phòng đã có tenant
-- ========================================
UPDATE rooms SET status = 'occupied'
WHERE id IN (
    SELECT DISTINCT room_id FROM tenants WHERE room_id IS NOT NULL AND move_out_date = ''
) AND status = 'vacant';

-- ========================================
-- 8. Contracts (30 active contracts, 12 tháng kể từ move_in_date)
-- ========================================
INSERT INTO contracts (
    room_id, primary_tenant_id, deposit, rent_price, start_date, end_date,
    terms, landlord_name, landlord_cccd, landlord_phone, landlord_address, status
)
SELECT
    t.room_id,
    t.id,
    t.deposit,
    r.price,
    t.move_in_date,
    date(t.move_in_date, '+12 months'),
    'Khách thuê tự ý sửa chữa lớn phòng phải xin phép chủ trọ. Đóng tiền nhà trước ngày 5 hàng tháng. Không nuôi thú cưng, không gây mất trật tự sau 22h.',
    (SELECT value FROM settings WHERE key='landlord_name'),
    (SELECT value FROM settings WHERE key='landlord_cccd'),
    (SELECT value FROM settings WHERE key='landlord_phone'),
    (SELECT value FROM settings WHERE key='landlord_address'),
    'active'
FROM tenants t
JOIN rooms r ON r.id = t.room_id
WHERE t.is_primary = 1 AND t.move_out_date = '';

-- ========================================
-- 9. Meter readings kỳ trước (2026-05) — để billing 2026-06 auto-fill chỉ số cũ
-- ========================================
INSERT INTO meter_readings (room_id, period, electric_start, electric_end, water_start, water_end)
SELECT
    r.id,
    '2026-05',
    abs(random() % 100),                          -- start: 0-99
    abs(random() % 100) + 50 + abs(random() % 80), -- end: ~50-180+
    abs(random() % 10),                            -- water start: 0-9
    abs(random() % 10) + 3 + abs(random() % 8)     -- water end: ~3-15+
FROM rooms r
WHERE r.status = 'occupied';

-- ========================================
-- 10. Invoices kỳ 2026-05 — paid / partial / unpaid mix để test page Debts
-- 30 invoices: 15 paid, 10 partial, 5 unpaid (quá hạn cho test Dashboard công nợ)
-- ========================================
INSERT INTO invoices (
    room_id, contract_id, period, room_fee, electric_fee, water_fee, service_fee, total,
    paid_amount, status, created_at
)
SELECT
    r.id,
    c.id,
    '2026-05',
    r.price,
    (mr.electric_end - mr.electric_start) * r.electric_unit_price,
    (mr.water_end - mr.water_start) * r.water_unit_price,
    -- Service fee: Wifi 100k + Vệ sinh 20k * 1-2 người + Rác 15k * 1-2 người + Bảo vệ 30k = ~200-250k
    220000,
    r.price
        + (mr.electric_end - mr.electric_start) * r.electric_unit_price
        + (mr.water_end - mr.water_start) * r.water_unit_price
        + 220000,
    0,         -- paid_amount sẽ update sau khi insert payments
    'unpaid',  -- status sẽ update sau
    -- created_at: rải ngày trong tháng 5/2026 để test "quá hạn > 5 ngày"
    datetime('2026-05-' || printf('%02d', (r.id % 28) + 1) || ' 09:00:00')
FROM rooms r
JOIN contracts c ON c.room_id = r.id AND c.status = 'active'
JOIN meter_readings mr ON mr.room_id = r.id AND mr.period = '2026-05'
WHERE r.status = 'occupied';

-- ========================================
-- 11. Invoice services (snapshot 5 dịch vụ cho mỗi invoice)
-- Simplified: chỉ snapshot Wifi + Vệ sinh + Rác + Bảo vệ (bỏ Xe máy cho gọn)
-- ========================================
INSERT INTO invoice_services (invoice_id, service_id, service_name, quantity, unit_price, amount)
SELECT i.id, 1, 'Wifi',          1, 100000, 100000 FROM invoices i WHERE i.period = '2026-05';

INSERT INTO invoice_services (invoice_id, service_id, service_name, quantity, unit_price, amount)
SELECT
    i.id,
    2,
    'Rác',
    (SELECT COUNT(*) FROM tenants t WHERE t.room_id = i.room_id AND t.move_out_date = ''),
    15000,
    (SELECT COUNT(*) FROM tenants t WHERE t.room_id = i.room_id AND t.move_out_date = '') * 15000
FROM invoices i WHERE i.period = '2026-05';

INSERT INTO invoice_services (invoice_id, service_id, service_name, quantity, unit_price, amount)
SELECT
    i.id,
    4,
    'Vệ sinh chung',
    (SELECT COUNT(*) FROM tenants t WHERE t.room_id = i.room_id AND t.move_out_date = ''),
    20000,
    (SELECT COUNT(*) FROM tenants t WHERE t.room_id = i.room_id AND t.move_out_date = '') * 20000
FROM invoices i WHERE i.period = '2026-05';

INSERT INTO invoice_services (invoice_id, service_id, service_name, quantity, unit_price, amount)
SELECT i.id, 5, 'Bảo vệ', 1, 30000, 30000 FROM invoices i WHERE i.period = '2026-05';

-- ========================================
-- 12. Payments (mix paid full / partial / unpaid)
-- Quy tắc: invoice.id chia 3
--   - id % 3 == 0  → unpaid (không có payment)
--   - id % 3 == 1  → paid full (1 payment = total)
--   - id % 3 == 2  → partial (payment = 60% total)
-- ========================================
INSERT INTO payments (invoice_id, amount, method, paid_at, note)
SELECT
    i.id,
    i.total,
    CASE WHEN i.id % 2 = 0 THEN 'transfer' ELSE 'cash' END,
    datetime('2026-05-' || printf('%02d', ((i.id + 10) % 28) + 1) || ' 14:30:00'),
    'Thanh toán đầy đủ kỳ 5/2026'
FROM invoices i
WHERE i.period = '2026-05' AND i.id % 3 = 1;

INSERT INTO payments (invoice_id, amount, method, paid_at, note)
SELECT
    i.id,
    CAST(i.total * 0.6 AS INTEGER),
    'cash',
    datetime('2026-05-' || printf('%02d', ((i.id + 15) % 28) + 1) || ' 10:00:00'),
    'Thanh toán một phần'
FROM invoices i
WHERE i.period = '2026-05' AND i.id % 3 = 2;

-- ========================================
-- 13. Cập nhật invoices.paid_amount + status dựa trên payments tổng
-- ========================================
UPDATE invoices
SET
    paid_amount = COALESCE(
        (SELECT SUM(amount) FROM payments p WHERE p.invoice_id = invoices.id),
        0
    ),
    status = CASE
        WHEN COALESCE((SELECT SUM(amount) FROM payments p WHERE p.invoice_id = invoices.id), 0) >= total
            THEN 'paid'
        WHEN COALESCE((SELECT SUM(amount) FROM payments p WHERE p.invoice_id = invoices.id), 0) > 0
            THEN 'partial'
        ELSE 'unpaid'
    END
WHERE period = '2026-05';

-- ========================================
-- 14. Cập nhật rooms.status → 'debt' cho phòng có invoice unpaid/partial quá 5 ngày
-- (Dùng cùng quy tắc với roomsRepo.recomputeStatus)
-- ========================================
UPDATE rooms
SET status = 'debt'
WHERE id IN (
    SELECT DISTINCT i.room_id
    FROM invoices i
    WHERE i.status <> 'paid'
      AND julianday('now') - julianday(i.created_at) > 5
)
AND status = 'occupied';
