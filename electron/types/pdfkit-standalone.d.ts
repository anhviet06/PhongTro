/**
 * Type declaration cho pdfkit standalone bundle.
 *
 * `@types/pdfkit` chỉ khai báo entry `pdfkit` chính, không cover sub-path
 * `pdfkit/js/pdfkit.standalone`. File này tái sử dụng types của pdfkit
 * cho bản standalone (cùng API, chỉ khác cách bundle).
 */
declare module 'pdfkit/js/pdfkit.standalone' {
   import PDFDocument from 'pdfkit';
   export default PDFDocument;
}
