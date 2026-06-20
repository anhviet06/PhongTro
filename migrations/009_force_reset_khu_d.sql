-- ============================================================
-- PhongTroApp — Migration 009: FORCE wipe Khu D + reimport
--
-- Lý do: migration 007 + 008 trước đó có guard "chỉ chạy nếu rỗng/landlord empty",
-- nên trên máy đã có data test (vd tenant "việt") sẽ skip toàn bộ.
--
-- Migration này:
--   1. Force UPDATE settings landlord (override mọi giá trị cũ).
--   2. Wipe toàn bộ tenants + contracts trong Khu D (CASCADE sẽ tự xoá vehicles/invoices/meters).
--   3. Re-insert đầy đủ data từ xlsx Đê La Thành.
--
-- An toàn:
--   - Chỉ wipe Khu D, không động Khu Láng / Khu Khâm Thiên.
--   - User có data thật trong Khu D sẽ mất → phải báo trước.
--   - Idempotent qua _migrations table (chạy 1 lần, sau đó skip).
-- ============================================================

-- ========================================
-- 1. Force set landlord = Nguyễn Thị Thu Phương (override)
-- ========================================
UPDATE settings SET value = 'NGUYỄN THỊ THU PHƯƠNG' WHERE key = 'landlord_name';
UPDATE settings SET value = '033183009152'           WHERE key = 'landlord_cccd';
UPDATE settings SET value = '0979103983'              WHERE key = 'landlord_phone';
UPDATE settings SET value = 'Thôn 1, Vạn Phúc, Thanh Trì, Hà Nội' WHERE key = 'landlord_address';

-- ========================================
-- 2. Wipe toàn bộ tenants + contracts trong Khu D
-- (vehicles, invoices, meter_readings cascade tự xoá theo FK)
-- ========================================
DELETE FROM contracts WHERE room_id IN (
   SELECT id FROM rooms WHERE area_id = (SELECT id FROM areas WHERE name='Khu D')
);

DELETE FROM tenants WHERE room_id IN (
   SELECT id FROM rooms WHERE area_id = (SELECT id FROM areas WHERE name='Khu D')
);

-- Reset room status về vacant (sẽ set lại occupied ở cuối sau khi tạo HĐ mới)
UPDATE rooms SET status = 'vacant'
WHERE area_id = (SELECT id FROM areas WHERE name='Khu D');

-- ========================================
-- 3. Re-insert tenants
-- ========================================

-- Phòng 202
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='202' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'BÀN THỊ MAI ANH', '002307010093', '2007-12-25', '0865258205',
        'Thị trấn Vĩnh Tuy, Bắc Giang, Hà Giang', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date, note)
VALUES ((SELECT id FROM rooms WHERE name='202' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'Bạn (phòng 202)', 0, '2025-09-01', 'Người ở cùng, có xe đăng ký');

-- Phòng 203
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='203' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN THỊ LAN PHƯƠNG', '031307017541', '2007-01-27', '0789173854',
        'Thôm Cẩm La, Thanh Sơn, Kiến Thuy, Hải Phòng', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='203' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'BÙI THỊ HẬU', 0, '2025-09-01');

-- Phòng 301
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='301' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'ĐỊNH THỊ NGỌC HUYỀN', '014305002088', '2005-04-19', '0825194005',
        'Tô Hiệu, TP Sơn La, Sơn La', 1, '2025-09-01');

-- Phòng 302
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='302' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN HỒNG DUYÊN', '017307001897', '2007-04-15', '0368305296',
        'Xóm Máy 1, Hoà Bình, TP Hoà Bình', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='302' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN HÀ TRÂM', 0, '2025-09-01');

-- Phòng 303
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='303' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN THỊ MAI TRANG', '022307001393', '2007-05-22', '0386203713',
        'Thôn 3, Sông Khoai, Thị xã Quảng Yên, Quảng Ninh', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='303' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'TRẦN THỊ NGỌC ÁNH', 0, '2025-09-01');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='303' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN THỊ THU TRANG', 0, '2025-09-01');

