/**
 * Repository thống kê: aggregate phục vụ dashboard, công nợ và báo cáo doanh thu.
 */

import { getDb } from '../index';
import type {
   DashboardSummary,
   RevenueByAreaRow,
   RevenueByMonthRow,
   TopDebtorRow,
} from '../../../src/shared/types';
import { countByStatus } from './rooms.repo';

function currentPeriod(): string {
   const now = new Date();
   return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function periodMonthsBack(monthsBack: number): string {
   const now = new Date();
   now.setMonth(now.getMonth() - Math.max(monthsBack - 1, 0));
   return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function monthlyRevenue(period = currentPeriod()): number {
   const db = getDb();
   const row = db
      .prepare('SELECT COALESCE(SUM(paid_amount), 0) AS total FROM invoices WHERE period = ?')
      .get(period) as { total: number };
   return row.total;
}

export function vacantCount(): number {
   const db = getDb();
   const row = db
      .prepare("SELECT COUNT(*) AS total FROM rooms WHERE status = 'vacant'")
      .get() as { total: number };
   return row.total;
}

export function totalDebt(): number {
   const db = getDb();
   const row = db
      .prepare(
         `
         SELECT COALESCE(SUM(total - paid_amount), 0) AS total
         FROM invoices
         WHERE status <> 'paid'
      `
      )
      .get() as { total: number };
   return row.total;
}

export function revenueByArea(monthsBack = 6): RevenueByAreaRow[] {
   const db = getDb();
   return db
      .prepare(
         `
         SELECT
            a.id AS area_id,
            a.name AS area_name,
            i.period AS period,
            COALESCE(SUM(i.total), 0) AS total_revenue,
            COALESCE(SUM(i.paid_amount), 0) AS paid_revenue,
            COALESCE(SUM(i.total - i.paid_amount), 0) AS debt_amount
         FROM invoices i
         JOIN rooms r ON r.id = i.room_id
         JOIN areas a ON a.id = r.area_id
         WHERE i.period >= ?
         GROUP BY a.id, a.name, i.period
         ORDER BY i.period ASC, a.id ASC
      `
      )
      .all(periodMonthsBack(monthsBack)) as RevenueByAreaRow[];
}

export function revenueByMonth(year = new Date().getFullYear()): RevenueByMonthRow[] {
   const db = getDb();
   return db
      .prepare(
         `
         SELECT
            i.period AS period,
            COALESCE(SUM(i.total), 0) AS total_revenue,
            COALESCE(SUM(i.paid_amount), 0) AS paid_revenue,
            COALESCE(SUM(i.total - i.paid_amount), 0) AS debt_amount
         FROM invoices i
         WHERE substr(i.period, 1, 4) = ?
         GROUP BY i.period
         ORDER BY i.period ASC
      `
      )
      .all(String(year)) as RevenueByMonthRow[];
}

export function topDebtors(limit = 5): TopDebtorRow[] {
   const db = getDb();
   return db
      .prepare(
         `
         SELECT
            i.id AS invoice_id,
            r.id AS room_id,
            r.name AS room_name,
            a.name AS area_name,
            t.full_name AS tenant_name,
            t.phone AS tenant_phone,
            i.total AS total,
            i.paid_amount AS paid_amount,
            (i.total - i.paid_amount) AS debt_amount,
            CAST(julianday('now') - julianday(i.created_at) AS INTEGER) AS days_overdue,
            i.created_at AS created_at
         FROM invoices i
         JOIN rooms r ON r.id = i.room_id
         JOIN areas a ON a.id = r.area_id
         LEFT JOIN tenants t ON t.room_id = r.id AND t.is_primary = 1
            AND (t.move_out_date = '' OR date(t.move_out_date) > date('now'))
         WHERE i.status <> 'paid'
         ORDER BY debt_amount DESC, days_overdue DESC
         LIMIT ?
      `
      )
      .all(limit) as TopDebtorRow[];
}

export function dashboardSummary(): DashboardSummary {
   return {
      monthly_revenue: monthlyRevenue(),
      vacant_count: vacantCount(),
      total_debt: totalDebt(),
      room_status: countByStatus(),
      top_debtors: topDebtors(5),
   };
}
