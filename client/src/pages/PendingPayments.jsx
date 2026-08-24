import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import api, { msg } from '../services/api';
import usePaginatedList from '../hooks/usePaginatedList';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { inr, fmtDate } from '../lib/format';

export default function PendingPayments() {
  const toast = useToast();
  const [overdue, setOverdue] = useState('');
  const { data, meta, loading, setPage } = usePaginatedList('/pending-payments', { overdue });

  const remind = async (customerId) => {
    try { const { data } = await api.get(`/pending-payments/${customerId}/reminder`); window.open(data.link, '_blank'); }
    catch (e) { toast.error(msg(e, 'Could not build reminder')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pending Payments</h1>
        <select className="input w-auto" value={overdue} onChange={(e) => { setOverdue(e.target.value); setPage(1); }}>
          <option value="">All</option><option value="true">Overdue only</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : data.length === 0 ? <EmptyState title="Nothing pending" hint="All caught up." /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Last Paid</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((r) => (
                <tr key={r.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><Link to={`/customers/${r.customerId}`} className="font-medium text-indigo hover:underline">{r.customer}</Link><div className="text-xs text-gray-400">{r.phone}</div></td>
                  <td className="px-4 py-3"><Link to={`/orders/${r.orderId}`} className="hover:underline">{r.orderNumber}</Link></td>
                  <td className="px-4 py-3 text-gray-500">{r.invoiceNumber || '—'}</td>
                  <td className="px-4 py-3 text-right">{inr(r.total)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{inr(r.paid)}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{inr(r.pending)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(r.deliveryDate)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(r.lastPaymentDate)}</td>
                  <td className="px-4 py-3 text-right"><button className="btn-ghost px-2 py-1 text-xs" onClick={() => remind(r.customerId)}><MessageCircle size={13} /> Remind</button></td>
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
