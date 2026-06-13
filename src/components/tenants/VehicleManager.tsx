/**
 * Quản lý xe của một khách thuê.
 */

import { useEffect, useState } from 'react';
import { Car, Plus, Trash2 } from 'lucide-react';
import type { Vehicle, VehicleType } from '../../shared/types';

interface VehicleManagerProps {
   tenantId: number;
}

export default function VehicleManager({ tenantId }: VehicleManagerProps) {
   const [vehicles, setVehicles] = useState<Vehicle[]>([]);
   const [plateNumber, setPlateNumber] = useState('');
   const [vehicleType, setVehicleType] = useState<VehicleType>('motorbike');
   const [loading, setLoading] = useState(true);

   const loadVehicles = async () => {
      setLoading(true);
      try {
         setVehicles(await window.api.vehicles.listByTenant(tenantId));
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      loadVehicles();
   }, [tenantId]);

   const addVehicle = async () => {
      if (!plateNumber.trim()) return;
      await window.api.vehicles.create({
         tenant_id: tenantId,
         plate_number: plateNumber.trim(),
         vehicle_type: vehicleType,
      });
      setPlateNumber('');
      await loadVehicles();
   };

   const deleteVehicle = async (id: number) => {
      await window.api.vehicles.delete(id);
      await loadVehicles();
   };

   return (
      <section className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
         <div className="mb-md flex items-center gap-sm">
            <Car className="h-5 w-5 text-primary" />
            <h4 className="text-headline-sm text-on-surface">Xe đăng ký</h4>
         </div>

         <div className="space-y-sm">
            {loading ? (
               <p className="text-body-md text-on-surface-variant">Đang tải xe...</p>
            ) : vehicles.length === 0 ? (
               <p className="text-body-md text-on-surface-variant">Chưa có xe đăng ký.</p>
            ) : (
               vehicles.map((vehicle) => (
                  <div
                     key={vehicle.id}
                     className="flex items-center justify-between gap-sm rounded-lg bg-surface-container-lowest px-md py-sm"
                  >
                     <div>
                        <p className="font-semibold text-on-surface">{vehicle.plate_number}</p>
                        <p className="text-body-md text-on-surface-variant">{vehicle.vehicle_type}</p>
                     </div>
                     <button
                        type="button"
                        onClick={() => deleteVehicle(vehicle.id)}
                        className="focus-ring grid h-8 w-8 place-items-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                        title="Xóa xe"
                     >
                        <Trash2 className="h-4 w-4" />
                     </button>
                  </div>
               ))
            )}
         </div>

         <div className="mt-md grid gap-sm sm:grid-cols-[1fr_140px_auto]">
            <input
               value={plateNumber}
               onChange={(event) => setPlateNumber(event.target.value)}
               className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
               placeholder="Biển số xe"
            />
            <select
               value={vehicleType}
               onChange={(event) => setVehicleType(event.target.value as VehicleType)}
               className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
            >
               <option value="motorbike">Xe máy</option>
               <option value="bicycle">Xe đạp</option>
               <option value="car">Ô tô</option>
            </select>
            <button
               type="button"
               onClick={addVehicle}
               disabled={!plateNumber.trim()}
               className="focus-ring flex h-10 items-center justify-center gap-xs rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container"
            >
               <Plus className="h-4 w-4" />
               <span>Thêm</span>
            </button>
         </div>
      </section>
   );
}
