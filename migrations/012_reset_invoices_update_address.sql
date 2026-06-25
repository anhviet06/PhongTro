-- ============================================================
-- PhongTroApp — Migration 012: reset hóa đơn + cập nhật địa chỉ
--
-- Xóa sạch:
--   - payments         (thanh toán)
--   - invoice_services (snapshot dịch vụ trong HĐ)
--   - invoices         (hoá đơn đã tạo)
--   - meter_readings   (chỉ số điện/nước đã nhập)
--
-- Cập nhật địa chỉ chủ nhà sang Đê La Thành.
--
-- Giữ nguyên: tenants, contracts, vehicles, rooms, areas, services.
-- ============================================================

-- 1. Xóa lịch sử hóa đơn
DELETE FROM payments;
DELETE FROM invoice_services;
DELETE FROM invoices;
DELETE FROM meter_readings;

-- 2. Cập nhật trạng thái phòng
UPDATE rooms SET status = 'occupied'
WHERE id IN (SELECT DISTINCT room_id FROM contracts WHERE status = 'active');

UPDATE rooms SET status = 'vacant'
WHERE id NOT IN (SELECT DISTINCT room_id FROM contracts WHERE status = 'active');

-- 3. Cập nhật địa chỉ chủ nhà
UPDATE settings SET value = 'Số 4, Ngách 99, Ngõ 318, Đê La Thành, Hà Nội'
   WHERE key = 'landlord_address';
