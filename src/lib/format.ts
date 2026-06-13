/**
 * Helper format tiền, ngày và kỳ tháng cho UI.
 */

export function formatVND(value: number | null | undefined): string {
   return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
   }).format(value ?? 0);
}

export function formatDate(value: string | null | undefined): string {
   if (!value) return '';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return value;
   return new Intl.DateTimeFormat('vi-VN').format(date);
}

export function formatPeriod(period: string): string {
   const [year, month] = period.split('-');
   if (!year || !month) return period;
   return `Tháng ${Number(month)}/${year}`;
}

export function daysOverdue(value: string | null | undefined): number {
   if (!value) return 0;
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return 0;
   const diff = Date.now() - date.getTime();
   return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}
