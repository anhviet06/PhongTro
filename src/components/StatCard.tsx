/**
 * Card thống kê tái sử dụng cho dashboard và các trang quản trị.
 */

import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
   icon: LucideIcon;
   label: string;
   value: string;
   badge?: string;
   sub?: string;
   tone?: 'primary' | 'secondary' | 'tertiary' | 'neutral';
}

const toneClass = {
   primary: 'bg-primary-fixed text-primary',
   secondary: 'bg-secondary-container text-on-secondary-fixed',
   tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed',
   neutral: 'bg-surface-container-high text-on-surface-variant',
};

export default function StatCard({
   icon: Icon,
   label,
   value,
   badge,
   sub,
   tone = 'primary',
}: StatCardProps) {
   return (
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
         <div className="flex items-start justify-between gap-md">
            <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass[tone]}`}>
               <Icon className="h-5 w-5" />
            </div>
            {badge && (
               <span className="rounded-full bg-surface-container-high px-sm py-xs text-label-sm text-on-surface-variant">
                  {badge}
               </span>
            )}
         </div>
         <p className="mt-md text-body-md text-on-surface-variant">{label}</p>
         <p className="mt-xs text-headline-md font-bold text-on-surface">{value}</p>
         {sub && <p className="mt-xs text-body-md text-on-surface-variant">{sub}</p>}
      </section>
   );
}
