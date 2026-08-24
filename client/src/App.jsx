import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import InstallPrompt from './components/InstallPrompt';

// Route-level code splitting — keeps the initial bundle small (charts/stripe load on demand).
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetails = lazy(() => import('./pages/CustomerDetails'));
const Measurements = lazy(() => import('./pages/Measurements'));
const Fabrics = lazy(() => import('./pages/Fabrics'));
const Orders = lazy(() => import('./pages/Orders'));
const CreateOrder = lazy(() => import('./pages/CreateOrder'));
const OrderDetails = lazy(() => import('./pages/OrderDetails'));
const Payments = lazy(() => import('./pages/Payments'));
const PendingPayments = lazy(() => import('./pages/PendingPayments'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceDetails = lazy(() => import('./pages/InvoiceDetails'));
const Reports = lazy(() => import('./pages/Reports'));
const Admins = lazy(() => import('./pages/Admins'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Broadcast = lazy(() => import('./pages/Broadcast'));
const Staff = lazy(() => import('./pages/Staff'));
const Branches = lazy(() => import('./pages/Branches'));

const Loader = () => <div className="grid h-64 place-items-center text-gray-400">Loading…</div>;

export default function App() {
  return (
    <>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetails />} />
              <Route path="measurements" element={<Measurements />} />
              <Route path="fabrics" element={<Fabrics />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/new" element={<CreateOrder />} />
              <Route path="orders/:id" element={<OrderDetails />} />
              <Route path="payments" element={<Payments />} />
              <Route path="pending-payments" element={<PendingPayments />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/:id" element={<InvoiceDetails />} />
              <Route path="reports" element={<Reports />} />
              <Route path="broadcast" element={<Broadcast />} />
              <Route path="staff" element={<Staff />} />
              <Route path="branches" element={<Branches />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="SUPER_ADMIN" />}>
            <Route element={<DashboardLayout />}>
              <Route path="admins" element={<Admins />} />
              <Route path="activity" element={<ActivityLogs />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <InstallPrompt />
    </>  
  );
}
