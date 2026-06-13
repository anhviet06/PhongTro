/**
 * Status chip dùng chung cho phòng, hợp đồng và hóa đơn.
 */

type Tone = 'success' | 'danger' | 'warning' | 'neutral' | 'primary';

interface ChipProps {
   children: React.ReactNode;
   tone?: Tone;
}

const toneClass: Record<Tone, string> = {
   success: 'bg-secondary-container text-on-secondary-fixed',
   danger: 'bg-error-container text-on-error-container',
   warning: 'bg-tertiary-fixed text-on-tertiary-fixed',
   neutral: 'bg-surface-container-high text-on-surface-variant',
   primary: 'bg-primary-fixed text-on-primary-fixed',
};

export default function Chip({ children, tone = 'neutral' }: ChipProps) {
   return (
      <span className={`inline-flex h-7 items-center rounded-full px-sm text-label-sm ${toneClass[tone]}`}>
         {children}
      </span>
   );
}
