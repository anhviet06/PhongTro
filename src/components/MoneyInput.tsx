/**
 * MoneyInput — input tiền VND với dấu chấm phân cách hàng nghìn.
 *
 * Hiển thị: 2.000.000
 * Gửi value ra parent: 2000000 (raw number)
 *
 * Dùng thay cho `<input type="number">` ở mọi chỗ tiền (giá thuê, cọc, đơn giá điện/nước,
 * giá dịch vụ, payment amount...).
 */

import { useEffect, useRef, useState } from 'react';

interface MoneyInputProps {
   value: number;
   onChange: (value: number) => void;
   placeholder?: string;
   className?: string;
   disabled?: boolean;
   /** Min value, default 0 */
   min?: number;
   /** ID cho label */
   id?: string;
   /** Aria label */
   'aria-label'?: string;
}

/** Format số → chuỗi có dấu chấm hàng nghìn: 2000000 → "2.000.000". */
export function formatMoney(value: number): string {
   if (!Number.isFinite(value) || value === 0) return '';
   return new Intl.NumberFormat('vi-VN').format(value);
}

/** Parse chuỗi (có thể có dấu chấm/phẩy/khoảng trắng) → number. "2.000.000" → 2000000. */
export function parseMoney(text: string): number {
   if (!text) return 0;
   const digits = text.replace(/[^\d]/g, '');
   return digits ? Number(digits) : 0;
}

export default function MoneyInput({
   value,
   onChange,
   placeholder,
   className = '',
   disabled,
   min = 0,
   id,
   'aria-label': ariaLabel,
}: MoneyInputProps) {
   const [text, setText] = useState(() => formatMoney(value));
   const focusedRef = useRef(false);

   // Đồng bộ text khi value thay đổi từ ngoài (vd reset form)
   useEffect(() => {
      if (!focusedRef.current) {
         setText(formatMoney(value));
      }
   }, [value]);

   const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawText = event.target.value;
      const parsed = parseMoney(rawText);

      // Validate min
      const next = parsed < min ? min : parsed;

      // Hiển thị lại với dấu chấm (giữ caret ở cuối — đơn giản, không cần preserve position)
      setText(formatMoney(next));
      onChange(next);
   };

   return (
      <input
         type="text"
         inputMode="numeric"
         id={id}
         aria-label={ariaLabel}
         value={text}
         placeholder={placeholder ?? '0'}
         disabled={disabled}
         onFocus={() => {
            focusedRef.current = true;
         }}
         onBlur={() => {
            focusedRef.current = false;
            // Reformat khi blur (chống user gõ dấu khác)
            setText(formatMoney(value));
         }}
         onChange={handleChange}
         className={className}
      />
   );
}
