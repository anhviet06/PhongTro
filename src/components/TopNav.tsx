/**
 * Top navigation: global search, notifications, settings và avatar admin.
 */

import { Bell, Search, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

export default function TopNav() {
   const searchQuery = useAppStore((state) => state.searchQuery);
   const setSearchQuery = useAppStore((state) => state.setSearchQuery);
   const unreadNotifications = useAppStore((state) => state.unreadNotifications);

   return (
      <header className="fixed left-0 right-0 top-0 z-20 flex h-16 items-center border-b border-outline-variant bg-surface/95 px-md backdrop-blur lg:left-64 lg:px-lg">
         <label
            className="focus-within:ring-primary flex h-10 w-full items-center gap-sm rounded-full bg-surface-container-low px-md text-on-surface-variant focus-within:ring-2"
            style={{ maxWidth: '560px' }}
         >
            <Search className="h-5 w-5 shrink-0" />
            <input
               value={searchQuery}
               onChange={(event) => setSearchQuery(event.target.value)}
               className="h-full flex-1 bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant"
               placeholder="Tìm kiếm phòng, khách thuê..."
            />
         </label>

         <div className="ml-auto flex items-center gap-sm">
            <button
               type="button"
               className="focus-ring relative grid h-10 w-10 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
               title="Thông báo"
            >
               <Bell className="h-5 w-5" />
               {unreadNotifications > 0 && (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-error" />
               )}
            </button>

            <Link
               to="/settings"
               className="focus-ring grid h-10 w-10 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
               title="Cài đặt"
            >
               <Settings className="h-5 w-5" />
            </Link>

            <div className="flex items-center gap-sm rounded-full bg-surface-container-low px-sm py-xs">
               <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-bold text-on-primary">
                  A
               </div>
               <span className="hidden pr-xs text-body-md font-medium text-on-surface sm:block">Admin</span>
            </div>
         </div>
      </header>
   );
}
