-- ============================================================
-- PhongTroApp — Migration 007: set landlord Bên A = Nguyễn Thị Thu Phương
--
-- Theo yêu cầu chủ trọ Đê La Thành. UPSERT chỉ nếu giá trị hiện đang rỗng
-- để không đè dữ liệu user đã sửa qua trang Settings.
--
-- Ngày cấp CCCD (27/11/2023) và Nơi cấp (Cục cảnh sát) hiện hardcoded
-- trong template HĐ (contract-gen.ts) — không cần thêm cột settings mới.
-- ============================================================

UPDATE settings SET value = 'NGUYỄN THỊ THU PHƯƠNG'
   WHERE key = 'landlord_name' AND value = '';

UPDATE settings SET value = '033183009152'
   WHERE key = 'landlord_cccd' AND value = '';

UPDATE settings SET value = '0979103983'
   WHERE key = 'landlord_phone' AND value = '';

UPDATE settings SET value = 'Thôn 1, Vạn Phúc, Thanh Trì, Hà Nội'
   WHERE key = 'landlord_address' AND value = '';
