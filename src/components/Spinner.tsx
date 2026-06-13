/**
 * Loading spinner nhỏ dùng cho trạng thái chờ.
 */

interface SpinnerProps {
   label?: string;
}

export default function Spinner({ label = 'Đang tải' }: SpinnerProps) {
   return (
      <div className="flex items-center gap-sm text-body-md text-on-surface-variant">
         <span className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
         <span>{label}</span>
      </div>
   );
}
