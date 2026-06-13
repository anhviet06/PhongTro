/**
 * Contract generation service: gom dữ liệu hợp đồng và xuất Word/PDF.
 */

import fs from 'fs';
import path from 'path';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
// Dùng `pdfkit.standalone` để fonts AFM được inline base64.
// Bản default `pdfkit` đọc font file qua fs.readFileSync(__dirname + '/data/Helvetica.afm')
// — khi bundle qua Rollup vào main.cjs, __dirname không trỏ đúng → font load fail → throw.
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import * as contractsRepo from '../database/repositories/contracts.repo';
import * as tenantsRepo from '../database/repositories/tenants.repo';
import * as vehiclesRepo from '../database/repositories/vehicles.repo';
import * as settingsRepo from '../database/repositories/settings.repo';

const electronModule = require('electron') as typeof import('electron') | string;
const dialog = typeof electronModule === 'string' ? null : electronModule.dialog;

const VIETNAMESE_FONT_NAME = 'PhongTroVN';

export interface ContractData {
   contract_id: number;
   room_name: string;
   area_name: string;
   landlord: {
      name: string;
      cccd: string;
      phone: string;
      address: string;
   };
   tenant: {
      name: string;
      cccd: string;
      phone: string;
      address: string;
   };
   rent_price: number;
   deposit: number;
   start_date: string;
   end_date: string;
   terms: string;
   occupants: string[];
   vehicles: string[];
}

function formatVnd(value: number): string {
   return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
   }).format(value);
}

function resolvePdfFont(): string | null {
   // Ưu tiên fonts đảm bảo tiếng Việt trên Windows (Tahoma được MS chọn làm font Unicode chính).
   // Times New Roman cũng có Vietnamese subset đầy đủ và phù hợp văn bản pháp lý.
   const candidates = [
      'C:\\Windows\\Fonts\\times.ttf', // Times New Roman — chuẩn cho HĐ pháp lý
      'C:\\Windows\\Fonts\\tahoma.ttf', // Tahoma — MS recommended cho Vietnamese
      'C:\\Windows\\Fonts\\segoeui.ttf', // Segoe UI — default Windows 10/11
      'C:\\Windows\\Fonts\\arial.ttf',
      '/Library/Fonts/Arial Unicode.ttf',
      '/System/Library/Fonts/Supplemental/Times New Roman.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
   ];

   return candidates.find((fontPath) => fs.existsSync(fontPath)) ?? null;
}

