-- ============================================================
-- PhongTroApp — Migration 010: wipe meter readings + invoices
--
-- Chạy 1 lần để clear data test:
--   - meter_readings  (chỉ số điện/nước đã nhập)
--   - invoices         (hoá đơn đã tạo)
--   - invoice_services (snapshot dịch vụ trong HĐ)
--   - payments         (thanh toán)
--
-- Giữ nguyên: tenants, contracts, vehicles, rooms, areas, services, settings.
-- Idempotent qua _migrations table.
-- ============================================================

DELETE FROM payments;
DELETE FROM invoice_services;
DELETE FROM invoices;
DELETE FROM meter_readings;

-- Recompute room status: phòng có HĐ active → 'occupied', không → 'vacant'.
UPDATE rooms SET status = 'occupied'
WHERE id IN (SELECT DISTINCT room_id FROM contracts WHERE status = 'active');

UPDATE rooms SET status = 'vacant'
WHERE id NOT IN (SELECT DISTINCT room_id FROM contracts WHERE status = 'active');
