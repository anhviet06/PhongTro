/**
 * Repository xe của khách thuê.
 */

import { getDb } from '../index';
import type { Vehicle, VehicleType, VehicleWithTenant } from '../../../src/shared/types';

export interface VehicleInput {
   tenant_id: number;
   plate_number: string;
   vehicle_type?: VehicleType;
   note?: string;
}

export function listByTenant(tenantId: number): Vehicle[] {
   const db = getDb();
   return db
      .prepare('SELECT * FROM vehicles WHERE tenant_id = ? ORDER BY id ASC')
      .all(tenantId) as Vehicle[];
}

export function listByRoom(roomId: number): VehicleWithTenant[] {
   const db = getDb();
   return db
      .prepare(
         `
         SELECT
            v.*,
            t.full_name AS tenant_name,
            t.room_id AS room_id,
            r.name AS room_name
         FROM vehicles v
         JOIN tenants t ON t.id = v.tenant_id
         LEFT JOIN rooms r ON r.id = t.room_id
         WHERE t.room_id = ?
         ORDER BY t.is_primary DESC, t.id ASC, v.id ASC
      `
      )
      .all(roomId) as VehicleWithTenant[];
}

export function getById(id: number): Vehicle | null {
   const db = getDb();
   return (db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as Vehicle | undefined) ?? null;
}

export function create(data: VehicleInput): Vehicle {
   const db = getDb();
   const result = db
      .prepare(
         `
         INSERT INTO vehicles (tenant_id, plate_number, vehicle_type, note)
         VALUES (@tenant_id, @plate_number, @vehicle_type, @note)
      `
      )
      .run({
         tenant_id: data.tenant_id,
         plate_number: data.plate_number,
         vehicle_type: data.vehicle_type ?? 'motorbike',
         note: data.note ?? '',
      });

   const vehicle = getById(Number(result.lastInsertRowid));
   if (!vehicle) throw new Error('Tạo xe thất bại');
   return vehicle;
}

export function deleteById(id: number): boolean {
   const db = getDb();
   const result = db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
   return result.changes > 0;
}

export { deleteById as delete };