-- Phòng 304
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='304' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'VŨ HẢI VƯƠNG', '025207014220', '1997-11-22', '0378602007',
        'Hữu Lầu, Việt Trì, Phú Thọ', 1, '2026-04-17');
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='304' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'ĐINH MINH KHOA', '025207014619', '2007-04-22',
        'Thanh Miếu, Việt Trì, Phú Thọ', 0, '2026-04-18');

-- Phòng 401
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='401' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN THỊ TUYẾT NHUNG', '026306002683', '2006-05-27', '0868905276',
        'Thôn Xy, Tân Lập, Sông Lô, Vĩnh Phúc', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='401' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN THUÝ HƯỜNG', 0, '2025-09-01');

-- Phòng 402
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='402' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'ĐỖ THỊ HUYỀN TRANG', '001306053655', '2006-10-07',
        'Thanh Oai, Hà Nội', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='402' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'ĐỊNH THỊ BẠCH KIM', '014306001059', '2006-11-08',
        'Vần Hồ, Sơn La', 0, '2025-09-01');

-- Phòng 403
INSERT INTO tenants (room_id, full_name, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='403' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'PHẠM DUY MINH', '1997-03-18',
        'Gò Vấp, Thành phố HCM', 1, '2025-09-01');

-- Phòng 404
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='404' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN TRỌNG PHƯỚC', '040097003758', '1997-11-10',
        'Xóm 2, Tân Sơn, Đô Lương, Nghệ An', 1, '2025-09-01');

-- Phòng 501
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='501' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'ĐÀO VY HẢO', '045305009565', '2005-02-05', '0345167447',
        'Thôn Minh Vượng, Quy Mông, Trấn Yên, Yên Bái', 1, '2025-09-01');

-- Phòng 502
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date, note)
VALUES ((SELECT id FROM rooms WHERE name='502' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN THỊ LAN ANH', '034301008313', '2001-02-11',
        'Thuỵ Anh, Hưng Yên', 1, '2025-09-01', 'Phòng 502');

-- Phòng 601
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='601' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN THỊ KIM THUỶ', '038305008310', '2005-04-23', '0374359212',
        'Thành Thắng, Quảng Cự, TP Sầm Sơn, Thanh Hoá', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='601' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'HÀO', 0, '2025-09-01');

-- Phòng 602
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='602' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN VĂN HUY', '037098009580', '1998-12-22',
        'Gia Hưng, Gia Viễn, Ninh Bình', 1, '2026-05-15');

-- Phòng 603
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='603' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN QUANG VINH', '030202001536', '2002-05-30', '0869279501',
        'Thôn Bình Đề, Gia Khánh, Gia Lộc, Hải Dương', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='603' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'PHẠM THỊ TRÚC QUỲNH', 0, '2025-09-01');

-- Phòng 604
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='604' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'PHẠM KIM KHÁNH', '015307007941', '2007-03-21',
        'Động Quan, Lục Yên, Yên Bái', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date, note)
VALUES ((SELECT id FROM rooms WHERE name='604' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'Bạn (phòng 604)', 0, '2025-09-01', 'Người ở cùng, có xe đăng ký');

-- Phòng 701
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='701' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'MA THỊ NGỌC MAI', '019307005674', '2007-12-03',
        'Xóm Tín Keo, Phú Bình Định, Hoá Thái Nguyên', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='701' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN VIỆT HƯƠNG', 0, '2025-09-01');

-- Phòng 702
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='702' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN NGỌC NINH', '015305002087', '2005-09-28',
        'Thôn Ngã Ba, Cát Thịnh, Văn Chấn, Yên Bái', 1, '2025-09-01');