/** Format ngày dạng "ngày X tháng Y năm Z" cho header HĐ. */
function formatVietnameseDate(isoDate: string): string {
   if (!isoDate) return '';
   const date = new Date(isoDate);
   if (Number.isNaN(date.getTime())) return isoDate;
   return `ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
}

async function chooseSavePath(
   defaultPath: string,
   extension: 'docx' | 'pdf',
   savePath?: string
): Promise<string | null> {
   if (savePath) return savePath;
   if (!dialog) throw new Error('Không thể mở hộp thoại lưu file trong môi trường hiện tại');

   const result = await dialog.showSaveDialog({
      title: 'Lưu hợp đồng',
      defaultPath,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
   });

   if (result.canceled || !result.filePath) return null;
   return result.filePath;
}

export function generateContractData(contractId: number): ContractData {
   const contract = contractsRepo.getById(contractId);
   if (!contract) throw new Error('Không tìm thấy hợp đồng');

   const settings = settingsRepo.getMany([
      'landlord_name',
      'landlord_cccd',
      'landlord_phone',
      'landlord_address',
   ]);

   const primaryTenant = contract.primary_tenant_id
      ? tenantsRepo.getById(contract.primary_tenant_id)
      : null;
   const tenants = tenantsRepo.listByRoom(contract.room_id);
   const vehicles = tenants.flatMap((tenant) => vehiclesRepo.listByTenant(tenant.id));

   return {
      contract_id: contract.id,
      room_name: contract.room_name,
      area_name: contract.area_name,
      landlord: {
         name: contract.landlord_name || settings.landlord_name || '',
         cccd: contract.landlord_cccd || settings.landlord_cccd || '',
         phone: contract.landlord_phone || settings.landlord_phone || '',
         address: contract.landlord_address || settings.landlord_address || '',
      },
      tenant: {
         name: primaryTenant?.full_name ?? contract.tenant_name ?? '',
         cccd: primaryTenant?.cccd ?? '',
         phone: primaryTenant?.phone ?? contract.tenant_phone ?? '',
         address: primaryTenant?.permanent_address ?? '',
      },
      rent_price: contract.rent_price,
      deposit: contract.deposit,
      start_date: contract.start_date,
      end_date: contract.end_date,
      terms: contract.terms,
      occupants: tenants.map((tenant) => tenant.full_name),
      vehicles: vehicles.map((vehicle) =>
         [vehicle.plate_number, vehicle.vehicle_type].filter(Boolean).join(' - ')
      ),
   };
}

/**
 * Sinh nội dung HĐ theo cấu trúc chuẩn HĐ thuê nhà trọ Việt Nam:
 * - Quốc hiệu + tiêu ngữ
 * - Tiêu đề + số HĐ + ngày ký
 * - Bên A (Chủ trọ) + Bên B (Khách thuê)
 * - 8 Điều khoản chính
 * - Hiệu lực + chữ ký 2 bên
 *
 * Reference: mẫu HĐ thuê phòng trọ phổ biến trên thuvienphapluat.vn / luatvietnam.vn
 */
function contractLines(data: ContractData): string[] {
   const today = formatVietnameseDate(new Date().toISOString().slice(0, 10));
   const startDate = data.start_date ? formatVietnameseDate(data.start_date) : '_____';
   const endDate = data.end_date ? formatVietnameseDate(data.end_date) : '';
   const durationLine = endDate
      ? `Thời hạn thuê: từ ${startDate} đến ${endDate}.`
      : `Thời hạn thuê: từ ${startDate} (không xác định thời hạn).`;

   const occupantsLine = data.occupants.length
      ? `Người ở cùng (${data.occupants.length} người): ${data.occupants.join(', ')}.`
      : 'Người ở cùng: không.';

   const vehiclesLine = data.vehicles.length
      ? `Phương tiện đăng ký: ${data.vehicles.join('; ')}.`
      : 'Phương tiện đăng ký: không.';

   return [
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc lập – Tự do – Hạnh phúc',
      '____________',
      '',
      `Hà Nội, ${today}`,
      '',
      'HỢP ĐỒNG THUÊ PHÒNG TRỌ',
      `Số: HĐTPT-${String(data.contract_id).padStart(4, '0')}/${new Date().getFullYear()}`,
      '',
      '- Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;',
      '- Căn cứ Luật Nhà ở số 65/2014/QH13 ngày 25/11/2014;',
      '- Căn cứ nhu cầu và khả năng của hai bên.',
      '',
      `Hôm nay, ${today}, tại địa chỉ: ${data.landlord.address || '_____'}, chúng tôi gồm:`,
      '',
      'BÊN CHO THUÊ (Bên A):',
      `   Họ và tên:        ${data.landlord.name || '_____'}`,
      `   Số CCCD/CMND:     ${data.landlord.cccd || '_____'}`,
      `   Số điện thoại:    ${data.landlord.phone || '_____'}`,
      `   Địa chỉ thường trú: ${data.landlord.address || '_____'}`,
      '',
      'BÊN THUÊ (Bên B):',
      `   Họ và tên:        ${data.tenant.name || '_____'}`,
      `   Số CCCD/CMND:     ${data.tenant.cccd || '_____'}`,
      `   Số điện thoại:    ${data.tenant.phone || '_____'}`,
      `   Địa chỉ thường trú: ${data.tenant.address || '_____'}`,
      '',
      'Sau khi bàn bạc, hai bên thống nhất ký kết Hợp đồng thuê phòng trọ với các điều khoản như sau:',
      '',
      'ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG',
      `Bên A đồng ý cho Bên B thuê phòng trọ có thông tin sau:`,
      `- Số phòng: ${data.room_name}`,
      `- Thuộc khu: ${data.area_name}`,
      `- Mục đích sử dụng: để ở.`,
      occupantsLine,
      vehiclesLine,
      '',
      'ĐIỀU 2: THỜI HẠN THUÊ',
      durationLine,
      'Hết thời hạn, nếu hai bên đồng thuận có thể tiếp tục ký gia hạn bằng văn bản.',
      '',
      'ĐIỀU 3: GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN',
      `1. Giá thuê: ${formatVnd(data.rent_price)}/tháng (đã bao gồm tiền thuê phòng, chưa bao gồm điện, nước và các dịch vụ phát sinh).`,
      `2. Tiền đặt cọc: ${formatVnd(data.deposit)}, Bên B đã giao cho Bên A khi ký hợp đồng.`,
      '3. Hình thức thanh toán: tiền mặt hoặc chuyển khoản, trước ngày 05 hàng tháng.',
      '4. Tiền điện, nước, internet, vệ sinh, gửi xe... tính theo đơn giá thực tế ghi trong hóa đơn hàng tháng.',
      '',
      'ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A',
      '1. Bàn giao phòng đúng hiện trạng thỏa thuận, đảm bảo điện nước sinh hoạt.',
      '2. Thông báo trước ít nhất 30 ngày khi cần lấy lại phòng hoặc thay đổi giá thuê.',
      '3. Hoàn trả tiền cọc khi Bên B chấm dứt hợp đồng đúng quy định và không gây thiệt hại.',
      '4. Đảm bảo Bên B sử dụng phòng ổn định, không bị quấy rầy bởi bên thứ ba.',
      '',
      'ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B',
      '1. Thanh toán tiền thuê và các chi phí phát sinh đầy đủ, đúng hạn.',
      '2. Giữ gìn tài sản, vệ sinh chung, an ninh trật tự khu trọ; chấp hành nội quy.',
      '3. Không tự ý cho người khác ở chung, chuyển nhượng phòng hoặc cho thuê lại.',
      '4. Không tự ý sửa chữa, thay đổi kết cấu phòng khi chưa được Bên A đồng ý.',
      '5. Đăng ký tạm trú tạm vắng theo quy định pháp luật.',
      '6. Bồi thường thiệt hại nếu làm hư hỏng tài sản của Bên A.',
      '',
      'ĐIỀU 6: CHẤM DỨT HỢP ĐỒNG',
      '1. Hợp đồng chấm dứt khi hết thời hạn và hai bên không gia hạn.',
      '2. Bên đơn phương chấm dứt trước thời hạn phải báo trước ít nhất 30 ngày.',
      '3. Bên B chấm dứt trước thời hạn mà không có lý do chính đáng sẽ mất tiền cọc.',
      '4. Bên A chấm dứt trước thời hạn mà không có lý do chính đáng phải hoàn cọc và bồi thường 1 tháng tiền thuê.',
      '',
      'ĐIỀU 7: GIẢI QUYẾT TRANH CHẤP',
      'Mọi tranh chấp phát sinh từ hợp đồng sẽ được hai bên thương lượng giải quyết. Trường hợp không thống nhất, sẽ đưa ra Tòa án có thẩm quyền giải quyết theo quy định pháp luật.',
      '',
      'ĐIỀU 8: ĐIỀU KHOẢN CHUNG',
      '1. Hai bên cam kết thực hiện đầy đủ các điều khoản trên.',
      '2. Mọi sửa đổi, bổ sung phải được lập thành văn bản và có chữ ký của hai bên.',
      '3. Hợp đồng có hiệu lực kể từ ngày ký, được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.',
      data.terms ? `4. Điều khoản bổ sung: ${data.terms}` : '',
      '',
      '',
      '    ĐẠI DIỆN BÊN A                                          ĐẠI DIỆN BÊN B',
      '       (Ký, ghi rõ họ tên)                                     (Ký, ghi rõ họ tên)',
      '',
      '',
      '',
      '',
      `   ${data.landlord.name || '...........................'}                                     ${data.tenant.name || '...........................'}`,
   ].filter((line) => line !== null && line !== undefined);
}

function contractParagraphs(data: ContractData): Paragraph[] {
   return contractLines(data).map(
      (line) =>
         new Paragraph({
            children: [new TextRun(line)],
            spacing: { after: 160 },
         })
   );
}

export async function exportContractWord(contractId: number, savePath?: string) {
   try {
      const data = generateContractData(contractId);
      const filePath = await chooseSavePath(`Hop-dong-${data.room_name}.docx`, 'docx', savePath);
      if (!filePath) return { canceled: true };

      const doc = new Document({
         sections: [
            {
               children: [
                  new Paragraph({
                     text: 'Hợp Đồng Thuê Phòng Trọ',
                     heading: HeadingLevel.HEADING_1,
                     alignment: AlignmentType.CENTER,
                     spacing: { after: 300 },
                  }),
                  ...contractParagraphs(data),
               ],
            },
         ],
      });

      const buffer = await Packer.toBuffer(doc);
      await fs.promises.writeFile(filePath, buffer);
      return { success: true, filePath };
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[contract-gen] exportContractWord failed:', error);
      throw new Error(`Xuất Word thất bại: ${message}`);
   }
}

export async function exportContractPdf(contractId: number, savePath?: string) {
   try {
      const data = generateContractData(contractId);
      const filePath = await chooseSavePath(`Hop-dong-${data.room_name}.pdf`, 'pdf', savePath);
      if (!filePath) return { canceled: true };

      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

      const fontPath = resolvePdfFont();
      if (!fontPath) {
         throw new Error(
            'Không tìm thấy font hỗ trợ tiếng Việt (Times/Tahoma/Arial). PDF sẽ bị lỗi dấu — vui lòng dùng "Xuất Word" thay vào.'
         );
      }

      // Đọc TTF font buffer bằng Node fs (KHÔNG truyền path string vào registerFont).
      // pdfkit-standalone bundle dùng virtual-fs shim không có readFileSync → nếu pass path
      // sẽ throw `fs2.readFileSync is not a function`. Buffer thì pdfkit nhận thẳng.
      const fontBuffer = fs.readFileSync(fontPath);

      await new Promise<void>((resolve, reject) => {
         const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            info: {
               Title: `Hợp đồng thuê phòng trọ — ${data.room_name}`,
               Author: data.landlord.name || 'PhongTroApp',
               Subject: 'Hợp đồng thuê phòng trọ',
            },
         });
         const stream = fs.createWriteStream(filePath);

         stream.on('finish', resolve);
         stream.on('error', reject);
         doc.on('error', reject);
         doc.pipe(stream);

         // Đăng ký font TTF (qua Buffer) với tên rõ ràng + load BEFORE text — quan trọng để
         // mọi glyph (kể cả diacritics) đều dùng font Unicode.
         doc.registerFont(VIETNAMESE_FONT_NAME, fontBuffer);
         doc.font(VIETNAMESE_FONT_NAME);

         // Tiêu đề lớn
         doc.fontSize(16).text('HỢP ĐỒNG THUÊ PHÒNG TRỌ', { align: 'center', characterSpacing: 1 });
         doc.moveDown(0.8);

         for (const line of contractLines(data)) {
            // Heading detection: dòng all-caps đậm hơn 1 chút
            const isHeading = /^(ĐIỀU \d+|CỘNG HÒA|BÊN [A-Z]+|HỢP ĐỒNG)/.test(line);
            const isCenterHeader = /^(CỘNG HÒA|Độc lập|HỢP ĐỒNG|Số:|____)/.test(line);

            if (isHeading && !isCenterHeader) {
               doc.fontSize(12).text(line, { lineGap: 4, continued: false });
            } else if (isCenterHeader) {
               doc.fontSize(11).text(line, { align: 'center', lineGap: 4 });
            } else {
               doc.fontSize(11).text(line, { lineGap: 4 });
            }
            doc.moveDown(0.2);
         }

         doc.end();
      });

      return { success: true, filePath };
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[contract-gen] exportContractPdf failed:', error);
      throw new Error(`Xuất PDF thất bại: ${message}`);
   }
}
