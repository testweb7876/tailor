import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, CreditCard } from 'lucide-react';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';
import { inr, fmtDate, titleCase } from '../lib/format';
import StatusPill from '../components/StatusPill';
import Modal from '../components/Modal';

const FLOW = ['new','confirmed','cutting','stitching','trial','alteration','ready','delivered'];

export default function OrderDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [payOpen, setPayOpen] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order); setPayments(data.payments || []);
      try { const inv = await api.get('/invoices', { params: { search: '' } }); } catch {}
    } catch (e) { toast.error(msg(e, 'Failed to load order')); }
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  const changeStatus = async (status) => {
    try { const { data } = await api.patch(`/orders/${id}/status`, { status }); setOrder((o) => ({ ...o, status: data.order.status })); toast.success(`Status: ${status}`); }
    catch (e) { toast.error(msg(e, 'Could not update status')); }
  };

  const generateInvoice = async () => {
    try { const { data } = await api.post(`/invoices/${id}/generate`); toast.success(`Invoice ${data.invoice.invoiceNumber}`); nav(`/invoices/${data.invoice._id}`); }
    catch (e) { toast.error(msg(e, 'Could not generate invoice')); }
  };

  if (!order) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="space-y-5">
      <button onClick={() => nav('/orders')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-ink"><ArrowLeft size={15} /> Orders</button>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{order.orderNumber}</h1>
              {order.manualBillNo && <span className="text-sm text-gray-400">Bill #{order.manualBillNo}</span>}
              <StatusPill value={order.status} /><StatusPill value={order.paymentStatus} />
            </div>
            <div className="mt-1 text-sm text-gray-500">
              <Link to={`/customers/${order.customer?._id}`} className="text-indigo hover:underline">{order.customer?.fullName}</Link> · {order.customer?.mobile}
            </div>
            <div className="mt-1 text-sm text-gray-500">Order {fmtDate(order.orderDate)} · Delivery {fmtDate(order.deliveryDate)} · {titleCase(order.priority)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.pendingAmount > 0 && <button className="btn-primary" onClick={() => setPayOpen(true)}><CreditCard size={15} /> Receive Payment</button>}
            <button className="btn-ghost" onClick={() => window.open(`${api.defaults.baseURL}/orders/${id}/slip`, '_blank')}><FileText size={15} /> Print Slip</button>
            <button className="btn-ghost" onClick={generateInvoice}><FileText size={15} /> Generate Invoice</button>
          </div>
        </div>
      </div>

      {order.status !== 'cancelled' && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-600">Update status</h3>
          <div className="flex flex-wrap gap-2">
            {FLOW.map((s) => (
              <button key={s} onClick={() => changeStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${order.status === s ? 'bg-indigo text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{titleCase(s)}</button>
            ))}
            <button onClick={() => changeStatus('cancelled')} className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">Cancel</button>
          </div>
        </div>
      )}

      {order.assignedTo && (
          <div className="mt-1 text-sm text-gray-500">Assigned to: <span className="font-medium">{order.assignedTo.name}</span></div>
        )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Garment</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Fabric</th><th className="px-4 py-3 text-right">Stitching</th><th className="px-4 py-3 text-right">Fabric ₹</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.items.map((it) => (
                <tr key={it._id}><td className="px-4 py-3 font-medium">{titleCase(it.garmentType)}</td><td className="px-4 py-3">{it.quantity}</td>
                  <td className="px-4 py-3 text-gray-500">{it.fabric?.name || '—'}{it.fabric?.color ? ` (${it.fabric.color})` : ''}</td>
                  <td className="px-4 py-3 text-right">{inr(it.stitchingPrice)}</td><td className="px-4 py-3 text-right">{inr(it.fabric?.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-600">Totals</h3>
          <Row label="Subtotal" value={inr(order.subtotal)} />
          <Row label="Discount" value={`− ${inr(order.discount)}`} />
          {order.tax > 0 && <Row label={`Tax (${order.taxPercent}%)`} value={inr(order.tax)} />}
          <div className="my-2 border-t border-gray-100" />
          <Row label="Grand total" value={inr(order.grandTotal)} bold />
          <Row label="Paid" value={inr(order.paidAmount)} />
          <Row label="Pending" value={inr(order.pendingAmount)} bold danger={order.pendingAmount > 0} />
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-600">Payment history</h3>
        {payments.length === 0 ? <p className="text-sm text-gray-400">No payments yet.</p> : (
          <div className="divide-y divide-gray-50 text-sm">
            {payments.map((p) => (
              <div key={p._id} className="flex items-center justify-between py-2">
                <span>{p.paymentCode} · {titleCase(p.method)}{p.isAdvance ? ' · advance' : ''}</span>
                <span className="flex items-center gap-2"><StatusPill value={p.status} /><span className={p.status === 'refunded' ? 'text-gray-400' : 'text-green-700'}>{inr(p.amount)}</span></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {payOpen && <ReceivePayment orderId={id} max={order.pendingAmount} onClose={() => setPayOpen(false)} onDone={() => { setPayOpen(false); load(); }} />}
    </div>
  );
}

function ReceivePayment({ orderId, max, onClose, onDone }) {
  const toast = useToast();
  const [amount, setAmount] = useState(max);
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api.post(`/orders/${orderId}/payments`, { amount: Number(amount), method }); toast.success('Payment received'); onDone(); }
    catch (e) { toast.error(msg(e, 'Could not record payment')); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Receive payment"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Receive'}</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Amount ₹ (max {inr(max)})</label><input type="number" min="1" max={max} className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><label className="label">Method</label><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option>
        </select></div>
      </div>
    </Modal>
  );
}
function Row({ label, value, bold, danger }) {
  return <div className={`flex justify-between py-1 text-sm ${bold ? 'font-semibold' : 'text-gray-600'} ${danger ? 'text-red-600' : bold ? 'text-ink' : ''}`}><span>{label}</span><span>{value}</span></div>;
}