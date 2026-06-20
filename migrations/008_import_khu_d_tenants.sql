-- ============================================================
-- PhongTroApp — Migration 008: import danh sách khách thuê thực tế Khu D
--
-- Nguồn: spreadsheet xlsx của chủ trọ Đê La Thành (Nguyễn Thị Thu Phương).
-- 20 phòng có người (phòng 201 còn trống). Tổng ~30 tenants + 18 xe + 20 HĐ.
--
-- An toàn:
--   - Guard: chỉ chạy nếu Khu D chưa có tenant nào (NOT EXISTS check ở mỗi INSERT).
--   - Nếu user đã có data thật trong Khu D → migration auto-skip.
--   - Tenants → CCCD/SĐT/DOB từ xlsx; "BẠN" / "HÀO" → secondary (is_primary=0), thiếu info.
--   - Mỗi phòng tạo 1 HĐ active: rent_price=0 (user nhập sau), start=move_in_date của primary,
--     end=start+12 tháng, landlord_* lấy từ settings (đã set bởi 007).
--   - Vehicle linkout qua (room_id, full_name).
--
-- Một vài typo trong xlsx:
--   - Vũ Hải Vương ngày sinh "11/22/2027" → giả định 1997.
-- ============================================================

-- ========================================
-- 1. Phòng 202: Bàn Thị Mai Anh + BẠN (2 xe)
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='202' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'BÀN THỊ MAI ANH', '002307010093', '2007-12-25', '0865258205',
       'Thị trấn Vĩnh Tuy, Bắc Giang, Hà Giang', 1, '2025-09-01'
WHERE NOT EXISTS (
   SELECT 1 FROM tenants t JOIN rooms r ON t.room_id=r.id
   WHERE r.area_id=(SELECT id FROM areas WHERE name='Khu D')
);
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date, note)
SELECT (SELECT id FROM rooms WHERE name='202' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'Bạn (phòng 202)', '', '', '', '', 0, '2025-09-01', 'Người ở cùng, có xe đăng ký'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');

-- ========================================
-- 2. Phòng 203: Nguyễn Thị Lan Phương + Bùi Thị Hậu
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='203' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN THỊ LAN PHƯƠNG', '031307017541', '2007-01-27', '0789173854',
       'Thôm Cẩm La, Thanh Sơn, Kiến Thuy, Hải Phòng', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='203' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'BÙI THỊ HẬU', 0, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='NGUYỄN THỊ LAN PHƯƠNG');

-- ========================================
-- 3. Phòng 301: Định Thị Ngọc Huyền
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='301' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'ĐỊNH THỊ NGỌC HUYỀN', '014305002088', '2005-04-19', '0825194005',
       'Tô Hiệu, TP Sơn La, Sơn La', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');

-- ========================================
-- 4. Phòng 302: Nguyễn Hồng Duyên + Nguyễn Hà Trâm
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='302' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN HỒNG DUYÊN', '017307001897', '2007-04-15', '0368305296',
       'Xóm Máy 1, Hoà Bình, TP Hoà Bình', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='302' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN HÀ TRÂM', 0, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='NGUYỄN HỒNG DUYÊN');

-- ========================================
-- 5. Phòng 303: Nguyễn Thị Mai Trang + Trần Thị Ngọc Ánh + Nguyễn Thị Thu Trang
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='303' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN THỊ MAI TRANG', '022307001393', '2007-05-22', '0386203713',
       'Thôn 3, Sông Khoai, Thị xã Quảng Yên, Quảng Ninh', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='303' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'TRẦN THỊ NGỌC ÁNH', 0, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='NGUYỄN THỊ MAI TRANG');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='303' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN THỊ THU TRANG', 0, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='NGUYỄN THỊ MAI TRANG');

-- ========================================
-- 6. Phòng 304: Vũ Hải Vương + Đinh Minh Khoa
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='304' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'VŨ HẢI VƯƠNG', '025207014220', '1997-11-22', '0378602007',
       'Hữu Lầu, Việt Trì, Phú Thọ', 1, '2026-04-17'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='304' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'ĐINH MINH KHOA', '025207014619', '2007-04-22',
       'Thanh Miếu, Việt Trì, Phú Thọ', 0, '2026-04-18'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='VŨ HẢI VƯƠNG');

-- ========================================
-- 7. Phòng 401: Nguyễn Thị Tuyết Nhung + Nguyễn Thuý Hường
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='401' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN THỊ TUYẾT NHUNG', '026306002683', '2006-05-27', '0868905276',
       'Thôn Xy, Tân Lập, Sông Lô, Vĩnh Phúc', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='401' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN THUÝ HƯỜNG', 0, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='NGUYỄN THỊ TUYẾT NHUNG');

