/**
 * Excel export service: xuất hóa đơn, báo cáo doanh thu và danh sách khách thuê.
 */

import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import * as invoicesRepo from '../database/repositories/invoices.repo';
import * as tenantsRepo from '../database/repositories/tenants.repo';
import * as vehiclesRepo from '../database/repositories/vehicles.repo';
import * as statsRepo from '../database/repositories/stats.repo';
import * as settingsRepo from '../database/repositories/settings.repo';
import * as roomsRepo from '../database/repositories/rooms.repo';
import * as metersRepo from '../database/repositories/meters.repo';

const electronModule = require('electron') as typeof import('electron') | string;
const dialog = typeof electronModule === 'string' ? null : electronModule.dialog;
const app = typeof electronModule === 'string' ? null : electronModule.app;

export interface RevenueReportFilter {
   year?: number;
   monthsBack?: number;
}

/** Apply VND number format cho 1 hoặc nhiều cột — cell vẫn là number (sort/filter OK). */
function setVndColumns(sheet: ExcelJS.Worksheet, columnLetters: string[]): void {
   for (const letter of columnLetters) {
      sheet.getColumn(letter).numFmt = '#,##0';
   }
}

async function chooseSavePath(
   defaultPath: string,
   savePath?: string
): Promise<string | null> {
   if (savePath) return savePath;
   if (!dialog) throw new Error('Không thể mở hộp thoại lưu file trong môi trường hiện tại');

   const result = await dialog.showSaveDialog({
      title: 'Lưu file Excel',
      defaultPath,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
   });

   if (result.canceled || !result.filePath) return null;
   return result.filePath;
}

function styleHeader(row: ExcelJS.Row): void {
   row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
   row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF005BBF' },
   };
}

function autoWidth(sheet: ExcelJS.Worksheet): void {
   sheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
         maxLength = Math.max(maxLength, String(cell.value ?? '').length + 2);
      });
      column.width = Math.min(maxLength, 42);
   });
}

