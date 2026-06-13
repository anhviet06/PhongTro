/**
 * Section kiểm tra cập nhật phần mềm.
 */

import { useEffect, useState } from 'react';
import { DownloadCloud, RefreshCw } from 'lucide-react';

interface UpdateProgress {
   percent?: number;
}

export default function UpdateChecker() {
   const [status, setStatus] = useState('Chưa kiểm tra');
   const [progress, setProgress] = useState(0);
   const [downloaded, setDownloaded] = useState(false);

   useEffect(() => {
      return window.api.update.onProgress((eventName, data) => {
         if (eventName === 'update:checking') setStatus('Đang kiểm tra cập nhật...');
         if (eventName === 'update:available') setStatus('Có bản cập nhật mới, đang tải...');
         if (eventName === 'update:not-available') setStatus('Bạn đang dùng phiên bản mới nhất');
         if (eventName === 'update:error') setStatus(`Lỗi cập nhật: ${String(data ?? '')}`);
         if (eventName === 'update:download-progress') {
            const next = data as UpdateProgress;
            setProgress(Math.round(next.percent ?? 0));
            setStatus('Đang tải bản cập nhật...');
         }
         if (eventName === 'update:downloaded') {
            setDownloaded(true);
            setProgress(100);
            setStatus('Bản cập nhật đã sẵn sàng');
         }
      });
   }, []);

   const check = async () => {
      setDownloaded(false);
      setProgress(0);
      setStatus('Đang kiểm tra cập nhật...');
      await window.api.update.check();
   };

   return (
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
         <h3 className="text-headline-sm text-on-surface">Cập nhật phần mềm</h3>
         <p className="mt-xs text-body-md text-on-surface-variant">{status}</p>
         <div className="mt-md h-2 rounded-full bg-surface-container-high">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
         </div>
         <div className="mt-md flex flex-wrap gap-sm">
            <button
               type="button"
               onClick={check}
               className="focus-ring flex h-10 items-center gap-sm rounded-lg border border-outline-variant px-md font-semibold text-primary hover:bg-primary-fixed"
            >
               <RefreshCw className="h-5 w-5" />
               <span>Kiểm tra cập nhật</span>
            </button>
            {downloaded && (
               <button
                  type="button"
                  onClick={() => window.api.update.install()}
                  className="focus-ring flex h-10 items-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
               >
                  <DownloadCloud className="h-5 w-5" />
                  <span>Cài đặt và khởi động lại</span>
               </button>
            )}
         </div>
      </section>
   );
}