-- ========================================
-- 8. Phòng 402: Đỗ Thị Huyền Trang + Định Thị Bạch Kim
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='402' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'ĐỖ THỊ HUYỀN TRANG', '001306053655', '2006-10-07',
       'Thanh Oai, Hà Nội', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='402' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'ĐỊNH THỊ BẠCH KIM', '014306001059', '2006-11-08',
       'Vần Hồ, Sơn La', 0, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='ĐỖ THỊ HUYỀN TRANG');

-- ========================================
-- 9. Phòng 403: Phạm Duy Minh
-- ========================================
INSERT INTO tenants (room_id, full_name, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='403' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'PHẠM DUY MINH', '1997-03-18',
       'Gò Vấp, Thành phố HCM', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');

-- ========================================
-- 10. Phòng 404: Nguyễn Trọng Phước
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='404' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN TRỌNG PHƯỚC', '040097003758', '1997-11-10',
       'Xóm 2, Tân Sơn, Đô Lương, Nghệ An', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');

-- ========================================
-- 11. Phòng 501: Đào Vy Hảo
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='501' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'ĐÀO VY HẢO', '045305009565', '2005-02-05', '0345167447',
       'Thôn Minh Vượng, Quy Mông, Trấn Yên, Yên Bái', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');

-- ========================================
-- 12. Phòng 502: Nguyễn Thị Lan Anh
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date, note)
SELECT (SELECT id FROM rooms WHERE name='502' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN THỊ LAN ANH', '034301008313', '2001-02-11',
       'Thuỵ Anh, Hưng Yên', 1, '2025-09-01', 'Phòng 502'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');

-- ========================================
-- 13. Phòng 601: Nguyễn Thị Kim Thuỷ + Hào
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='601' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN THỊ KIM THUỶ', '038305008310', '2005-04-23', '0374359212',
       'Thành Thắng, Quảng Cự, TP Sầm Sơn, Thanh Hoá', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='601' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'HÀO', 0, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='NGUYỄN THỊ KIM THUỶ');

-- ========================================
-- 14. Phòng 602: Nguyễn Văn Huy
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='602' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN VĂN HUY', '037098009580', '1998-12-22',
       'Gia Hưng, Gia Viễn, Ninh Bình', 1, '2026-05-15'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');

-- ========================================
-- 15. Phòng 603: Nguyễn Quang Vinh + Phạm Thị Trúc Quỳnh
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, phone, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='603' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN QUANG VINH', '030202001536', '2002-05-30', '0869279501',
       'Thôn Bình Đề, Gia Khánh, Gia Lộc, Hải Dương', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='603' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'PHẠM THỊ TRÚC QUỲNH', 0, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='NGUYỄN QUANG VINH');

-- ========================================
-- 16. Phòng 604: Phạm Kim Khánh + BẠN
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='604' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'PHẠM KIM KHÁNH', '015307007941', '2007-03-21',
       'Động Quan, Lục Yên, Yên Bái', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date, note)
SELECT (SELECT id FROM rooms WHERE name='604' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'Bạn (phòng 604)', 0, '2025-09-01', 'Người ở cùng, có xe đăng ký'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='PHẠM KIM KHÁNH');

-- ========================================
-- 17. Phòng 701: Ma Thị Ngọc Mai + Nguyễn Việt Hương
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='701' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'MA THỊ NGỌC MAI', '019307005674', '2007-12-03',
       'Xóm Tín Keo, Phú Bình Định, Hoá Thái Nguyên', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='701' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN VIỆT HƯƠNG', 0, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='MA THỊ NGỌC MAI');

-- ========================================
-- 18. Phòng 702: Nguyễn Ngọc Ninh
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='702' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN NGỌC NINH', '015305002087', '2005-09-28',
       'Thôn Ngã Ba, Cát Thịnh, Văn Chấn, Yên Bái', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');

-- ========================================
-- 19. Phòng 703: Phạm Tâm Anh + Nguyễn Thị Quỳnh Chi
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='703' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'PHẠM TÂM ANH', '022306008738', '2006-02-27',
       'Khu 5, Quảng Yên, Thị xã Quảng Yên, Quảng Ninh', 1, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date)
SELECT (SELECT id FROM rooms WHERE name='703' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN THỊ QUỲNH CHI', '022306003400', '2006-07-19',
       'Khu 2, Hà An, Thị xã Quảng Yên, Quảng Ninh', 0, '2025-09-01'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='PHẠM TÂM ANH');

