/**
 * Cặp input chỉ số cũ/mới cho điện hoặc nước.
 */

interface MeterInputProps {
   label: string;
   unit: string;
   start: number;
   end: number;
   onEndChange: (value: number) => void;
   readonlyStart?: boolean;
}

export default function MeterInput({
   label,
   unit,
   start,
   end,
   onEndChange,
   readonlyStart = true,
}: MeterInputProps) {
   const invalid = end < start;
   const usage = Math.max(0, end - start);

   return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
         <div className="mb-sm flex items-center justify-between gap-md">
            <h4 className="text-headline-sm text-on-surface">{label}</h4>
            <span className="rounded-full bg-surface-container-high px-sm py-xs text-label-sm text-on-surface-variant">
               {usage} {unit}
            </span>
         </div>
         <div className="grid gap-sm sm:grid-cols-2">
            <label className="block">
               <span className="text-label-sm text-on-surface-variant">Chỉ số cũ</span>
               <input
                  type="number"
                  value={start}
                  readOnly={readonlyStart}
                  className="mt-xs h-10 w-full cursor-not-allowed rounded-lg border border-outline-variant bg-surface-container px-md text-on-surface-variant outline-none"
               />
            </label>
            <label className="block">
               <span className="text-label-sm text-on-surface-variant">Chỉ số mới</span>
               <input
                  type="number"
                  value={end}
                  onChange={(event) => onEndChange(Number(event.target.value))}
                  className={[
                     'mt-xs h-10 w-full rounded-lg border bg-surface-container-lowest px-md font-semibold outline-none focus:border-primary',
                     invalid ? 'border-error text-error' : 'border-primary text-on-surface',
                  ].join(' ')}
               />
            </label>
         </div>
         {invalid && (
            <p className="mt-sm text-body-md text-error">
               Chỉ số mới không được nhỏ hơn chỉ số cũ.
            </p>
         )}
      </div>
   );
}
