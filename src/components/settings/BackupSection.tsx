/**
 * Section sao lưu và khôi phục database.
 */

import { DatabaseBackup, RotateCcw } from 'lucide-react';

interface BackupSectionProps {
   onDone: (message: string) => void;
   onError: (message: string) => void;
}

export default function BackupSection({ onDone, onError }: BackupSectionProps) {
   const backup = async () => {
      try {
         const result = await window.api.backup.backup();
         if (result.canceled) return;
         onDone('Đã sao lưu dữ liệu');
      } catch (error) {
         onError(error instanceof Error ? error.message : String(error));
      }
   };

   const restore = async () => {
      try {
         const result = await window.api.backup.restore();
         if (result.canceled) return;
         onDone('Đã khôi phục dữ liệu');
      } catch (error) {
         onError(error instanceof Error ? error.message : String(error));
      }
   };

   return (
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
         <h3 className="text-headline-sm text-on-surface">Sao lưu & Khôi phục</h3>
         <p className="mt-xs text-body-md text-on-surface-variant">
            Xuất toàn bộ dữ liệu ra JSON hoặc khôi phục từ bản sao lưu.
         </p>
         <div className="mt-md flex flex-wrap gap-sm">
            <button
               type="button"
               onClick={backup}
               className="focus-ring flex h-10 items-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
            >
               <DatabaseBackup className="h-5 w-5" />
               <span>Sao lưu</span>
            </button>
            <button
               type="button"
               onClick={restore}
               className="focus-ring flex h-10 items-center gap-sm rounded-lg border border-outline-variant px-md font-semibold text-primary hover:bg-primary-fixed"
            >
               <RotateCcw className="h-5 w-5" />
               <span>Khôi phục</span>
            </button>
         </div>
      </section>
   );
}
