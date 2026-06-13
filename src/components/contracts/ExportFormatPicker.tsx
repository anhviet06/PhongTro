/**
 * Modal chọn định dạng xuất hợp đồng.
 */

import { FileText, Printer } from 'lucide-react';
import Dialog from '../Dialog';

interface ExportFormatPickerProps {
   open: boolean;
   onClose: () => void;
   onPdf: () => void;
   onWord: () => void;
}

export default function ExportFormatPicker({
   open,
   onClose,
   onPdf,
   onWord,
}: ExportFormatPickerProps) {
   return (
      <Dialog open={open} title="Xuất hợp đồng" onClose={onClose}>
         <div className="grid gap-sm sm:grid-cols-2">
            <button
               type="button"
               onClick={onPdf}
               className="focus-ring flex min-h-28 flex-col items-center justify-center gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-md text-primary hover:bg-primary-fixed"
            >
               <Printer className="h-7 w-7" />
               <span className="font-semibold">PDF</span>
            </button>
            <button
               type="button"
               onClick={onWord}
               className="focus-ring flex min-h-28 flex-col items-center justify-center gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-md text-primary hover:bg-primary-fixed"
            >
               <FileText className="h-7 w-7" />
               <span className="font-semibold">Word</span>
            </button>
         </div>
      </Dialog>
   );
}
