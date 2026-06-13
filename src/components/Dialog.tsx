/**
 * Modal dialog cơ bản cho confirm/alert/prompt.
 */

import {
   Dialog as HeadlessDialog,
   DialogPanel,
   DialogTitle,
   Transition,
   TransitionChild,
} from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
   open: boolean;
   title: string;
   children: React.ReactNode;
   onClose: () => void;
   footer?: React.ReactNode;
   /** Override max-width (default 640px). Vd 'sm'=480, 'md'=640, 'lg'=800, 'xl'=960 */
   size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
   sm: '480px',
   md: '640px',
   lg: '800px',
   xl: '960px',
};

export default function Dialog({ open, title, children, onClose, footer, size = 'md' }: DialogProps) {
   return (
      <Transition show={open} as={Fragment}>
         <HeadlessDialog className="relative z-50" onClose={onClose}>
            <TransitionChild
               as={Fragment}
               enter="duration-150 ease-out"
               enterFrom="opacity-0"
               enterTo="opacity-100"
               leave="duration-100 ease-in"
               leaveFrom="opacity-100"
               leaveTo="opacity-0"
            >
               <div className="fixed inset-0 bg-black/30" />
            </TransitionChild>

            <div className="fixed inset-0 flex items-center justify-center p-md">
               <TransitionChild
                  as={Fragment}
                  enter="duration-150 ease-out"
                  enterFrom="scale-95 opacity-0"
                  enterTo="scale-100 opacity-100"
                  leave="duration-100 ease-in"
                  leaveFrom="scale-100 opacity-100"
                  leaveTo="scale-95 opacity-0"
               >
                  <DialogPanel
                     className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest shadow-xl"
                     style={{ maxWidth: SIZE_MAP[size] }}
                  >
                     <div className="flex items-center justify-between gap-md border-b border-outline-variant px-lg py-md">
                        <DialogTitle className="flex-1 truncate text-headline-sm text-on-surface">
                           {title}
                        </DialogTitle>
                        <button
                           type="button"
                           onClick={onClose}
                           className="focus-ring grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
                           title="Đóng"
                        >
                           <X className="h-5 w-5" />
                        </button>
                     </div>
                     <div
                        className="px-lg py-md"
                        style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
                     >
                        {children}
                     </div>
                     {footer && (
                        <div className="flex justify-end gap-sm border-t border-outline-variant px-lg py-md">
                           {footer}
                        </div>
                     )}
                  </DialogPanel>
               </TransitionChild>
            </div>
         </HeadlessDialog>
      </Transition>
   );
}
