import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import api, { msg } from '../services/api';
import usePaginatedList from '../hooks/usePaginatedList';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import StatusPill from '../components/StatusPill';
import ConfirmDialog from '../components/ConfirmDialog';
import { inr, fmtDate, titleCase } from '../lib/format';

export default function Payments() {
  const toast = useToast();
  const [method, setMethod] = useState('');
  const [refundTarget, setRefundTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, meta, loading, setPage, reload } = usePaginatedList('/payments', { method });

  const doRefund = async () => {
    setBusy(true);
    try { await api.post(`/payments/${refundTarget._id}/refund`, {}); toast.success('Refund recorded'); setRefundTarget(null); reload(); }
    catch (e) { toast.error(msg(e, 'Refund failed')); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payments</h1>
        <select className="input w-auto" value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}>
          <option value="">All methods</option>{['cash','upi','card','bank_transfer','other'].map((m) => <option key={m} value={m}>{titleCase(m)}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : data.length === 0 ? <EmptyState title="No payments" /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Method</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.paymentCode}</td>
                  <td className="px-4 py-3">{fmtDate(p.paymentDate)}</td>
                  <td className="px-4 py-3">{p.customer?.fullName || '—'}</td>
                  <td className="px-4 py-3">{p.order ? <Link to={`/orders/${p.order._id}`} className="text-indigo hover:underline">{p.order.orderNumber}</Link> : '—'}</td>
                  <td className="px-4 py-3">{titleCase(p.method)}{p.isAdvance ? ' · adv' : ''}</td>
                  <td className={`px-4 py-3 text-right ${p.status === 'refunded' ? 'text-gray-400' : 'text-green-700'}`}>{inr(p.amount)}</td>
                  <td className="px-4 py-3"><StatusPill value={p.status} /></td>
                  <td className="px-4 py-3 text-right">{p.status === 'paid' && <button className="text-xs text-gray-500 hover:text-red-600" onClick={() => setRefundTarget(p)}><RotateCcw size={13} className="mr-1 inline" />Refund</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>

      <ConfirmDialog open={!!refundTarget} onClose={() => setRefundTarget(null)} onConfirm={doRefund} busy={busy} danger
        title="Refund payment" confirmLabel="Record refund"
        message={refundTarget ? `Record a full refund of ${inr(refundTarget.amount)} for ${refundTarget.paymentCode}? This adjusts the order's paid balance.` : ''} />
    </div>
  );
}
