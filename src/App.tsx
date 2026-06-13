/**
 * App router: HashRouter + layout chính + 8 route nghiệp vụ.
 */

import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Tenants from './pages/Tenants';
import Contracts from './pages/Contracts';
import Invoices from './pages/Invoices';
import Debts from './pages/Debts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
   return (
      <HashRouter>
         <Routes>
            <Route element={<Layout />}>
               <Route index element={<Dashboard />} />
               <Route path="rooms" element={<Rooms />} />
               <Route path="tenants" element={<Tenants />} />
               <Route path="contracts" element={<Contracts />} />
               <Route path="invoices" element={<Invoices />} />
               <Route path="debts" element={<Debts />} />
               <Route path="reports" element={<Reports />} />
               <Route path="settings" element={<Settings />} />
               <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
         </Routes>
      </HashRouter>
   );
}
