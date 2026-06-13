/**
 * Shared TypeScript types cho main process và renderer.
 *
 * Các interface bám theo schema SQLite, giữ snake_case để map trực tiếp với row DB.
 */

export type RoomStatus = 'vacant' | 'occupied' | 'debt';
export type ContractStatus = 'active' | 'expired' | 'terminated';
export type InvoiceStatus = 'unpaid' | 'paid' | 'partial';
export type PaymentMethod = 'cash' | 'transfer';
export type VehicleType = 'motorbike' | 'bicycle' | 'car';

export interface Area {
   id: number;
   name: string;
   address: string;
   description: string;
   default_electric_price: number;
   default_water_price: number;
   created_at: string;
}

export interface Room {
   id: number;
   area_id: number;
   name: string;
   floor: number;
   area_m2: number;
   price: number;
   electric_unit_price: number;
   water_unit_price: number;
   max_people: number;
   status: RoomStatus;
   created_at: string;
}

export interface RoomWithArea extends Room {
   area_name: string;
   area_address: string;
   /** Số người đang ở (tenants với move_out_date = ''). */
   current_tenant_count: number;
   /** Tên khách đại diện (is_primary=1) — null nếu phòng trống. */
   primary_tenant_name: string | null;
}

export interface RoomStatusCount {
   total: number;
   vacant: number;
   occupied: number;
   debt: number;
}

export interface Service {
   id: number;
   name: string;
   unit_price: number;
   per_person: number;
   icon: string;
   is_active: number;
   created_at: string;
}

export interface Tenant {
   id: number;
   room_id: number | null;
   full_name: string;
   cccd: string;
   dob: string;
   phone: string;
   permanent_address: string;
   is_primary: number;
   move_in_date: string;
   move_out_date: string;
   deposit: number;
   note: string;
   created_at: string;
}

export interface TenantWithRoom extends Tenant {
   room_name: string | null;
   area_id: number | null;
   area_name: string | null;
}

export interface Vehicle {
   id: number;
   tenant_id: number;
   plate_number: string;
   vehicle_type: VehicleType;
   note: string;
   created_at: string;
}

export interface VehicleWithTenant extends Vehicle {
   tenant_name: string;
   room_id: number | null;
   room_name: string | null;
}

export interface Contract {
   id: number;
   room_id: number;
   primary_tenant_id: number | null;
   deposit: number;
   rent_price: number;
   start_date: string;
   end_date: string;
   terms: string;
   landlord_name: string;
   landlord_cccd: string;
   landlord_phone: string;
   landlord_address: string;
   status: ContractStatus;
   created_at: string;
}

export interface ContractWithDetails extends Contract {
   room_name: string;
   area_id: number;
   area_name: string;
   tenant_name: string | null;
   tenant_phone: string | null;
}

export interface MeterReading {
   id: number;
   room_id: number;
   period: string;
   electric_start: number;
   electric_end: number;
   water_start: number;
   water_end: number;
   created_at: string;
}

export interface Invoice {
   id: number;
   room_id: number;
   contract_id: number | null;
   period: string;
   room_fee: number;
   electric_fee: number;
   water_fee: number;
   service_fee: number;
   total: number;
   paid_amount: number;
   status: InvoiceStatus;
   note: string;
   created_at: string;
}

export interface InvoiceService {
   id: number;
   invoice_id: number;
   service_id: number | null;
   service_name: string;
   quantity: number;
   unit_price: number;
   amount: number;
}

export interface InvoiceWithDetails extends Invoice {
   room_name: string;
   area_id: number;
   area_name: string;
   tenant_name: string | null;
   tenant_phone: string | null;
   services?: InvoiceService[];
}

export interface Payment {
   id: number;
   invoice_id: number;
   amount: number;
   method: PaymentMethod;
   paid_at: string;
   note: string;
}

export interface Setting {
   key: string;
   value: string;
   updated_at: string;
}

export interface Settings {
   [key: string]: string;
}

export interface BillingServiceLine {
   service_id: number | null;
   service_name: string;
   quantity: number;
   unit_price: number;
   amount: number;
}

export interface BillingResult {
   room_id: number;
   contract_id: number | null;
   period: string;
   room_fee: number;
   electric_fee: number;
   water_fee: number;
   service_fee: number;
   total: number;
   meter: Omit<MeterReading, 'id' | 'created_at'>;
   services: BillingServiceLine[];
   invoice?: InvoiceWithDetails;
}

export interface RevenueByAreaRow {
   area_id: number;
   area_name: string;
   period: string;
   total_revenue: number;
   paid_revenue: number;
   debt_amount: number;
}

export interface RevenueByMonthRow {
   period: string;
   total_revenue: number;
   paid_revenue: number;
   debt_amount: number;
}

export interface TopDebtorRow {
   invoice_id: number;
   room_id: number;
   room_name: string;
   area_name: string;
   tenant_name: string | null;
   tenant_phone: string | null;
   total: number;
   paid_amount: number;
   debt_amount: number;
   days_overdue: number;
   created_at: string;
}

export interface DashboardSummary {
   monthly_revenue: number;
   vacant_count: number;
   total_debt: number;
   room_status: RoomStatusCount;
   top_debtors: TopDebtorRow[];
}