-- Phòng 703
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='703' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'PHẠM TÂM ANH', '022306008738', '2006-02-27',
        'Khu 5, Quảng Yên, Thị xã Quảng Yên, Quảng Ninh', 1, '2025-09-01');
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
VALUES ((SELECT id FROM rooms WHERE name='703' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN THỊ QUỲNH CHI', '022306003400', '2006-07-19',
        'Khu 2, Hà An, Thị xã Quảng Yên, Quảng Ninh', 0, '2025-09-01');

-- Phòng 704
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date, note)
VALUES ((SELECT id FROM rooms WHERE name='704' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
        'NGUYỄN THỊ LAN ANH', '015306000805', '2006-10-12',
        'Thôn Loang Tra, Minh Xuân, Lục Yên, Yên Bái', 1, '2025-09-01', 'Phòng 704');

-- ========================================
-- 4. Vehicles
-- ========================================
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '23L 944.48', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='202' AND t.full_name='BÀN THỊ MAI ANH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '29C1.95321', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='202' AND t.full_name='Bạn (phòng 202)' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '15F1 352.65', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='203' AND t.full_name='NGUYỄN THỊ LAN PHƯƠNG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '26AA 806.11', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='301' AND t.full_name='ĐỊNH THỊ NGỌC HUYỀN' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '14AX 00443', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='303' AND t.full_name='NGUYỄN THỊ MAI TRANG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '14AX 04847', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='303' AND t.full_name='TRẦN THỊ NGỌC ÁNH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '19AA 165.52', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='304' AND t.full_name='VŨ HẢI VƯƠNG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '19AA 102.93', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='304' AND t.full_name='ĐINH MINH KHOA' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '88D1 55354', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='401' AND t.full_name='NGUYỄN THỊ TUYẾT NHUNG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '88AA 14920', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='401' AND t.full_name='NGUYỄN THUÝ HƯỜNG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '26K8 8864', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='402' AND t.full_name='ĐỖ THỊ HUYỀN TRANG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '90B2 51791', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='402' AND t.full_name='ĐỊNH THỊ BẠCH KIM' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '188.66', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='403' AND t.full_name='PHẠM DUY MINH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '37D1 839.34', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='404' AND t.full_name='NGUYỄN TRỌNG PHƯỚC' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '29 E2 176.76', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='501' AND t.full_name='ĐÀO VY HẢO' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '17 B6 537.07', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='502' AND t.full_name='NGUYỄN THỊ LAN ANH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D') AND t.note='Phòng 502';
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '36AN 028.06', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='601' AND t.full_name='NGUYỄN THỊ KIM THUỶ' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '30AS 236.48', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='603' AND t.full_name='NGUYỄN QUANG VINH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '34AS 236.48', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='603' AND t.full_name='PHẠM THỊ TRÚC QUỲNH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '29BL 068.86', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='604' AND t.full_name='PHẠM KIM KHÁNH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '29BC 087.70', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='604' AND t.full_name='Bạn (phòng 604)' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '34AS 236.48', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='701' AND t.full_name='MA THỊ NGỌC MAI' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '29BL 068.86', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='701' AND t.full_name='NGUYỄN VIỆT HƯƠNG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '21LA 058.10', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='702' AND t.full_name='NGUYỄN NGỌC NINH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '14X1 490.14', 'motorbike' FROM tenants t JOIN rooms r ON r.id=t.room_id
WHERE r.name='703' AND t.full_name='NGUYỄN THỊ QUỲNH CHI' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

-- ========================================
-- 5. Tạo contracts active cho mỗi phòng có primary tenant
-- ========================================
INSERT INTO contracts (
   room_id, primary_tenant_id, deposit, rent_price, start_date, end_date,
   terms, landlord_name, landlord_cccd, landlord_phone, landlord_address, status
)
SELECT
   t.room_id,
   t.id,
   0,
   r.price,
   t.move_in_date,
   date(t.move_in_date, '+12 months'),
   '',
   (SELECT value FROM settings WHERE key='landlord_name'),
   (SELECT value FROM settings WHERE key='landlord_cccd'),
   (SELECT value FROM settings WHERE key='landlord_phone'),
   (SELECT value FROM settings WHERE key='landlord_address'),
   'active'
FROM tenants t
JOIN rooms r ON r.id = t.room_id
WHERE t.is_primary = 1
  AND r.area_id = (SELECT id FROM areas WHERE name='Khu D');

-- ========================================
-- 6. Set room.status = 'occupied' cho phòng đã có HĐ active
-- ========================================
UPDATE rooms SET status = 'occupied'
WHERE id IN (
   SELECT DISTINCT room_id FROM contracts WHERE status = 'active'
);
