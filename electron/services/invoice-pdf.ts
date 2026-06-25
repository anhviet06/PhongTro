/**
 * Invoice PDF export — render hóa đơn theo mẫu "BẢNG DỊCH VỤ THUÊ NHÀ".
 *
 * Layout (A4 portrait, margin 36):
 *   Header 3 cột:
 *     - Trái: Tháng / Phòng / Địa chỉ (xếp dọc)
 *     - Giữa: tiêu đề "BẢNG DỊCH VỤ THUÊ NHÀ" (18pt bold)
 *     - Phải: "Nội dung CK: Phòng X" + QR (130×130)
 *
 *   Bảng dịch vụ fill width: 7 cột — No (8%) | Tên DV (24%) | Chỉ số cũ (12%) |
 *   Chỉ số mới (12%) | Tổng (9%) | Đơn giá (15%) | Thành tiền (20%)
 *
 *   6 dòng dữ liệu + hàng TỔNG (merge label) + footer chú ý đỏ.
 *
 * QR resolve: %APPDATA%/phongtro-app/qr-payment.png → dist/qr-payment.png → public/qr-payment.png.
 */

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import * as invoicesRepo from '../database/repositories/invoices.repo';
import * as roomsRepo from '../database/repositories/rooms.repo';
import * as metersRepo from '../database/repositories/meters.repo';
import * as settingsRepo from '../database/repositories/settings.repo';

const electronModule = require('electron') as typeof import('electron') | string;
const dialog = typeof electronModule === 'string' ? null : electronModule.dialog;
const app = typeof electronModule === 'string' ? null : electronModule.app;

const VIETNAMESE_FONT_NAME = 'PhongTroInvoice';
const VIETNAMESE_FONT_BOLD_NAME = 'PhongTroInvoiceBold';

function resolvePdfFont(): string | null {
   const candidates = [
      'C:\\Windows\\Fonts\\times.ttf',
      'C:\\Windows\\Fonts\\tahoma.ttf',
      'C:\\Windows\\Fonts\\segoeui.ttf',
      'C:\\Windows\\Fonts\\arial.ttf',
      '/Library/Fonts/Arial Unicode.ttf',
      '/System/Library/Fonts/Supplemental/Times New Roman.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
   ];
   return candidates.find((fontPath) => fs.existsSync(fontPath)) ?? null;
}

function resolvePdfFontBold(): string | null {
   const candidates = [
      'C:\\Windows\\Fonts\\timesbd.ttf', // Times New Roman Bold
      'C:\\Windows\\Fonts\\tahomabd.ttf', // Tahoma Bold
      'C:\\Windows\\Fonts\\seguibl.ttf',
      'C:\\Windows\\Fonts\\arialbd.ttf',
   ];
   return candidates.find((fontPath) => fs.existsSync(fontPath)) ?? null;
}

function findQrPaymentImage(): { path: string | null; tried: string[] } {
   const candidates: string[] = [];
   if (app) {
      try {
         candidates.push(path.join(app.getPath('userData'), 'qr-payment.png'));
      } catch {
         // ignore
      }
      try {
         const appPath = app.getAppPath();
         candidates.push(path.join(appPath, 'dist', 'qr-payment.png'));
         candidates.push(path.join(appPath, 'public', 'qr-payment.png'));
         candidates.push(path.join(appPath, '..', 'public', 'qr-payment.png'));
         // Dev mode khi main process chạy từ dist-electron/main.cjs:
         // app.getAppPath() = project root → public/ là path trực tiếp.
         // Production packaged: app.asar/dist/qr-payment.png (vite copy từ public/).
         // Resource extras: resources/public/qr-payment.png (nếu cấu hình electron-builder)
         candidates.push(path.join(process.resourcesPath ?? '', 'public', 'qr-payment.png'));
         candidates.push(path.join(process.resourcesPath ?? '', 'qr-payment.png'));
      } catch {
         // ignore
      }
   }
   try {
      candidates.push(path.join(process.cwd(), 'public', 'qr-payment.png'));
   } catch {
      // ignore
   }

   console.log('[invoice-pdf] QR search candidates:');
   candidates.forEach((p, i) => {
      const exists = fs.existsSync(p);
      console.log(`  [${i}] ${exists ? '✓' : '✗'} ${p}`);
   });

   const found = candidates.find((p) => fs.existsSync(p));
   return { path: found ?? null, tried: candidates };
}

