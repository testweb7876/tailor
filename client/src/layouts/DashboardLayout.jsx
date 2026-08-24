import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Ruler, Scissors, Package, CreditCard,
  AlertCircle, FileText, BarChart3, Shield, Activity, Settings as Cog,
  Search, LogOut, Menu, X, KeyRound, ChevronDown, Megaphone, MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ChangePassword from '../components/ChangePassword';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, key: 'dashboard' },
  { to: '/customers', label: 'Customers', icon: Users, key: 'customers' },
  { to: '/measurements', label: 'Measurements', icon: Ruler, key: 'measurements' },
  { to: '/orders', label: 'Orders', icon: Scissors, key: 'orders' },
  { to: '/fabrics', label: 'Fabrics', icon: Package, key: 'fabrics' },
  { to: '/payments', label: 'Payments', icon: CreditCard, key: 'payments' },
  { to: '/pending-payments', label: 'Pending', icon: AlertCircle, key: 'payments' },
  { to: '/invoices', label: 'Invoices', icon: FileText, key: 'invoices' },
  { to: '/broadcast', label: 'Broadcast', icon: Megaphone, key: 'broadcast' },
  { to: '/reports', label: 'Reports', icon: BarChart3, key: 'reports' },
  { to: '/staff', label: 'Staff', icon: Users, key: 'orders' },
];
const ADMIN_NAV = [
  { to: '/admins', label: 'Admins', icon: Shield },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Cog },
  { to: '/branches', label: 'Branches', icon: MapPin },
];

export default function DashboardLayout() {
  const { user, logout, isSuperAdmin } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const visibleNav = isSuperAdmin ? NAV : NAV.filter((n) => user?.permissions?.includes(n.key));

  const onSearch = async (e) => {
    const v = e.target.value; setQ(v);
    if (v.trim().length < 2) return setResults(null);
    try { const { data } = await api.get('/search', { params: { q: v } }); setResults(data); }
    catch { setResults(null); }
  };

  const link = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
      isActive ? 'bg-indigo text-white' : 'text-gray-300 hover:bg-white/10'
    }`;

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col bg-ink px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brass text-ink font-bold">T</div>
        <span className="font-semibold text-white">TailorHub</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {visibleNav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={link} onClick={() => setOpen(false)}>
            <n.icon size={18} /> {n.label}
          </NavLink>
        ))}
        {isSuperAdmin && (
          <>
            <div className="px-3 pb-1 pt-4 text-xs uppercase tracking-wide text-gray-500">Admin</div>
            {ADMIN_NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={link} onClick={() => setOpen(false)}>
                <n.icon size={18} /> {n.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <button onClick={() => logout().then(() => nav('/login'))} className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/10">
        <LogOut size={18} /> Logout
      </button>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:block">{Sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative h-full">{Sidebar}</div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
          <button className="md:hidden" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={q} onChange={onSearch} placeholder="Search customer, order, invoice, fabric…" className="input pl-9" />
            {results && (
              <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-100 bg-white p-2 text-sm shadow-card">
                {['customers','orders','invoices','fabrics'].every((k) => !results[k]?.length) && <div className="px-2 py-1 text-gray-400">No matches</div>}
                {results.customers?.map((c) => (
                  <div key={c._id} className="cursor-pointer rounded px-2 py-1 hover:bg-gray-50" onClick={() => { nav(`/customers/${c._id}`); setResults(null); setQ(''); }}>
                    <span className="text-gray-400">Customer</span> · {c.fullName} — {c.mobile}
                  </div>
                ))}
                {results.orders?.map((o) => (
                  <div key={o._id} className="cursor-pointer rounded px-2 py-1 hover:bg-gray-50" onClick={() => { nav(`/orders/${o._id}`); setResults(null); setQ(''); }}>
                    <span className="text-gray-400">Order</span> · {o.orderNumber}
                  </div>
                ))}
                {results.invoices?.map((i) => (
                  <div key={i._id} className="cursor-pointer rounded px-2 py-1 hover:bg-gray-50" onClick={() => { nav(`/invoices/${i._id}`); setResults(null); setQ(''); }}>
                    <span className="text-gray-400">Invoice</span> · {i.invoiceNumber}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative ml-auto">
            <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50">
              <div className="text-right">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-gray-400">{user?.role}</div>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo text-sm font-semibold text-white">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <ChevronDown size={15} className="text-gray-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-100 bg-white py-1 text-sm shadow-card">
                  <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setPwOpen(true); }}>
                    <KeyRound size={15} /> Change password
                  </button>
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-gray-50" onClick={() => logout().then(() => nav('/login'))}>
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
    </div>
  );
}
