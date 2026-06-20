/**
 * Trang Settings: landlord info, đơn giá điện/nước theo khu, dịch vụ chung,
 * sao lưu/khôi phục, cập nhật và info hệ thống.
 */

import { useEffect, useState } from 'react';
import {
   AlertTriangle,
   Building2,
   CheckCircle,
   Info,
   Plus,
   Settings as SettingsIcon,
   Trash2,
   XCircle,
} from 'lucide-react';
import type { Area, RoomWithArea, Service, Settings as SettingsMap } from '../shared/types';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import MoneyInput from '../components/MoneyInput';
import BackupSection from '../components/settings/BackupSection';
import MetersEditor from '../components/settings/MetersEditor';
import UpdateChecker from '../components/settings/UpdateChecker';

const landlordKeys = ['landlord_name', 'landlord_cccd', 'landlord_phone', 'landlord_address'];

interface SystemInfo {
   version: string;
   dbPath: string;
}

interface ServiceForm {
   id?: number;
   name: string;
   unit_price: number;
   per_person: number;
   is_active: number;
}

export default function Settings() {
   const [settings, setSettings] = useState<SettingsMap>({});
   const [areas, setAreas] = useState<Area[]>([]);
   const [rooms, setRooms] = useState<RoomWithArea[]>([]);
   const [services, setServices] = useState<ServiceForm[]>([]);
   const [removedServiceIds, setRemovedServiceIds] = useState<number[]>([]);
   const [systemInfo, setSystemInfo] = useState<SystemInfo>({ version: '', dbPath: '' });
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [message, setMessage] = useState<string | null>(null);
   const [error, setError] = useState<string | null>(null);
   const [resetOpen, setResetOpen] = useState(false);
   const [resetPassword, setResetPassword] = useState('');
   const [resetLoading, setResetLoading] = useState(false);

   const performReset = async () => {
      setResetLoading(true);
      setError(null);
      setMessage(null);
      try {
         const result = await window.api.backup.resetBusinessData(resetPassword);
         if (result.success) {
            setMessage(
               `Đã reset dữ liệu thành công. Đã xoá: ${result.tablesCleared.join(', ')}`
            );
            setResetOpen(false);
            setResetPassword('');
            await loadData();
         }
      } catch (resetError) {
         setError(resetError instanceof Error ? resetError.message : String(resetError));
      } finally {
         setResetLoading(false);
      }
   };

   const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
         const [settingValues, areaList, roomList, serviceList, version, dbPath] = await Promise.all([
            window.api.settings.getMany(landlordKeys),
            window.api.areas.list(),
            window.api.rooms.listAll(),
            window.api.services.listAll(),
            window.api.system.getVersion(),
            window.api.system.getDbPath(),
         ]);
         setSettings(settingValues);
         setAreas(areaList);
         setRooms(roomList);
         setServices(
            serviceList.map((service) => ({
               id: service.id,
               name: service.name,
               unit_price: service.unit_price,
               per_person: service.per_person,
               is_active: service.is_active,
            }))
         );
         setRemovedServiceIds([]);
         setSystemInfo({ version, dbPath });
      } catch (loadError) {
         setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      loadData();
   }, []);

   const setLandlord = (key: string, value: string) => {
      setSettings((current) => ({ ...current, [key]: value }));
   };

   const setAreaField = (
      areaId: number,
      key: 'default_electric_price' | 'default_water_price',
      value: number
   ) => {
      setAreas((current) =>
         current.map((area) => (area.id === areaId ? { ...area, [key]: value } : area))
      );
   };

   const updateService = (index: number, patch: Partial<ServiceForm>) => {
      setServices((current) => current.map((svc, i) => (i === index ? { ...svc, ...patch } : svc)));
   };

   const addService = () => {
      setServices((current) => [
         ...current,
         { name: '', unit_price: 0, per_person: 0, is_active: 1 },
      ]);
   };

   const removeService = (index: number) => {
      const service = services[index];
      if (service.id) {
         setRemovedServiceIds((current) => [...current, service.id!]);
      }
      setServices((current) => current.filter((_, i) => i !== index));
   };

   const save = async () => {
      setSaving(true);
      setMessage(null);
      setError(null);
      try {
         // 1. Landlord settings
         await window.api.settings.setMany(settings);

         // 2. Mỗi khu update default_electric_price + default_water_price
         await Promise.all(
            areas.map((area) =>
               window.api.areas.update(area.id, {
                  default_electric_price: area.default_electric_price,
                  default_water_price: area.default_water_price,
               })
            )
         );

         // 3. Services: delete (đã đánh dấu remove) + update (có id) + create (chưa id)
         for (const serviceId of removedServiceIds) {
            await window.api.services.delete(serviceId);
         }
         for (const service of services) {
            if (!service.name.trim()) continue; // skip rỗng
            if (service.id) {
               await window.api.services.update(service.id, {
                  name: service.name.trim(),
                  unit_price: service.unit_price,
                  per_person: service.per_person,
                  is_active: service.is_active,
               });
            } else {
               await window.api.services.create({
                  name: service.name.trim(),
                  unit_price: service.unit_price,
                  per_person: service.per_person,
                  is_active: service.is_active,
               });
            }
         }

         await loadData();
         setMessage('Đã lưu cài đặt');
      } catch (saveError) {
         setError(saveError instanceof Error ? saveError.message : String(saveError));
      } finally {
         setSaving(false);
      }
   };

   if (loading) {
      return (
         <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner label="Đang tải cài đặt" />
         </div>
      );
   }

   if (error && Object.keys(settings).length === 0 && areas.length === 0) {
      return <EmptyState icon={SettingsIcon} title="Không tải được cài đặt" description={error} />;
   }

   return (
      <div className="animate-fade-in space-y-lg">
         <div className="flex flex-wrap items-end justify-between gap-md">
            <div>
               <h2 className="text-headline-md text-on-surface">Cài đặt</h2>
               <p className="mt-xs text-body-md text-on-surface-variant">
                  Cấu hình thông tin chủ trọ, đơn giá theo khu, dịch vụ chung và sao lưu.
               </p>
            </div>
            <button
               type="button"
               onClick={save}
               disabled={saving}
               className="focus-ring h-10 rounded-lg bg-primary px-md font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60"
            >
               {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
         </div>

         {message && (
            <div className="flex items-center gap-sm rounded-lg bg-secondary-container p-sm text-on-secondary-fixed">
               <CheckCircle className="h-5 w-5" />
               <span>{message}</span>
            </div>
         )}
         {error && (
            <div className="flex items-center gap-sm rounded-lg bg-error-container p-sm text-on-error-container">
               <XCircle className="h-5 w-5" />
               <span>{error}</span>
            </div>
         )}

         {/* Landlord info */}
         <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
            <h3 className="text-headline-sm text-on-surface">Thông tin chủ trọ (Bên A)</h3>
            <div className="mt-md grid gap-md md:grid-cols-2">
               <TextInput
                  label="Họ tên"
                  value={settings.landlord_name ?? ''}
                  onChange={(value) => setLandlord('landlord_name', value)}
               />
               <TextInput
                  label="CCCD"
                  value={settings.landlord_cccd ?? ''}
                  onChange={(value) => setLandlord('landlord_cccd', value)}
               />
               <TextInput
                  label="Số điện thoại"
                  value={settings.landlord_phone ?? ''}
                  onChange={(value) => setLandlord('landlord_phone', value)}
               />
               <TextInput
                  label="Địa chỉ"
                  value={settings.landlord_address ?? ''}
                  onChange={(value) => setLandlord('landlord_address', value)}
               />
            </div>
         </section>

         {/* Đơn giá điện/nước per khu */}
         <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
            <div>
               <h3 className="text-headline-sm text-on-surface">Đơn giá điện/nước theo khu</h3>
               <p className="mt-xs text-body-md text-on-surface-variant">
                  Cấu hình đơn giá mặc định cho từng khu. Khi tạo phòng mới ở khu nào sẽ tự dùng đơn giá khu đó. Phòng đặc biệt có thể sửa riêng ở trang Phòng trọ.
               </p>
            </div>
            <div className="mt-md grid gap-md md:grid-cols-2 xl:grid-cols-3">
               {areas.map((area) => (
                  <div
                     key={area.id}
                     className="rounded-lg border border-outline-variant bg-surface-container-low p-md"
                  >
                     <div className="flex items-center gap-sm">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-fixed text-primary">
                           <Building2 className="h-4 w-4" />
                        </div>
                        <h4 className="font-semibold text-on-surface">{area.name}</h4>
                     </div>
                     <div className="mt-md space-y-sm">
                        <NumberInput
                           label="Đơn giá điện (đ/kWh)"
                           value={area.default_electric_price}
                           onChange={(value) => setAreaField(area.id, 'default_electric_price', value)}
                        />
                        <NumberInput
                           label="Đơn giá nước (đ/m³)"
                           value={area.default_water_price}
                           onChange={(value) => setAreaField(area.id, 'default_water_price', value)}
                        />
                     </div>
                  </div>
               ))}
            </div>
         </section>

         {/* Dịch vụ chung */}
         <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-md">
               <div>
                  <h3 className="text-headline-sm text-on-surface">Dịch vụ chung</h3>
                  <p className="mt-xs text-body-md text-on-surface-variant">
                     Áp dụng cho mọi phòng. Tích "Theo đầu người" để nhân với số người ở phòng.
                  </p>
               </div>
               <button
                  type="button"
                  onClick={addService}
                  className="focus-ring flex h-10 items-center gap-sm rounded-lg border border-outline-variant px-md font-semibold text-primary hover:bg-primary-fixed"
               >
                  <Plus className="h-4 w-4" />
                  Thêm dịch vụ
               </button>
            </div>
            {services.length === 0 ? (
               <p className="mt-md text-body-md text-on-surface-variant">
                  Chưa có dịch vụ. Bấm "Thêm dịch vụ" để bắt đầu.
               </p>
            ) : (
               <div className="mt-md overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                     <thead className="bg-surface-container-low">
                        <tr className="text-label-md uppercase text-on-surface-variant">
                           <th className="px-sm py-sm">Tên dịch vụ</th>
                           <th className="px-sm py-sm w-32">Đơn giá (đ)</th>
                           <th className="px-sm py-sm w-32">Theo đầu người</th>
                           <th className="px-sm py-sm w-24">Đang dùng</th>
                           <th className="px-sm py-sm w-12" />
                        </tr>
                     </thead>
                     <tbody>
                        {services.map((service, index) => (
                           <tr key={service.id ?? `new-${index}`} className="border-t border-outline-variant">
                              <td className="px-sm py-xs">
                                 <input
                                    type="text"
                                    value={service.name}
                                    onChange={(event) =>
                                       updateService(index, { name: event.target.value })
                                    }
                                    placeholder="Vd: Wifi, Rác, Bảo vệ"
                                    className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm outline-none focus:border-primary"
                                 />
                              </td>
                              <td className="px-sm py-xs">
                                 <MoneyInput
                                    value={service.unit_price}
                                    onChange={(next) =>
                                       updateService(index, { unit_price: next })
                                    }
                                    className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm outline-none focus:border-primary"
                                 />
                              </td>
                              <td className="px-sm py-xs">
                                 <label className="flex items-center gap-xs">
                                    <input
                                       type="checkbox"
                                       checked={service.per_person === 1}
                                       onChange={(event) =>
                                          updateService(index, {
                                             per_person: event.target.checked ? 1 : 0,
                                          })
                                       }
                                       className="h-4 w-4"
                                    />
                                    <span className="text-body-md text-on-surface-variant">
                                       {service.per_person === 1 ? 'x số người' : 'theo phòng'}
                                    </span>
                                 </label>
                              </td>
                              <td className="px-sm py-xs">
                                 <input
                                    type="checkbox"
                                    checked={service.is_active === 1}
                                    onChange={(event) =>
                                       updateService(index, {
                                          is_active: event.target.checked ? 1 : 0,
                                       })
                                    }
                                    className="h-4 w-4"
                                 />
                              </td>
                              <td className="px-sm py-xs text-right">
                                 <button
                                    type="button"
                                    onClick={() => removeService(index)}
                                    className="focus-ring grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                                    title="Xoá dịch vụ"
                                 >
                                    <Trash2 className="h-4 w-4" />
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </section>

         <MetersEditor
            rooms={rooms}
            onMessage={(text) => {
               setMessage(text);
               setError(null);
            }}
            onError={(text) => {
               setError(text);
               setMessage(null);
            }}
         />

         <BackupSection
            onDone={(nextMessage) => {
               setMessage(nextMessage);
               setError(null);
            }}
            onError={(nextError) => {
               setError(nextError);
               setMessage(null);
            }}
         />

         {/* Danger zone — reset toàn bộ dữ liệu nghiệp vụ */}
         <section className="rounded-lg border border-error/40 bg-error-container/30 p-md shadow-sm">
            <div className="flex items-start gap-sm">
               <AlertTriangle className="mt-xs h-5 w-5 shrink-0 text-error" />
               <div className="flex-1">
                  <h3 className="text-headline-sm text-on-error-container">Khu vực nguy hiểm</h3>
                  <p className="mt-xs text-body-md text-on-error-container/80">
                     Reset toàn bộ dữ liệu kinh doanh: khách thuê, xe máy, hợp đồng, hoá đơn, thanh
                     toán, chỉ số điện nước. <strong>Giữ lại</strong> khu, phòng, giá phòng, đơn
                     giá khu, danh sách dịch vụ và thông tin chủ trọ. Yêu cầu mật khẩu xác nhận.
                  </p>
                  <button
                     type="button"
                     onClick={() => setResetOpen(true)}
                     className="focus-ring mt-md flex h-10 items-center gap-sm rounded-lg bg-error px-md font-semibold text-on-error hover:opacity-90"
                  >
                     <Trash2 className="h-4 w-4" />
                     Reset dữ liệu khách thuê
                  </button>
               </div>
            </div>
         </section>

         {/* Modal nhập password reset */}
         {resetOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md">
               <div
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-lg shadow-xl"
                  style={{ maxWidth: '480px' }}
               >
                  <div className="flex items-center gap-sm">
                     <AlertTriangle className="h-6 w-6 text-error" />
                     <h3 className="text-headline-sm text-on-surface">Xác nhận reset dữ liệu</h3>
                  </div>
                  <p className="mt-md text-body-md text-on-surface-variant">
                     Thao tác này <strong>không thể hoàn tác</strong>. Tất cả khách thuê, hợp đồng,
                     hoá đơn, thanh toán sẽ bị xoá vĩnh viễn. Khu, phòng và đơn giá được giữ
                     nguyên.
                  </p>
                  <label className="mt-md block">
                     <span className="text-label-sm text-on-surface-variant">
                        Nhập mật khẩu để xác nhận
                     </span>
                     <input
                        type="password"
                        autoFocus
                        value={resetPassword}
                        onChange={(event) => setResetPassword(event.target.value)}
                        onKeyDown={(event) => {
                           if (event.key === 'Enter' && resetPassword && !resetLoading) {
                              performReset();
                           }
                        }}
                        placeholder="Nhập mật khẩu..."
                        className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
                     />
                  </label>
                  <div className="mt-lg flex justify-end gap-sm">
                     <button
                        type="button"
                        onClick={() => {
                           setResetOpen(false);
                           setResetPassword('');
                        }}
                        disabled={resetLoading}
                        className="h-10 rounded-lg border border-outline-variant px-md text-on-surface hover:bg-surface-container-high"
                     >
                        Huỷ
                     </button>
                     <button
                        type="button"
                        onClick={performReset}
                        disabled={!resetPassword || resetLoading}
                        className="h-10 rounded-lg bg-error px-md font-semibold text-on-error hover:opacity-90 disabled:opacity-50"
                     >
                        {resetLoading ? 'Đang xoá...' : 'Xác nhận xoá'}
                     </button>
                  </div>
               </div>
            </div>
         )}

         <UpdateChecker />

         <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
            <div className="flex items-center gap-sm">
               <Info className="h-5 w-5 text-primary" />
               <h3 className="text-headline-sm text-on-surface">App Info</h3>
            </div>
            <dl className="mt-md grid gap-md text-body-md md:grid-cols-2">
               <div>
                  <dt className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                     Version
                  </dt>
                  <dd className="mt-xs font-mono text-on-surface">{systemInfo.version}</dd>
               </div>
               <div>
                  <dt className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                     Design by
                  </dt>
                  <dd className="mt-xs">
                     <span className="font-semibold tracking-wide text-on-surface">
                        BUI VAN TIN
                     </span>
                     <span className="mx-xs text-on-surface-variant">·</span>
                     <a
                        href="tel:0877979997"
                        className="font-mono text-primary hover:underline"
                     >
                        0877.979.997
                     </a>
                  </dd>
               </div>
               <div className="md:col-span-2">
                  <dt className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                     Database path
                  </dt>
                  <dd className="mt-xs break-all font-mono text-on-surface">{systemInfo.dbPath}</dd>
               </div>
            </dl>
         </section>
      </div>
   );
}

function TextInput({
   label,
   value,
   onChange,
}: {
   label: string;
   value: string;
   onChange: (value: string) => void;
}) {
   return (
      <label className="block">
         <span className="text-label-sm text-on-surface-variant">{label}</span>
         <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
         />
      </label>
   );
}

function NumberInput({
   label,
   value,
   onChange,
}: {
   label: string;
   value: number;
   onChange: (value: number) => void;
}) {
   return (
      <label className="block">
         <span className="text-label-sm text-on-surface-variant">{label}</span>
         <MoneyInput
            value={value}
            onChange={onChange}
            className="mt-xs h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md outline-none focus:border-primary"
         />
      </label>
   );
}
