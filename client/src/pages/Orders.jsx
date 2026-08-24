import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import usePaginatedList from '../hooks/usePaginatedList';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import StatusPill from '../components/StatusPill';
import { inr, fmtDate } from '../lib/format';

const STATUSES = ['new','confirmed','cutting','stitching','trial','alteration','ready','delivered','cancelled'];

export default function Orders() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const { data, meta, loading, setPage } = usePaginatedList('/orders', { search, status, paymentStatus });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
        <button className="btn-primary" onClick={() => nav('/orders/new')}><Plus size={16} /> New Order</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="input pl-9" placeholder="Search order # or customer…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
          <option value="">Any payment</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : data.length === 0 ? <EmptyState title="No orders found" /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((o) => (
                <tr key={o._id} className="cursor-pointer hover:bg-gray-50" onClick={() => nav(`/orders/${o._id}`)}>
                  <td className="px-4 py-3 font-medium text-indigo">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.customer?.fullName}<div className="text-xs text-gray-400">{o.customer?.mobile}</div></td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(o.deliveryDate)}</td>
                  <td className="px-4 py-3 text-right">{inr(o.grandTotal)}</td>
                  <td className={`px-4 py-3 text-right ${o.pendingAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{inr(o.pendingAmount)}</td>
                  <td className="px-4 py-3"><StatusPill value={o.paymentStatus} /></td>
                  <td className="px-4 py-3"><StatusPill value={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>
    </div>
  );
}