-- ========================================
-- 20. Phòng 704: Nguyễn Thị Lan Anh (phòng 704 — khác với 502)
-- ========================================
INSERT INTO tenants (room_id, full_name, cccd, dob, permanent_address, is_primary, move_in_date, note)
SELECT (SELECT id FROM rooms WHERE name='704' AND area_id=(SELECT id FROM areas WHERE name='Khu D')),
       'NGUYỄN THỊ LAN ANH', '015306000805', '2006-10-12',
       'Thôn Loang Tra, Minh Xuân, Lục Yên, Yên Bái', 1, '2025-09-01', 'Phòng 704'
WHERE EXISTS (SELECT 1 FROM tenants WHERE full_name='BÀN THỊ MAI ANH');

-- ============================================================
-- Vehicles (xe đăng ký theo từng tenant). Lookup tenant.id qua (room_id, full_name).
-- ============================================================
INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '23L 944.48', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='202' AND t.full_name='BÀN THỊ MAI ANH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '29C1.95321', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='202' AND t.full_name='Bạn (phòng 202)' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '15F1 352.65', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='203' AND t.full_name='NGUYỄN THỊ LAN PHƯƠNG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '26AA 806.11', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='301' AND t.full_name='ĐỊNH THỊ NGỌC HUYỀN' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '14AX 00443', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='303' AND t.full_name='NGUYỄN THỊ MAI TRANG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '14AX 04847', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='303' AND t.full_name='TRẦN THỊ NGỌC ÁNH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '19AA 165.52', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='304' AND t.full_name='VŨ HẢI VƯƠNG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '19AA 102.93', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='304' AND t.full_name='ĐINH MINH KHOA' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '88D1 55354', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='401' AND t.full_name='NGUYỄN THỊ TUYẾT NHUNG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '88AA 14920', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='401' AND t.full_name='NGUYỄN THUÝ HƯỜNG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '26K8 8864', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='402' AND t.full_name='ĐỖ THỊ HUYỀN TRANG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '90B2 51791', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='402' AND t.full_name='ĐỊNH THỊ BẠCH KIM' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '188.66', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='403' AND t.full_name='PHẠM DUY MINH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '37D1 839.34', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='404' AND t.full_name='NGUYỄN TRỌNG PHƯỚC' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '29 E2 176.76', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='501' AND t.full_name='ĐÀO VY HẢO' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '17 B6 537.07', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='502' AND t.full_name='NGUYỄN THỊ LAN ANH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D') AND t.note='Phòng 502';

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '36AN 028.06', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='601' AND t.full_name='NGUYỄN THỊ KIM THUỶ' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '30AS 236.48', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='603' AND t.full_name='NGUYỄN QUANG VINH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '34AS 236.48', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='603' AND t.full_name='PHẠM THỊ TRÚC QUỲNH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '29BL 068.86', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='604' AND t.full_name='PHẠM KIM KHÁNH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '29BC 087.70', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='604' AND t.full_name='Bạn (phòng 604)' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '34AS 236.48', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='701' AND t.full_name='MA THỊ NGỌC MAI' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '29BL 068.86', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='701' AND t.full_name='NGUYỄN VIỆT HƯƠNG' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '21LA 058.10', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='702' AND t.full_name='NGUYỄN NGỌC NINH' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

INSERT INTO vehicles (tenant_id, plate_number, vehicle_type)
SELECT t.id, '14X1 490.14', 'motorbike' FROM tenants t
JOIN rooms r ON r.id=t.room_id
WHERE r.name='703' AND t.full_name='NGUYỄN THỊ QUỲNH CHI' AND r.area_id=(SELECT id FROM areas WHERE name='Khu D');

-- ============================================================
-- Tạo HĐ active cho mỗi phòng có đại diện. rent_price=0 (user nhập sau),
-- start_date=move_in_date, end_date=start_date + 12 tháng.
-- ============================================================
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
  AND r.area_id = (SELECT id FROM areas WHERE name='Khu D')
  AND NOT EXISTS (
     SELECT 1 FROM contracts c WHERE c.room_id = t.room_id AND c.status = 'active'
  );

-- ============================================================
-- Cập nhật room.status = 'occupied' cho phòng đã có HĐ active vừa tạo
-- ============================================================
UPDATE rooms SET status = 'occupied'
WHERE id IN (
   SELECT DISTINCT room_id FROM contracts WHERE status = 'active'
) AND status = 'vacant';
