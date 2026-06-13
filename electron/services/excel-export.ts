/**
 * Excel export service: xuất hóa đơn, báo cáo doanh thu và danh sách khách thuê.
 */

import ExcelJS from 'exceljs';
import * as invoicesRepo from '../database/repositories/invoices.repo';
import * as tenantsRepo from '../database/repositories/tenants.repo';
import * as vehiclesRepo from '../database/repositories/vehicles.repo';
import * as statsRepo from '../database/repositories/stats.repo';
import * as settingsRepo from '../database/repositories/settings.repo';

const electronModule = require('electron') as typeof import('electron') | string;
const dialog = typeof electronModule === 'string' ? null : electronModule.dialog;

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

export async function exportInvoiceExcel(invoiceId: number, savePath?: string) {
   return withExportErrorBoundary('Xuất Excel hóa đơn', async () => {
   const invoice = invoicesRepo.getById(invoiceId);
   if (!invoice) throw new Error('Không tìm thấy hóa đơn');

   const settings = settingsRepo.getMany(['landlord_name', 'landlord_phone', 'landlord_address']);
   const filePath = await chooseSavePath(`Hoa-don-${invoice.room_name}-${invoice.period}.xlsx`, savePath);
   if (!filePath) return { canceled: true };

   const workbook = new ExcelJS.Workbook();
   workbook.creator = 'PhongTroApp';
   const sheet = workbook.addWorksheet('Hóa đơn');

   sheet.addRow(['PhongTroApp - Hóa đơn phòng trọ']);
   sheet.addRow(['Chủ trọ', settings.landlord_name ?? '']);
   sheet.addRow(['SĐT', settings.landlord_phone ?? '']);
   sheet.addRow(['Địa chỉ', settings.landlord_address ?? '']);
   sheet.addRow([]);
   sheet.addRow(['Phòng', invoice.room_name]);
   sheet.addRow(['Khu', invoice.area_name]);
   sheet.addRow(['Khách thuê', invoice.tenant_name ?? '']);
   sheet.addRow(['Kỳ', invoice.period]);
   sheet.addRow([]);

   styleHeader(sheet.addRow(['Khoản phí', 'Số lượng', 'Đơn giá', 'Thành tiền']));
   sheet.addRow(['Tiền phòng', 1, invoice.room_fee, invoice.room_fee]);
   sheet.addRow(['Tiền điện', '', '', invoice.electric_fee]);
   sheet.addRow(['Tiền nước', '', '', invoice.water_fee]);
   for (const service of invoice.services ?? []) {
      sheet.addRow([service.service_name, service.quantity, service.unit_price, service.amount]);
   }
   sheet.addRow([]);
   sheet.addRow(['Tổng tiền', '', '', invoice.total]);
   sheet.addRow(['Đã thu', '', '', invoice.paid_amount]);
   sheet.addRow(['Còn nợ', '', '', invoice.total - invoice.paid_amount]);
   sheet.addRow(['Trạng thái', invoice.status]);

   // Cột D (Thành tiền), cột C (Đơn giá) là tiền — format VND
   setVndColumns(sheet, ['C', 'D']);
   autoWidth(sheet);
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
