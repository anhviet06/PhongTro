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
   // Format: "2.000.000 VNĐ" — phù hợp văn bản HĐ tiếng Việt (theo template Đê La Thành)
   return `${new Intl.NumberFormat('vi-VN').format(value)} VNĐ`;
}

/** Chuyển số sang chữ tiếng Việt (đơn giản — chỉ phục vụ "Bằng chữ" trên HĐ). */
function numberToVietnameseWords(n: number): string {
   if (n === 0) return 'không đồng';
   const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

   const readThree = (num: number, full: boolean): string => {
      const hundred = Math.floor(num / 100);
      const ten = Math.floor((num % 100) / 10);
      const one = num % 10;
      const parts: string[] = [];
      if (full || hundred > 0) parts.push(`${units[hundred]} trăm`);
      if (ten > 1) {
         parts.push(`${units[ten]} mươi`);
         if (one === 1) parts.push('mốt');
         else if (one === 5) parts.push('lăm');
         else if (one > 0) parts.push(units[one]);
      } else if (ten === 1) {
         parts.push('mười');
         if (one === 5) parts.push('lăm');
         else if (one > 0) parts.push(units[one]);
      } else if (ten === 0 && one > 0) {
         if (full || hundred > 0) parts.push('lẻ');
         parts.push(units[one]);
      }
      return parts.join(' ').trim();
   };

   const billions = Math.floor(n / 1_000_000_000);
   const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
   const thousands = Math.floor((n % 1_000_000) / 1_000);
   const rest = n % 1_000;

   const chunks: string[] = [];
   if (billions > 0) chunks.push(`${readThree(billions, false)} tỷ`);
   if (millions > 0) chunks.push(`${readThree(millions, billions > 0)} triệu`);
   if (thousands > 0) chunks.push(`${readThree(thousands, billions > 0 || millions > 0)} nghìn`);
   if (rest > 0) chunks.push(readThree(rest, billions > 0 || millions > 0 || thousands > 0));

   const text = chunks.join(' ').replace(/\s+/g, ' ').trim() + ' đồng';
   return text.charAt(0).toUpperCase() + text.slice(1);
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
 * Sinh nội dung HĐ thuê phòng theo mẫu chủ trọ (Đê La Thành, Hà Nội).
 *
 * Cấu trúc:
 * - Quốc hiệu + tiêu ngữ
 * - Tiêu đề + ngày
 * - Bên A (cố định: NGUYỄN THỊ THU PHƯƠNG, sẽ lấy từ settings nếu khác)
 * - Bên B (từ tenant data)
 * - 6 Điều với các quy định cụ thể (đặt cọc, thanh toán, chấm dứt, điều khoản chung)
 * - Nhắc lại các điểm quan trọng
 * - Chữ ký 2 bên
 *
 * Thông tin biến thay thế:
 *   {room_name}, {rent_price}, {deposit}, {start_date}, {end_date}, {duration_months},
 *   {people_count}, tenant info, landlord info from settings.
 */
function contractLines(data: ContractData): string[] {
   const now = new Date();
   const startObj = data.start_date ? new Date(data.start_date) : null;
   const endObj = data.end_date ? new Date(data.end_date) : null;

   const dayToday = String(now.getDate()).padStart(2, '0');
   const monthToday = String(now.getMonth() + 1).padStart(2, '0');
   const yearToday = now.getFullYear();

   const startDateStr = startObj
      ? `${String(startObj.getDate()).padStart(2, '0')}/${String(startObj.getMonth() + 1).padStart(2, '0')}/${startObj.getFullYear()}`
      : '____/____/______';
   const endDateStr = endObj
      ? `${String(endObj.getDate()).padStart(2, '0')}/${String(endObj.getMonth() + 1).padStart(2, '0')}/${endObj.getFullYear()}`
      : '____/____/______';

   // Tính thời hạn theo tháng (nếu có cả start/end)
   let durationMonths = '____';
   if (startObj && endObj) {
      const diffMs = endObj.getTime() - startObj.getTime();
      const months = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
      if (months > 0) durationMonths = String(months);
   }

   const peopleCount = data.occupants.length || 1;
   const rentInWords = data.rent_price > 0 ? numberToVietnameseWords(data.rent_price) : '....................................';

   // Landlord info — pre-fill từ settings, default theo template Đê La Thành
   const landlord = {
      name: data.landlord.name || 'NGUYỄN THỊ THU PHƯƠNG',
      cccd: data.landlord.cccd || '033183009152',
      phone: data.landlord.phone || '',
      address:
         data.landlord.address ||
         'Thôn 1, Vạn Phúc, Thanh Trì, Hà Nội',
   };

   const propertyAddress =
      'Số nhà 4, Ngách 99, Ngõ 318, Đường Đê La Thành, Phường Ô Chợ Dừa, Thành Phố Hà Nội';

   return [
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc lập - Tự do - Hạnh Phúc',
      '',
      'HỢP ĐỒNG THUÊ PHÒNG',
      '',
      `Hôm nay, ngày ${dayToday} tháng ${monthToday} năm ${yearToday}, tại địa chỉ ${propertyAddress}.`,
      'Chúng tôi gồm:',
      '',
      'BÊN CHO THUÊ (BÊN A)',
      `Bà:                           ${landlord.name}`,
      `Số CC:                       ${landlord.cccd}`,
      `Ngày cấp:                  27/11/2023`,
      `Nơi cấp:                    Cục cảnh sát`,
      `Địa chỉ thường trú:    ${landlord.address}`,
      '',
      'BÊN THUÊ (BÊN B)',
      `Ông/Bà:                      ${data.tenant.name || '..........................................................'}`,
      `Ngày sinh:                  ..........................................................`,
      `Địa chỉ thường trú:    ${data.tenant.address || '..........................................................'}`,
      `Số CC:                       ${data.tenant.cccd || '..........................................................'}`,
      `Ngày cấp:                  ..........................................................`,
      `Nơi cấp:                    ..........................................................`,
      `Nghề nghiệp:             ..........................................................`,
      `Địa chỉ công tác:      ..........................................................`,
      `Số điện thoại:           ${data.tenant.phone || '..........................................................'}`,
      '',
      'Sau khi bàn bạc, hai bên thống nhất ký kết hợp đồng gồm các điều khoản và điều kiện sau:',
      '',
      'Điều 1:',
      'Bên A đồng ý cho Bên B thuê diện tích dưới đây để sử dụng cụ thể như sau:',
      `1. Phòng ${data.room_name} nằm trong tòa nhà tại địa chỉ ${propertyAddress}.`,
      `2. Giá thuê: ${formatVnd(data.rent_price)}/01 tháng (Bằng chữ: ${rentInWords}).`,
      `3. Thời hạn thuê: ${durationMonths} tháng bắt đầu từ ${startDateStr} đến ${endDateStr}.`,
      `4. Mục đích thuê: Để ở. Số người ở ${peopleCount}. Nếu thêm người phải thông báo và được sự đồng ý của bên A (Bạn bè người thân đến ở phải thông báo trước, quá 2 ngày thì tính là thêm người).`,
      '5. Giá dịch vụ:',
      '   - Tiền điện, phụ phí (thu sau theo thực tế sử dụng): 2.300đ/số + phụ phí 1.700đ/số (có công tơ riêng) (bao gồm tiền điện theo giá trên hóa đơn điện của nhà nước và thỏa thuận ngoài công tơ phụ) (có thể điều chỉnh nếu có sự biến động của giá điện nhà cung cấp).',
      '   - Tiền nước (thu sau theo thực tế sử dụng): 35.000đ/khối (có thể điều chỉnh nếu có điều chỉnh giá của nhà cung cấp).',
      '   - Tiền Internet (thu trước cố định): 100.000đ/phòng/tháng.',
      '   - Tiền dịch vụ chung (thu trước cố định): 250.000đ/người/tháng.',
      '   Tiền dịch vụ hàng tháng bên B thanh toán cho bên A bằng chuyển khoản trong vòng 24h ngay sau khi nhận được phiếu dịch vụ. Tiền dịch vụ được thu đủ theo số lượng người ở trong phòng tính bằng với số lượng đăng ký vân tay ra vào nhà bất kể ở ít hay ở nhiều hay không ở. Tiền dịch vụ được thu tối thiểu nhất là 01 người kể cả trường hợp không ở. Tiền internet được tính bất kể sử dụng hay không.',
      '6. Các trang thiết bị trong phòng và tình trạng sử dụng được liệt kê chi tiết tại Phụ lục hợp đồng kèm theo.',
      '',
      'Điều 2: Quyền lợi và trách nhiệm của mỗi bên.',
      'Bên A',
      '1. Bảo đảm quyền sử dụng phòng cho thuê một cách trọn vẹn, riêng rẽ, ổn định của bên B trong suốt thời gian hợp đồng.',
      '2. Hướng dẫn bên B thực hiện đúng các quy định về đăng kí tạm trú.',
      '3. Sau khi hết hạn hợp đồng, bên A có quyền không tiếp tục gia hạn thêm thời hạn hợp đồng.',
      'Bên B',
      '1. Sử dụng diện tích đã thuê đúng mục đích thuê để ở và sinh hoạt theo đúng số lượng người đăng kí với ban quản lý và không được cho thuê lại căn phòng, không được sang nhượng phòng, không được tổ chức lớp học, hoạt động tập thể xã hội, kinh doanh tại phòng thuê mà không có sự đồng ý trước của bên A hay sử dụng cho bất kỳ mục đích nào khác. Trường hợp bên B tự ý cho thuê lại phòng hoặc sang nhượng phòng cho đối tượng khác thì bên A sẽ trục xuất ngay lập tức đối tượng đó khỏi nhà đồng thời bên B sẽ mất hoàn toàn tất cả các khoản tiền đã đóng cho bên A.',
      '2. Thực hiện nghiêm chỉnh các quy định của nhà nước về an ninh và phòng cháy chữa cháy, không được sử dụng các chất và vật liệu dễ gây cháy nổ, không được làm các công việc dễ gây cháy nổ hoặc các nguy cơ khác ảnh hưởng tới khu vực xung quanh. Bảo đảm vệ sinh môi trường, không gây ô nhiễm môi trường không khí, nguồn nước thải, rác thải và tiếng ồn tại khu vực thuê. Chịu trách nhiệm về hoạt động của mình tại địa điểm thuê.',
      '3. Thanh toán tiền phòng, tiền điện, tiền nước, kết nối internet, phí vệ sinh an ninh chung… theo đúng hạn quy định trong hợp đồng.',
      '4. Khi hết hạn hợp đồng thuê phòng hoặc khi kết thúc hợp đồng có thời hạn, phải bàn giao lại phòng cho bên A nguyên trạng tại thời điểm bàn giao và chịu trách nhiệm bồi thường các trang thiết bị hư hỏng do bên B gây ra. Nếu muốn khoan đục phải được sự đồng ý của bên A. Trường hợp bên B khoan đục thì khi chuyển đi phải chít lại lỗ khoan và sơn lại như ban đầu hoặc thanh toán chi phí cho bên A để bên A khắc phục.',
      '5. Trong thời gian thuê nếu bên B có nhu cầu sửa lại hoặc thay đổi nội, ngoại thất căn phòng phải được sự đồng ý của bên A và việc sửa chữa không làm ảnh hưởng tới kết cấu căn phòng, chi phí sửa chữa thay đổi do bên B chịu.',
      '6. Có trách nhiệm bảo quản tài sản trong căn phòng, sữa chữa và bảo dưỡng các hỏng hóc thông thường liên quan đến kết cấu căn hộ hệ thống điện nước… trong căn hộ mà nguyên nhân từ phía bên B gây ra trong quá trình sử dụng. Tự chịu trách nhiệm về tài sản của mình, xảy ra mất mát bên A hoàn toàn không chịu trách nhiệm. Đồ dùng và các trang thiết bị nơi thuê sẽ được bên A bảo hành trong vòng 15 ngày kể từ ngày ký hợp đồng, sau đó mọi hư hại, hỏng hóc… thì bên B hoàn toàn chịu trách nhiệm.',
      '7. Chấp hành nội quy nơi ở của bên A. Tuyệt đối không để đồ dùng cá nhân (giầy dép, quần áo, giẻ lau…) và rác rưởi cũng như bất kì thứ gì khác ra hành lang chung bên ngoài phòng, không được đóng đinh vào tường.',
      '8. Trong khi sinh hoạt, bên B có trách nhiệm bảo vệ tính mạng những người sinh hoạt trong phòng và bạn bè, người thân đến chơi hoặc sinh hoạt. Nếu xảy ra vấn đề liên quan đến an ninh, vi phạm pháp luật bên B phải chịu hoàn toàn trách nhiệm và hoàn toàn không liên quan trách nhiệm đến bên A.',
      '9. Không tàng trữ, buôn bán và sử dụng các loại hàng hóa mà Nhà Nước và Pháp Luật cấm. Nếu xảy ra vấn đề liên quan đến hàng hóa mà Nhà Nước và Pháp Luật không cho phép thì bên B phải chịu hoàn toàn trách nhiệm và hoàn toàn không liên quan trách nhiệm đến bên A.',
      '10. Có trách nhiệm tự khai báo tạm trú ở khu vực sinh sống trong vòng 7 ngày kể từ ngày chuyển đến ở. Nếu không khai báo mà bị cơ quan có thẩm quyền kiểm tra thì mọi vấn đề phát sinh bên A hoàn toàn không chịu trách nhiệm.',
      '11. Có trách nhiệm mở cửa cho khách xem phòng giúp bên A trong trường hợp muốn chuyển đi.',
      '12. Tuyệt đối không tiết lộ giá thuê cho bất kỳ ai. Trường hợp bên B tiết lộ giá thuê gây ảnh hưởng đến công việc kinh doanh của bên A thì bên A có quyền thanh lý hợp đồng với bên B ngay lập tức và không phải hoàn trả bất kì khoản tiền nào bên B đã đóng.',
      '',
      'Điều 3: Đặt cọc.',
      `Ngay sau khi ký hợp đồng, Bên B đặt cọc một khoản tiền bằng 01 tháng của hợp đồng này (gọi là khoản đặt cọc thực hiện hợp đồng) — số tiền: ${formatVnd(data.deposit)}. Khi kết thúc hợp đồng, tiền đặt cọc sẽ được bên A hoàn trả cho bên B sau khi trừ các khoản mà bên B chưa thanh toán (nếu có) nhưng không vượt quá số tiền đặt cọc, và phải bàn giao đầy đủ đồ đạc nguyên trạng ban đầu.`,
      '',
      'Điều 4: Phương thức thanh toán.',
      '1. Tiền thuê phòng được bên B thanh toán cho bên A trước khi sử dụng, 01 tháng/lần và chuyển cho bên A vào ngày 25 dương lịch các kỳ nộp tiền tiếp theo của tháng. Hoặc trước 05 ngày so với ngày hết tiền phòng của bên B.',
      '2. Nếu bên B thanh toán muộn hoặc thiếu tiền thuê phòng quá 02 ngày từ ngày thanh toán quy định trong hợp đồng và các khoản phí quy định khác thì phải chịu mức phạt 200.000đ/ngày.',
      '   Ngày thanh toán quy định trong hợp đồng được hiểu là ngày 25 dương lịch hoặc 05 ngày trước ngày hết tiền phòng của bên B.',
      '   Khoản phạt thanh toán chậm sẽ được bên A thu trực tiếp hoặc trừ trực tiếp vào tiền đặt cọc của bên B.',
      '3. Tiền thuê phòng được bên B thanh toán trực tiếp cho bên A bằng tiền mặt hoặc chuyển khoản.',
      '',
      'Điều 5: Chấm dứt hợp đồng.',
      '1. Hợp đồng này chấm dứt trong trường hợp bên B bị ban quản lý trục xuất do vi phạm an ninh trật tự, do vi phạm Pháp Luật hoặc do yêu cầu của cơ quan chức năng, bên A không có trách nhiệm bồi hoàn các khoản tiền đã đóng.',
      '2. Hợp đồng chấm dứt trước thời hạn trong trường hợp căn nhà của bên A hư hỏng nặng do những nguyên nhân bất khả kháng nằm ngoài tầm kiểm soát của bên A (Chiến tranh, hỏa hoạn, động đất,…) dẫn đến bên B không thể tiếp tục ở.',
      '3. Nếu một trong hai bên (bên A hoặc bên B) vi phạm các điều khoản đã kí kết thì bên còn lại sẽ có quyền đơn phương chấm dứt hợp đồng sau khi thông báo lý do cho bên vi phạm biết. Bên vi phạm sẽ phải bồi thường cho bên còn lại số tiền tương đương 01 tháng tiền phòng.',
      '4. Nếu Bên B chấm dứt hợp đồng trước thời hạn với những lý do không nằm trong điểm 1, 2 và 3 của điều này thì phải thông báo cho bên A biết trước ít nhất 30 ngày và bồi thường số tiền bằng 01 tháng tiền thuê phòng.',
      '5. Nếu bên B chậm thanh toán 4 ngày mà không có sự chấp thuận của Bên A thì coi như Bên B chấm dứt hợp đồng trước thời hạn và thực thi theo mục 3 của điều này.',
      '6. Trước khi hết hạn hợp đồng, nếu bên B không có nhu cầu thuê nữa thì phải báo trước cho bên A ít nhất 30 ngày trước ngày hợp đồng hết hạn. Trường hợp thông báo muộn (không đủ 30 ngày) thì bên A sẽ không tiếp nhận yêu cầu thanh lý hợp đồng. Trường hợp bên B không thông báo gì hoặc thông báo muộn (không đủ 30 ngày trước ngày hợp đồng hết hạn) thì hợp đồng mặc định được gia hạn đến ngày 30/8 gần nhất. Hợp đồng được gia hạn có giá trị như hợp đồng kí lần đầu. Và tương tự tự động gia hạn cho các lần kết thúc hợp đồng tiếp theo.',
      '7. Tất cả các khoản tiền phòng và tiền dịch vụ đã đóng trước đều không được hoàn lại trong mọi trường hợp dù đã sử dụng hay chưa sử dụng.',
      '8. Bên A có quyền chỉ tiếp nhận ngày chấm dứt hợp đồng vào đúng ngày cuối tháng dương lịch.',
      '9. Trong khoảng thời gian từ ngày 01/12 đến ngày 31/3 hàng năm, bên A sẽ không tiếp nhận bất cứ yêu cầu thanh lý hợp đồng nào từ bên B dù thời hạn hợp đồng còn hay hết. Trường hợp bên B chuyển đi trong khoảng thời gian này thì bên A không có trách nhiệm phải trả lại bất cứ khoản tiền nào mà bên B đã đóng.',
      '10. Sau khi hợp đồng chấm dứt, bên B sẽ chuyển tất cả đồ đạc và con người ra khỏi tòa nhà đồng thời thông báo cho bên A thông tin tài khoản của mình. Bên A sẽ kiểm tra, tính toán và thanh toán cho bên B số tiền dư còn lại (nếu còn) thông qua hình thức chuyển khoản sau 15 ngày làm việc, ngoài ra không còn hình thức thanh toán nào khác.',
      '11. Việc thanh toán và khiếu nại được bên A xử lý trong tối đa 30 ngày kể từ ngày bên B chuyển đi. Trường hợp sau thời gian trên bên B mới đưa ra yêu cầu hoặc khiếu nại thì bên A không còn trách nhiệm xử lý.',
      '',
      'Điều 6: Điều khoản chung.',
      '1. Hai bên cam kết thực hiện hợp đồng một cách đầy đủ và nghiêm túc. Trong trường hợp có tranh chấp thì hai bên sẽ cùng thiện chí tiến hành thương thảo, nếu không tìm được giải pháp, hai bên thống nhất sẽ tuân theo phán xét của cơ quan tòa án Việt Nam.',
      '2. Mọi sửa đổi và bổ sung vào hợp đồng này đều phải được thỏa thuận hai bên và tiến hành bằng văn bản in ấn. Tất cả những thay đổi bằng tay, bằng chữ viết... đều không có giá trị. Hai bên thống nhất sẽ chỉ sử dụng bản in để làm căn cứ thực hiện hợp đồng.',
      '3. Bản hợp đồng này được hai bên thống nhất lập bằng ngôn ngữ Tiếng Việt. Trong trường hợp xảy ra tranh chấp, bất đồng thì bản Tiếng Việt sẽ được sử dụng làm căn cứ để phán quyết.',
      '4. Hợp đồng này được làm thành 02 bản, mỗi bên giữ 01 bản. Các hợp đồng có giá trị pháp lý như nhau.',
      '5. Hợp đồng có hiệu lực từ ngày hai bên kí kết.',
      data.terms ? `6. Điều khoản bổ sung: ${data.terms}` : '',
      '',
      'NHẮC LẠI MỘT VÀI ĐIỂM BÊN B CẦN CHÚ Ý:',
      '1/ Tiền phòng và tiền dịch vụ bên A thu 100% bằng chuyển khoản vào tài khoản của bên A quy định trong hợp đồng (tuyệt đối không thu tiền mặt, xảy ra bất cứ vấn đề mất mát hay thất lạc do gửi tiền mặt hoặc gửi không đúng tài khoản quy định trong hợp đồng thì bên B hoàn toàn tự chịu trách nhiệm và không liên quan trách nhiệm đến bên A). Bên B có trách nhiệm chuyển khoản đúng hạn vào ngày 25 dương lịch của tháng. Trường hợp chậm tiền quá 02 ngày bị phạt 200.000đ/ngày, quá 04 ngày bị thanh lý hợp đồng theo đúng các điều khoản trên.',
      '2/ Trường hợp bên B muốn chuyển đi trước thời hạn hợp đồng thì xử lý theo mục 4 Điều 5.',
      '3/ Giữ gìn vệ sinh, an ninh trật tự. Trường hợp để bên A nhắc nhở đến lần thứ 3 sẽ bị thanh lý hợp đồng và không được hoàn trả các khoản tiền đã đóng. Tự bảo quản tài sản, đồ đạc cá nhân, xe cộ… của mình. Xảy ra mất mát, hỏng hóc hay bất kỳ vấn đề gì bên A hoàn toàn không chịu trách nhiệm.',
      '4/ Bên A bảo hành đồ đạc, thiết bị trong phòng cho bên B trong vòng 15 ngày (Trừ những đồ đạc, thiết bị liên quan đến kết cấu thuộc trách nhiệm của bên A). Sau thời gian trên bên B tự sửa chữa khi xảy ra hỏng hóc.',
      '',
      '',
      'BÊN CHO THUÊ (BÊN A)                                                          BÊN THUÊ (BÊN B)',
      '',
      '',
      '',
      '',
      `${landlord.name}                                                              ${data.tenant.name || ''}`,
      '',
      '',
      '__PAGE_BREAK__',
      '',
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc Lập – Tự Do – Hạnh Phúc',
      '',
      'PHỤ LỤC HỢP ĐỒNG',
      '(v/v bàn giao các trang thiết bị trong phòng và tình trạng sử dụng)',
      '',
      `Hôm nay, ngày ${dayToday} tháng ${monthToday} năm ${yearToday}, tại địa chỉ ${propertyAddress}.`,
      'Chúng tôi gồm:',
      '',
      'BÊN CHO THUÊ (BÊN A)',
      `Bà:                           ${landlord.name}`,
      `Số CC:                       ${landlord.cccd}`,
      `Ngày cấp:                  27/11/2023`,
      `Nơi cấp:                    Cục Cảnh Sát`,
      `Địa chỉ thường trú:    ${landlord.address}`,
      '',
      'BÊN THUÊ (BÊN B)',
      `Ông/Bà:                      ${data.tenant.name || '..........................................................'}`,
      `Ngày sinh:                  ..........................................................`,
      `Địa chỉ thường trú:    ${data.tenant.address || '..........................................................'}`,
      `Số CC:                       ${data.tenant.cccd || '..........................................................'}`,
      `Ngày cấp:                  ..........................................................`,
      `Nơi cấp:                    ..........................................................`,
      `Nghề nghiệp:             ..........................................................`,
      `Địa chỉ công tác:      ..........................................................`,
      `Số điện thoại:           ${data.tenant.phone || '..........................................................'}`,
      '',
      'Căn cứ vào hợp đồng thuê phòng giữa hai bên. Hai bên đồng ý ký kết phụ lục hợp đồng này để xác nhận việc bàn giao các trang thiết bị trong phòng và tình trạng sử dụng.',
      '',
      'Các trang thiết bị trong phòng bao gồm:',
      '- Tường sơn mới 100% không có vết bẩn, không có lỗ khoan.',
      '- 01 điều hòa Funiki + điều khiển + pin (mới 100%).',
      '- 01 giường có ngăn kéo + 01 đệm + 01 ga phủ đệm + 01 vỏ chăn + 02 gối + 02 vỏ gối (mới 100%).',
      '- 01 tủ quần áo kịch trần (mới 100%).',
      '- 01 bộ tủ bếp trên dưới kịch trần có chạn bát inox + 01 máy hút mùi + 01 bàn đá bếp + ốp tường bếp + 01 chậu rửa bát kèm vòi chậu, thoát chậu + 01 bếp từ Sunhouse kèm nồi lẩu (mới 100%).',
      '- 01 tủ lạnh Funiki 120 lít (mới 100%).',
      '- 01 cục phát wifi (mới 100%).',
      '- 03 tranh treo tường (mới 100%).',
      '- Hệ thống cửa ra vào có chìa khóa, cửa sổ, cửa ra ban công, rèm cửa đầy đủ (mới 100%).',
      '- Hệ thống atomat, ổ cắm điện, công tắc, các bóng đèn trong phòng (tất cả đầy đủ mới 100%).',
      '- Các thiết bị trong nhà vệ sinh bao gồm: cửa ra vào, gương, bồn rửa mặt + vòi + thoát, khay xà phòng, đèn nhà vệ sinh, bộ sen vòi, gài sen, bồn cầu, vòi xịt, vòi nước, vắt khăn, móc treo, ống đựng giấy, thoát sàn, quạt thông gió, 01 bình nóng lạnh 20 lít (tất cả đều mới 100%).',
      '',
      'Hai bên xác nhận các trang thiết bị và tình trạng sử dụng thực tế trong phòng đều đúng với phụ lục hợp đồng này.',
      'Phụ lục hợp đồng là một phần không tách rời của hợp đồng chính và được lập thành 02 bản bằng tiếng Việt, mỗi bên giữ 01 bản.',
      '',
      '',
      'ĐẠI DIỆN BÊN A                                                                ĐẠI DIỆN BÊN B',
      '',
      '',
      '',
      '',
      `${landlord.name}                                                              ${data.tenant.name || ''}`,
   ].filter((line) => line !== null && line !== undefined);
}

function contractParagraphs(data: ContractData): Paragraph[] {
   return contractLines(data).map((line) => {
      if (line === '__PAGE_BREAK__') {
         // Ngắt trang: paragraph rỗng với pageBreakBefore khiến trang mới bắt đầu.
         return new Paragraph({
            children: [new TextRun({ text: '', break: 1 })],
            pageBreakBefore: true,
         });
      }
      // Heading detection cho HĐ — bold cho các dòng tiêu đề chính
      const isHeading = /^(Điều \d+|BÊN [A-Z]+|HỢP ĐỒNG|PHỤ LỤC|NHẮC LẠI)/.test(line);
      const isCenter =
         /^(CỘNG HÒA|Độc lập|Độc Lập|HỢP ĐỒNG|PHỤ LỤC|\(v\/v)/.test(line);
      return new Paragraph({
         children: [new TextRun({ text: line, bold: isHeading })],
         alignment: isCenter ? AlignmentType.CENTER : undefined,
         spacing: { after: 120 },
      });
   });
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
            if (line === '__PAGE_BREAK__') {
               doc.addPage();
               continue;
            }
            // Heading detection: bold cho dòng tiêu đề
            const isHeading = /^(Điều \d+|BÊN [A-Z]+|HỢP ĐỒNG|PHỤ LỤC|NHẮC LẠI)/.test(line);
            const isCenterHeader =
               /^(CỘNG HÒA|Độc lập|Độc Lập|HỢP ĐỒNG|PHỤ LỤC|\(v\/v)/.test(line);

            if (isHeading) {
               doc.fontSize(12).text(line, { lineGap: 4, continued: false });
            } else if (isCenterHeader) {
               doc.fontSize(12).text(line, { align: 'center', lineGap: 4 });
            } else {
               doc.fontSize(11).text(line, { lineGap: 4, align: 'justify' });
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