async function chooseSavePath(defaultPath: string, savePath?: string): Promise<string | null> {
   if (savePath) return savePath;
   if (!dialog) throw new Error('Không thể mở hộp thoại lưu file');
   const result = await dialog.showSaveDialog({
      title: 'Lưu hóa đơn PDF',
      defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
   });
   if (result.canceled || !result.filePath) return null;
   return result.filePath;
}

function formatVnd(value: number): string {
   if (!Number.isFinite(value) || value === 0) return '';
   return new Intl.NumberFormat('vi-VN').format(value);
}

export async function exportInvoicePdf(invoiceId: number, savePath?: string) {
   try {
      const invoice = invoicesRepo.getById(invoiceId);
      if (!invoice) throw new Error('Không tìm thấy hóa đơn');

      const room = roomsRepo.getById(invoice.room_id);
      const meter = metersRepo.getByRoomPeriod(invoice.room_id, invoice.period);
      const settings = settingsRepo.getMany(['landlord_address']);

      const filePath = await chooseSavePath(
         `Hoa-don-${invoice.room_name}-${invoice.period}.pdf`,
         savePath
      );
      if (!filePath) return { canceled: true };

      const fontPath = resolvePdfFont();
      if (!fontPath) throw new Error('Không tìm thấy font hỗ trợ tiếng Việt');
      const fontBuffer = fs.readFileSync(fontPath);

      const fontBoldPath = resolvePdfFontBold();
      const fontBoldBuffer = fontBoldPath ? fs.readFileSync(fontBoldPath) : null;

      const monthLabel = (() => {
         const match = /^(\d{4})-(\d{2})$/.exec(invoice.period);
         if (match) return `Tháng ${parseInt(match[2], 10)}`;
         return invoice.period;
      })();

      const address = settings.landlord_address || 'Số 4 Ngách 99 Ngõ 318 Đê La Thành';

      // Lookup services
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

      const electricQty = meter ? meter.electric_end - meter.electric_start : 0;
      const waterQty = meter ? meter.water_end - meter.water_start : 0;
      const electricUnit =
         room?.electric_unit_price ?? (electricQty > 0 ? invoice.electric_fee / electricQty : 0);
      const waterUnit =
         room?.water_unit_price ?? (waterQty > 0 ? invoice.water_fee / waterQty : 0);

      const qrResult = findQrPaymentImage();
      const qrPath = qrResult.path;
      // Đọc QR thành data URL base64 — tránh pdfkit-standalone gọi fs.readFileSync shim
      // (bug: standalone bundle thay fs bằng virtual shim không có readFileSync).
      const qrDataUrl = qrPath
         ? `data:image/png;base64,${fs.readFileSync(qrPath).toString('base64')}`
         : null;

      await new Promise<void>((resolve, reject) => {
         const doc = new PDFDocument({
            margin: 36,
            size: 'A4',
            info: {
               Title: `Hóa đơn — ${invoice.room_name} kỳ ${invoice.period}`,
               Author: 'PhongTroApp',
            },
         });
         const stream = fs.createWriteStream(filePath);
         stream.on('finish', resolve);
         stream.on('error', reject);
         doc.on('error', reject);
         doc.pipe(stream);

         doc.registerFont(VIETNAMESE_FONT_NAME, fontBuffer);
         if (fontBoldBuffer) doc.registerFont(VIETNAMESE_FONT_BOLD_NAME, fontBoldBuffer);
         doc.font(VIETNAMESE_FONT_NAME);

         const pageMargin = 36;
         const pageWidth = doc.page.width; // ~595 portrait A4
         const contentLeft = pageMargin;
         const contentRight = pageWidth - pageMargin;
         const contentWidth = contentRight - contentLeft;

         // ========================================
         // HEADER 3 cột
         // ========================================
         const headerTop = pageMargin;
         const qrSize = 130;
         const rightColX = contentRight - qrSize;
         const leftColWidth = 200;

         // Trái: thông tin
         const useBold = (active: boolean) => {
            if (active && fontBoldBuffer) doc.font(VIETNAMESE_FONT_BOLD_NAME);
            else doc.font(VIETNAMESE_FONT_NAME);
         };

         useBold(true);
         doc.fontSize(11).fillColor('#000000');
         doc.text('Tháng:', contentLeft, headerTop, { continued: true, width: leftColWidth });
         useBold(false);
         doc.text(`  ${monthLabel}`);

         useBold(true);
         doc.fontSize(11).text('Phòng:', contentLeft, headerTop + 18, {
            continued: true,
            width: leftColWidth,
         });
         useBold(false);
         doc.text(`  ${invoice.room_name}`);

         useBold(true);
         doc
            .fontSize(11)
            .fillColor('#C00000')
            .text('Địa chỉ:', contentLeft, headerTop + 36, { continued: true, width: leftColWidth });
         useBold(false);
         doc.text(`  ${address}`);
         doc.fillColor('#000000');

         // Giữa: tiêu đề (canh giữa toàn page width)
         useBold(true);
         doc.fontSize(18).text('BẢNG DỊCH VỤ THUÊ NHÀ', contentLeft, headerTop + 18, {
            width: contentWidth,
            align: 'center',
         });
         useBold(false);

         // Phải: nội dung CK + QR (đặt sau cùng để không bị canh giữa che)
         useBold(true);
         doc.fontSize(10).text(`Nội dung CK: Phòng ${invoice.room_name}`, rightColX, headerTop, {
            width: qrSize,
            align: 'center',
         });
         useBold(false);
         if (qrDataUrl) {
            try {
               doc.image(qrDataUrl, rightColX, headerTop + 16, {
                  width: qrSize,
                  height: qrSize,
               });
               console.log(`[invoice-pdf] QR embedded từ: ${qrPath}`);
            } catch (err) {
               console.error('[invoice-pdf] pdfkit reject QR data URL:', err);
               doc
                  .fontSize(7)
                  .fillColor('#C00000')
                  .text(`QR error: ${String(err).slice(0, 80)}`, rightColX, headerTop + 50, {
                     width: qrSize,
                     align: 'center',
                  })
                  .fillColor('#000000');
            }
         } else {
            doc
               .fontSize(7)
               .fillColor('#999999')
               .text(
                  `QR chưa có (đã thử ${qrResult.tried.length} path — xem console log)`,
                  rightColX,
                  headerTop + 50,
                  { width: qrSize, align: 'center' }
               )
               .fillColor('#000000');
         }

         // ========================================
         // BẢNG — fill content width
         // ========================================
         const tableTop = headerTop + qrSize + 28;
         // Tổng = 523 (= contentWidth ~ 523)
         const colWidths = [
            Math.round(contentWidth * 0.06), // No
            Math.round(contentWidth * 0.24), // Tên DV
            Math.round(contentWidth * 0.12), // Chỉ số cũ
            Math.round(contentWidth * 0.12), // Chỉ số mới
            Math.round(contentWidth * 0.08), // Tổng
            Math.round(contentWidth * 0.16), // Đơn giá
            0, // Thành tiền (lấy phần còn lại)
         ];
         colWidths[6] = contentWidth - colWidths.slice(0, 6).reduce((a, b) => a + b, 0);

         const colX: number[] = [];
         let runningX = contentLeft;
         for (const w of colWidths) {
            colX.push(runningX);
            runningX += w;
         }

         const rowH = 26;

         const drawCell = (
            text: string,
            x: number,
            y: number,
            w: number,
            h: number,
            opts: {
               align?: 'left' | 'center' | 'right';
               bold?: boolean;
               fill?: string;
               fontSize?: number;
               color?: string;
            } = {}
         ) => {
            const align = opts.align ?? 'center';
            const fontSize = opts.fontSize ?? 11;

            if (opts.fill) {
               doc.save().rect(x, y, w, h).fill(opts.fill).restore();
            }
            doc.lineWidth(0.5).rect(x, y, w, h).stroke();

            useBold(!!opts.bold);
            doc.fillColor(opts.color ?? '#000000').fontSize(fontSize);
            const textY = y + (h - fontSize) / 2 - 1;
            doc.text(text, x + 5, textY, {
               width: w - 10,
               align,
               lineBreak: false,
            });
            useBold(false);
         };

         // Header row
         const headers = [
            'No',
            'Tên dịch vụ',
            'Chỉ số cũ',
            'Chỉ số mới',
            'Tổng',
            'Đơn giá',
            'Thành tiền',
         ];
         headers.forEach((label, idx) => {
            drawCell(label, colX[idx], tableTop, colWidths[idx], rowH, {
               align: 'center',
               bold: true,
               fill: '#FCE4D6',
               fontSize: 11,
            });
         });

         // Data rows
         const rows: Array<(string | null)[]> = [
            ['1', 'Phòng', null, null, null, null, formatVnd(invoice.room_fee)],
            [
               '2',
               'Điện',
               meter ? String(meter.electric_start) : '',
               meter ? String(meter.electric_end) : '',
               electricQty ? String(electricQty) : '',
               electricUnit ? formatVnd(Math.round(electricUnit)) : '',
               formatVnd(invoice.electric_fee),
            ],
            [
               '3',
               'Nước',
               meter ? String(meter.water_start) : '',
               meter ? String(meter.water_end) : '',
               waterQty ? String(waterQty) : '',
               waterUnit ? formatVnd(Math.round(waterUnit)) : '',
               formatVnd(invoice.water_fee),
            ],
            [
               '4',
               'Dịch vụ chung',
               null,
               null,
               dvChung?.quantity ? String(dvChung.quantity) : '',
               dvChung?.unit_price ? formatVnd(dvChung.unit_price) : '',
               dvChung?.amount ? formatVnd(dvChung.amount) : '',
            ],
            [
               '5',
               'Internet',
               null,
               null,
               internet?.quantity ? String(internet.quantity) : '',
               internet?.unit_price ? formatVnd(internet.unit_price) : '',
               internet?.amount ? formatVnd(internet.amount) : '',
            ],
            ['6', 'Khác', null, null, null, null, otherTotal ? formatVnd(otherTotal) : ''],
         ];

         rows.forEach((row, rowIdx) => {
            const y = tableTop + rowH * (rowIdx + 1);
            row.forEach((value, colIdx) => {
               const align: 'left' | 'center' | 'right' =
                  colIdx === 1 ? 'left' : colIdx === 0 ? 'center' : 'right';
               drawCell(value ?? '', colX[colIdx], y, colWidths[colIdx], rowH, { align });
            });
         });

         // TỔNG row
         const totalY = tableTop + rowH * (rows.length + 1);
         const totalLabelWidth = colWidths.slice(0, 6).reduce((s, w) => s + w, 0);
         drawCell('TỔNG', colX[0], totalY, totalLabelWidth, rowH, {
            align: 'left',
            bold: true,
            fontSize: 12,
            fill: '#F2F2F2',
         });
         drawCell(formatVnd(invoice.total), colX[6], totalY, colWidths[6], rowH, {
            align: 'right',
            bold: true,
            fill: '#C6EFCE',
            fontSize: 12,
         });

         // ========================================
         // FOOTER — chú ý đỏ
         // ========================================
         const noteY = totalY + rowH + 20;
         useBold(true);
         doc.fontSize(11).fillColor('#C00000');
         doc.text('Chú ý:', contentLeft, noteY, { continued: true });
         useBold(false);
         doc.text(
            ' Thanh toán trong vòng 24h sau khi nhận được hóa đơn dịch vụ. Thanh toán muộn ban quản lý có quyền cắt các dịch vụ chưa thanh toán đúng thời hạn và chưa đủ số tiền, đồng thời phạt cảnh cáo 200.000đ. Xin cảm ơn!',
            { width: contentWidth }
         );
         doc.fillColor('#000000');

         doc.end();
      });

      return { success: true, filePath };
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[invoice-pdf] export failed:', error);
      throw new Error(`Xuất PDF hóa đơn thất bại: ${message}`);
   }
}
