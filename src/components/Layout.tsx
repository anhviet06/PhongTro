/**
 * Layout gốc: sidebar, top nav và vùng nội dung route.
 */

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function Layout() {
   return (
      <div className="min-h-screen bg-surface text-on-surface">
         <Sidebar />
         <TopNav />
         <main className="min-h-screen px-md pb-xl pt-20 lg:ml-64 lg:px-lg">
            <Outlet />
         </main>
      </div>
   );
}
