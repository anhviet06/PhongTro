/**
 * Sidebar điều hướng chính của app.
 */

import { NavLink } from 'react-router-dom';
import {
   BarChart3,
   DoorOpen,
   FileText,
   LayoutDashboard,
   Plus,
   Receipt,
   Settings,
   Users,
   Wallet,
} from 'lucide-react';

const navItems = [
   { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
   { to: '/rooms', label: 'Phòng trọ', icon: DoorOpen },
   { to: '/tenants', label: 'Khách thuê', icon: Users },
   { to: '/contracts', label: 'Hợp đồng', icon: FileText },
   { to: '/invoices', label: 'Hóa đơn', icon: Receipt },
   { to: '/debts', label: 'Công nợ', icon: Wallet },
   { to: '/reports', label: 'Báo cáo', icon: BarChart3 },
   { to: '/settings', label: 'Cài đặt', icon: Settings },
];

export default function Sidebar() {
   return (
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-outline-variant bg-surface-container-lowest px-md py-lg lg:flex lg:flex-col">
         <div className="mb-lg">
            <h1 className="text-headline-md font-bold text-primary">Quản lý nhà</h1>
            <p className="mt-xs text-body-md text-on-surface-variant">Hệ thống vận hành</p>
         </div>

         <nav className="flex flex-1 flex-col gap-xs">
            {navItems.map((item) => {
               const Icon = item.icon;
               return (
                  <NavLink
                     key={item.to}
                     to={item.to}
                     end={item.to === '/'}
                     className={({ isActive }) =>
                        [
                           'focus-ring flex h-11 items-center gap-sm rounded-lg px-md text-body-md transition',
                           isActive
                              ? 'scale-[0.98] bg-primary-container font-semibold text-on-primary-container'
                              : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                        ].join(' ')
                     }
                  >
                     <Icon className="h-5 w-5 shrink-0" />
                     <span>{item.label}</span>
                  </NavLink>
               );
            })}
         </nav>

         <NavLink
            to="/invoices"
            className="focus-ring mt-lg flex h-11 items-center justify-center gap-sm rounded-lg bg-primary px-md font-semibold text-on-primary shadow-sm transition hover:bg-primary-container"
         >
            <Plus className="h-5 w-5" />
            <span>Thêm hóa đơn mới</span>
         </NavLink>
      </aside>
   );
}
