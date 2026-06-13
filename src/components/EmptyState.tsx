/**
 * Empty state tái sử dụng cho bảng/list chưa có dữ liệu.
 */

import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
   icon: LucideIcon;
   title: string;
   description?: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
   return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-lg text-center">
         <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-container-high text-on-surface-variant">
            <Icon className="h-6 w-6" />
         </div>
         <h3 className="mt-md text-headline-sm text-on-surface">{title}</h3>
         {description && (
            <p
               className="mt-xs text-body-md text-on-surface-variant"
               style={{ maxWidth: '420px' }}
            >
               {description}
            </p>
         )}
      </div>
   );
}
