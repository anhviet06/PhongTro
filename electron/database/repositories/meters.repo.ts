/**
 * Repository chỉ số điện nước theo phòng/kỳ.
 */

import { getDb } from '../index';
import type { MeterReading } from '../../../src/shared/types';

export interface MeterReadingInput {
   room_id: number;
   period: string;
   electric_start?: number;
   electric_end?: number;
   water_start?: number;
   water_end?: number;
}

export type MeterReadingPatch = Partial<
   Pick<MeterReadingInput, 'electric_start' | 'electric_end' | 'water_start' | 'water_end'>
>;

export function getByRoomPeriod(roomId: number, period: string): MeterReading | null {
   const db = getDb();
   return (
      (db
         .prepare('SELECT * FROM meter_readings WHERE room_id = ? AND period = ?')
         .get(roomId, period) as MeterReading | undefined) ?? null
   );
}

/**
 * Lấy chỉ số kỳ liền trước theo thứ tự thời gian (period gần nhất < period truyền vào).
 * Đây là source-of-truth cho billing — KHÔNG dùng tháng-1 cứng để tránh sai khi user bỏ qua 1 kỳ
 * (vd: tạo HĐ tháng 3 rồi nhảy sang tháng 5, getPrevious(room, '2025-05') vẫn trả record tháng 3).
 */
export function getPrevious(roomId: number, period: string): MeterReading | null {
   return getLatestBefore(roomId, period);
}

export function getLatestBefore(roomId: number, period: string): MeterReading | null {
   const db = getDb();
   return (
      (db
         .prepare(
            `
            SELECT *
            FROM meter_readings
            WHERE room_id = ? AND period < ?
            ORDER BY period DESC
            LIMIT 1
         `
         )
         .get(roomId, period) as MeterReading | undefined) ?? null
   );
}

export function create(data: MeterReadingInput): MeterReading {
   const db = getDb();
   const result = db
      .prepare(
         `
         INSERT INTO meter_readings (
            room_id, period, electric_start, electric_end, water_start, water_end
         )
         VALUES (
            @room_id, @period, @electric_start, @electric_end, @water_start, @water_end
         )
      `
      )
      .run({
         room_id: data.room_id,
         period: data.period,
         electric_start: data.electric_start ?? 0,
         electric_end: data.electric_end ?? 0,
         water_start: data.water_start ?? 0,
         water_end: data.water_end ?? 0,
      });

   const reading = getById(Number(result.lastInsertRowid));
   if (!reading) throw new Error('Tạo chỉ số điện nước thất bại');
   return reading;
}

export function getById(id: number): MeterReading | null {
   const db = getDb();
   return (
      (db.prepare('SELECT * FROM meter_readings WHERE id = ?').get(id) as
         | MeterReading
         | undefined) ?? null
   );
}

export function update(id: number, patch: MeterReadingPatch): MeterReading | null {
   const fields: string[] = [];
   const params: Record<string, number> = { id };

   for (const key of ['electric_start', 'electric_end', 'water_start', 'water_end'] as const) {
      if (patch[key] !== undefined) {
         fields.push(`${key} = @${key}`);
         params[key] = patch[key] ?? 0;
      }
   }

   if (fields.length === 0) return getById(id);

   const db = getDb();
   db.prepare(`UPDATE meter_readings SET ${fields.join(', ')} WHERE id = @id`).run(params);
   return getById(id);
}