/** Wrapper chung — catch error, log chi tiết, re-throw với message thân thiện cho UI. */
async function withExportErrorBoundary<T>(label: string, fn: () => Promise<T>): Promise<T> {
   try {
      return await fn();
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[excel-export] ${label} failed:`, error);
      throw new Error(`${label} thất bại: ${message}`);
   }
}

/**
 * Tìm ảnh QR thanh toán để embed vào hóa đơn.
 * Ưu tiên: %APPDATA%/phongtro-app/qr-payment.png (user có thể tự thay)
 *           → fallback: bundled public/qr-payment.png (đi kèm app)
 *           → cuối cùng: null (không có QR thì để trống ô)
 */
function findQrPaymentImage(): string | null {
   const candidates: string[] = [];
   if (app) {
      try {
         // User-override: %APPDATA%/phongtro-app/qr-payment.png
         candidates.push(path.join(app.getPath('userData'), 'qr-payment.png'));
      } catch {
         // app không sẵn sàng → bỏ qua
      }
      try {
         // Bundled: app.asar/dist/qr-payment.png (production) hoặc public/qr-payment.png (dev)
         const appPath = app.getAppPath();
         candidates.push(path.join(appPath, 'dist', 'qr-payment.png'));
         candidates.push(path.join(appPath, 'public', 'qr-payment.png'));
      } catch {
         // bỏ qua
      }
   }
   return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/**
 * Xuất hóa đơn Excel theo mẫu "BẢNG DỊCH VỤ THUÊ NHÀ" của chủ trọ Đê La Thành.
 *
 * Layout:
 *  - A1: "Tháng" | B1: "Tháng <M>"           D1:G1 merged: "BẢNG DỊCH VỤ THUÊ NHÀ"
 *  - A2: "Phòng" | B2: <room_name>
 *  - A3: "Địa chỉ" | B3:G3 merged: <địa chỉ trọ>     H3: "Nội dung CK: Phòng <X>"
 *  - Row 4: header (No, Tên dịch vụ, Chỉ số cũ/mới, Tổng, Đơn giá, Thành tiền)
 *  - Rows 5-10: 6 dòng (Phòng, Điện, Nước, DV chung, Internet, Khác)
 *  - Row 11: TỔNG (merged A11:F11) — Thành tiền G11
 *  - Row 12+: Chú ý thanh toán
 *  - Cột H rows 3-10: ảnh QR thanh toán
 */
export async function exportInvoiceExcel(invoiceId: number, savePath?: string) {
   return withExportErrorBoundary('Xuất Excel hóa đơn', async () => {
      const invoice = invoicesRepo.getById(invoiceId);
      if (!invoice) throw new Error('Không tìm thấy hóa đơn');

      const settings = settingsRepo.getMany(['landlord_address']);
      const room = roomsRepo.getById(invoice.room_id);
      const meter = metersRepo.getByRoomPeriod(invoice.room_id, invoice.period);

      const filePath = await chooseSavePath(
         `Hoa-don-${invoice.room_name}-${invoice.period}.xlsx`,
         savePath
      );
      if (!filePath) return { canceled: true };

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'PhongTroApp';
      const sheet = workbook.addWorksheet('Hóa đơn', {
         pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      });

      // Cố định độ rộng cột
      sheet.columns = [
         { width: 12 }, // A
         { width: 22 }, // B
         { width: 12 }, // C
         { width: 12 }, // D
         { width: 10 }, // E
         { width: 12 }, // F
         { width: 16 }, // G
         { width: 26 }, // H (QR + Nội dung CK)
      ];

      // Period → "Tháng M" (YYYY-MM)
      const monthLabel = (() => {
         const match = /^(\d{4})-(\d{2})$/.exec(invoice.period);
         if (match) return `Tháng ${parseInt(match[2], 10)}`;
         return invoice.period;
      })();

      const address = settings.landlord_address || '318/99/4 ĐÊ LA THÀNH';

      // --- Hàng 1: Tháng | <giá trị> | (3 cột trống) | "BẢNG DỊCH VỤ THUÊ NHÀ" ---
      sheet.getCell('A1').value = 'Tháng';
      sheet.getCell('B1').value = monthLabel;
      sheet.mergeCells('D1:G1');
      sheet.getCell('D1').value = 'BẢNG DỊCH VỤ THUÊ NHÀ';
      sheet.getCell('D1').alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getCell('D1').font = { bold: true, size: 14 };

      // --- Hàng 2: Phòng | <số phòng> ---
      sheet.getCell('A2').value = 'Phòng';
      sheet.getCell('B2').value = invoice.room_name;

      // --- Hàng 3: Địa chỉ | <địa chỉ> | Nội dung CK ---
      sheet.getCell('A3').value = 'Địa chỉ :';
      sheet.getCell('A3').font = { color: { argb: 'FFC00000' }, bold: true };
      sheet.mergeCells('B3:G3');
      sheet.getCell('B3').value = address;
      sheet.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getCell('H3').value = `Nội dung CK: Phòng ${invoice.room_name}`;
      sheet.getCell('H3').alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getCell('H3').font = { bold: true };

      // --- Hàng 4: header bảng ---
      const headerRow = sheet.getRow(4);
      const headerValues = ['No', 'Tên dịch vụ', 'Chỉ số cũ', 'Chỉ số mới', 'Tổng', 'Đơn giá', 'Thành tiền'];
      headerValues.forEach((value, idx) => {
         const cell = headerRow.getCell(idx + 1);
         cell.value = value;
         cell.font = { bold: true };
         cell.alignment = { horizontal: 'center', vertical: 'middle' };
         cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
         };
      });

      // --- Hàng 5-10: line items ---
      // Tính qty điện/nước từ meter readings (fallback: 0)
      const electricQty = meter ? meter.electric_end - meter.electric_start : 0;
      const waterQty = meter ? meter.water_end - meter.water_start : 0;

      // Đơn giá từ room (chính xác nhất) hoặc tính ngược từ fee/qty
      const electricUnit = room?.electric_unit_price ?? (electricQty > 0 ? invoice.electric_fee / electricQty : 0);
      const waterUnit = room?.water_unit_price ?? (waterQty > 0 ? invoice.water_fee / waterQty : 0);

      // Lookup services theo tên (lowercased substring)
      const findService = (keywords: string[]) => {
         const list = invoice.services ?? [];
         return (
            list.find((s) =>
               keywords.some((k) => s.service_name?.toLowerCase().includes(k.toLowerCase()))
            ) ?? null
         );
      };
      const dvChung = findService(['dịch vụ chung', 'dv chung', 'chung']);
      const internet = findService(['internet', 'wifi', 'mạng']);
      const otherTotal = (invoice.services ?? [])
         .filter((s) => s !== dvChung && s !== internet)
         .reduce((sum, s) => sum + s.amount, 0);

      // Row data: [No, Tên, Cũ, Mới, Tổng, Đơn giá, Thành tiền]
      const rows: Array<(string | number | null)[]> = [
         [1, 'Phòng', null, null, null, null, invoice.room_fee],
         [
            2,
            'Điện',
            meter?.electric_start ?? null,
            meter?.electric_end ?? null,
            electricQty || null,
            Math.round(electricUnit) || null,
            invoice.electric_fee,
         ],
         [
            3,
            'Nước',
            meter?.water_start ?? null,
            meter?.water_end ?? null,
            waterQty || null,
            Math.round(waterUnit) || null,
            invoice.water_fee,
         ],
         [
            4,
            'Dịch vụ chung',
            null,
            null,
            dvChung?.quantity || null,
            dvChung?.unit_price || null,
            dvChung?.amount || null,
         ],
         [
            5,
            'Internet',
            null,
            null,
            internet?.quantity || null,
            internet?.unit_price || null,
            internet?.amount || null,
         ],
         [6, 'Khác', null, null, null, null, otherTotal || null],
      ];

      rows.forEach((rowData, rowIdx) => {
         const row = sheet.getRow(5 + rowIdx);
         rowData.forEach((value, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            cell.value = value;
            cell.alignment = {
               horizontal: colIdx === 1 ? 'left' : colIdx === 0 ? 'center' : 'right',
               vertical: 'middle',
            };
            cell.border = {
               top: { style: 'thin' },
               left: { style: 'thin' },
               bottom: { style: 'thin' },
               right: { style: 'thin' },
            };
         });
      });

      // --- Hàng 11: TỔNG ---
      sheet.mergeCells('A11:F11');
      sheet.getCell('A11').value = 'TỔNG';
      sheet.getCell('A11').font = { bold: true };
      sheet.getCell('A11').alignment = { horizontal: 'left', vertical: 'middle' };
      sheet.getCell('G11').value = invoice.total;
      sheet.getCell('G11').font = { bold: true };
      sheet.getCell('G11').fill = {
         type: 'pattern',
         pattern: 'solid',
         fgColor: { argb: 'FFC6EFCE' },
      };
      sheet.getCell('G11').alignment = { horizontal: 'right', vertical: 'middle' };
      for (const col of ['A11', 'B11', 'C11', 'D11', 'E11', 'F11', 'G11']) {
         sheet.getCell(col).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
         };
      }

      // --- Hàng 12-14: Chú ý ---
      sheet.mergeCells('A12:G14');
      const noteCell = sheet.getCell('A12');
      noteCell.value =
         'Chú ý : Thanh toán trong vòng 24h sau khi nhận được hóa đơn dịch vụ. Thanh toán muộn ban quản lý có quyền cắt các dịch vụ chưa thanh toán đúng thời hạn và chưa đủ số tiền , đồng thời phạt cảnh cáo 200.000đ. Xin cảm ơn!';
      noteCell.font = { color: { argb: 'FFC00000' } };
      noteCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };

      // Format VND cho cột F (Đơn giá) và G (Thành tiền)
      setVndColumns(sheet, ['F', 'G']);

      // --- QR thanh toán ở cột H, rows 4-11 ---
      const qrPath = findQrPaymentImage();
      if (qrPath) {
         try {
            const imageId = workbook.addImage({
               filename: qrPath,
               extension: 'png',
            });
            // Ô H4 → H11 (8 hàng) — embed scaled
            sheet.addImage(imageId, {
               tl: { col: 7, row: 3 }, // col 7 = H (0-indexed), row 3 = row 4 (0-indexed)
               ext: { width: 190, height: 240 },
            });
         } catch (err) {
            console.warn('[excel-export] không embed được QR:', err);
         }
      }

      // Row heights cho dễ nhìn
      sheet.getRow(1).height = 22;
      sheet.getRow(3).height = 22;
      sheet.getRow(4).height = 22;
      for (let r = 5; r <= 11; r += 1) sheet.getRow(r).height = 20;

      await workbook.xlsx.writeFile(filePath);
      return { success: true, filePath };
   });
}

export async function exportInvoicesByPeriod(period: string, savePath?: string) {
   return withExportErrorBoundary('Xuất Excel theo kỳ', async () => {
   const invoices = invoicesRepo.listByPeriod(period);
   const filePath = await chooseSavePath(`Hoa-don-thang-${period}.xlsx`, savePath);
   if (!filePath) return { canceled: true };

   const workbook = new ExcelJS.Workbook();
   workbook.creator = 'PhongTroApp';
   const sheet = workbook.addWorksheet(`Tháng ${period}`);

   styleHeader(
      sheet.addRow([
         'Khu',
         'Phòng',
         'Khách thuê',
         'Tiền phòng',
         'Điện',
         'Nước',
         'Dịch vụ',
         'Tổng',
         'Đã thu',
         'Còn nợ',
         'Trạng thái',
      ])
   );

   for (const invoice of invoices) {
      sheet.addRow([
         invoice.area_name,
         invoice.room_name,
         invoice.tenant_name ?? '',
         invoice.room_fee,
         invoice.electric_fee,
         invoice.water_fee,
         invoice.service_fee,
         invoice.total,
         invoice.paid_amount,
         invoice.total - invoice.paid_amount,
         invoice.status,
      ]);
   }

   // Cột D-J là tiền: Tiền phòng, Điện, Nước, Dịch vụ, Tổng, Đã thu, Còn nợ
   setVndColumns(sheet, ['D', 'E', 'F', 'G', 'H', 'I', 'J']);
   autoWidth(sheet);
   await workbook.xlsx.writeFile(filePath);
   return { success: true, filePath };
   });
}

export async function exportRevenueReport(filter: RevenueReportFilter = {}, savePath?: string) {
   return withExportErrorBoundary('Xuất Excel báo cáo doanh thu', async () => {
   const year = filter.year ?? new Date().getFullYear();
   const filePath = await chooseSavePath(`Bao-cao-doanh-thu-${year}.xlsx`, savePath);
   if (!filePath) return { canceled: true };

   const workbook = new ExcelJS.Workbook();
   workbook.creator = 'PhongTroApp';

   const monthlySheet = workbook.addWorksheet('Theo tháng');
   styleHeader(monthlySheet.addRow(['Kỳ', 'Doanh thu', 'Đã thu', 'Còn nợ']));
   for (const row of statsRepo.revenueByMonth(year)) {
      monthlySheet.addRow([
         row.period,
         row.total_revenue,
         row.paid_revenue,
         row.debt_amount,
      ]);
   }
   setVndColumns(monthlySheet, ['B', 'C', 'D']);
   autoWidth(monthlySheet);

   const areaSheet = workbook.addWorksheet('Theo khu');
   styleHeader(areaSheet.addRow(['Khu', 'Kỳ', 'Doanh thu', 'Đã thu', 'Còn nợ']));
   for (const row of statsRepo.revenueByArea(filter.monthsBack ?? 12)) {
      areaSheet.addRow([
         row.area_name,
         row.period,
         row.total_revenue,
         row.paid_revenue,
         row.debt_amount,
      ]);
   }
   setVndColumns(areaSheet, ['C', 'D', 'E']);
   autoWidth(areaSheet);

   await workbook.xlsx.writeFile(filePath);
   return { success: true, filePath };
   });
}

export async function exportTenantsList(savePath?: string) {
   return withExportErrorBoundary('Xuất Excel khách thuê', async () => {
   const tenants = tenantsRepo.listAll();
   const filePath = await chooseSavePath('Danh-sach-khach-thue.xlsx', savePath);
   if (!filePath) return { canceled: true };

   const workbook = new ExcelJS.Workbook();
   workbook.creator = 'PhongTroApp';
   const sheet = workbook.addWorksheet('Khách thuê');

   styleHeader(
      sheet.addRow([
         'Họ tên',
         'CCCD',
         'Ngày sinh',
         'SĐT',
         'Thường trú',
         'Khu',
         'Phòng',
         'Người đại diện',
         'Ngày vào',
         'Ngày ra',
         'Tiền cọc',
         'Xe',
      ])
   );

   for (const tenant of tenants) {
      const vehicles = vehiclesRepo
         .listByTenant(tenant.id)
         .map((vehicle) => `${vehicle.plate_number} (${vehicle.vehicle_type})`)
         .join(', ');

      sheet.addRow([
         tenant.full_name,
         tenant.cccd,
         tenant.dob,
         tenant.phone,
         tenant.permanent_address,
         tenant.area_name ?? '',
         tenant.room_name ?? '',
         tenant.is_primary ? 'Có' : '',
         tenant.move_in_date,
         tenant.move_out_date,
         tenant.deposit, // raw number để sort/filter trong Excel
         vehicles,
      ]);
   }

   // Cột K = Tiền cọc
   setVndColumns(sheet, ['K']);
   autoWidth(sheet);
   await workbook.xlsx.writeFile(filePath);
   return { success: true, filePath };
   });
}
