import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, CreditCard, MessageCircle, Mail, ArrowLeft, Ruler, Pencil, Archive } from 'lucide-react';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';
import { inr, fmtDate, titleCase } from '../lib/format';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const TABS = ['Overview', 'Measurements', 'Orders', 'Fabrics', 'Payments', 'Invoices', 'Notes'];

export default function CustomerDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [customer, setCustomer] = useState(null);
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [tabData, setTabData] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const reloadCustomer = async () => {
    const { data } = await api.get(`/customers/${id}`);
    setCustomer(data.customer); setOverview(data.overview);
  };

  const emailLatestInvoice = async () => {
    try {
      const { data } = await api.get(`/customers/${id}/invoices`);
      const latest = (data.data || [])[0];
      if (!latest) return toast.info('No invoice to email yet');
      const res = await api.post(`/invoices/${latest._id}/email`);
      toast[res.data.emailed ? 'success' : 'info'](res.data.emailed ? `Emailed ${latest.invoiceNumber}` : `Email not configured (${res.data.detail})`);
    } catch (e) { toast.error(msg(e, 'Could not email')); }
  };

  const archive = async () => {
    setArchiving(true);
    try { await api.delete(`/customers/${id}`); toast.success('Customer archived'); nav('/customers'); }
    catch (e) { toast.error(msg(e, 'Could not archive')); } finally { setArchiving(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/customers/${id}`);
        setCustomer(data.customer); setOverview(data.overview);
      } catch (e) { toast.error(msg(e, 'Failed to load customer')); }
    })();
  }, [id]); // eslint-disable-line

  useEffect(() => {
    const map = { Measurements: 'measurements', Orders: 'orders', Fabrics: 'fabrics', Payments: 'payments', Invoices: 'invoices' };
    const key = map[tab];
    if (!key || tabData[tab]) return;
    (async () => {
      try {
        const { data } = await api.get(`/customers/${id}/${key}`);
        setTabData((p) => ({ ...p, [tab]: data.data || [] }));
      } catch (e) { toast.error(msg(e, 'Failed to load')); }
    })();
  }, [tab, id]); // eslint-disable-line

  if (!customer) return <div className="text-gray-400">Loading…</div>;
  const rows = tabData[tab] || [];

  return (
    <div className="space-y-5">
      <button onClick={() => nav('/customers')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-ink"><ArrowLeft size={15} /> Customers</button>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{customer.fullName}</h1>
              <span className="font-mono text-xs text-gray-400">{customer.customerCode}</span>
            </div>
            <div className="mt-1 text-sm text-gray-500">{customer.mobile}{customer.email ? ` · ${customer.email}` : ''}</div>
            <div className="text-sm text-gray-500">{[customer.address, customer.city, customer.state].filter(Boolean).join(', ') || '—'}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => nav(`/orders/new?customer=${id}`)}><Plus size={15} /> New Order</button>
            <button className="btn-ghost" onClick={() => nav(`/measurements?customer=${id}`)}><Ruler size={15} /> Measurement</button>
            <button className="btn-ghost" onClick={() => setPayOpen(true)}><CreditCard size={15} /> Receive Payment</button>
            <button className="btn-ghost" onClick={() => remind(id, toast)}><MessageCircle size={15} /> WhatsApp</button>
            <button className="btn-ghost" onClick={emailLatestInvoice}><Mail size={15} /> Email</button>
            <button className="btn-ghost" onClick={() => setEditOpen(true)}><Pencil size={15} /> Edit</button>
            {!customer.isArchived && <button className="btn-ghost text-red-600" onClick={() => setArchiveOpen(true)}><Archive size={15} /> Archive</button>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total Orders" value={customer.totalOrders || 0} />
          <Stat label="Total Spent" value={inr(customer.totalPurchase)} />
          <Stat label="Total Paid" value={inr(customer.totalPaid)} />
          <Stat label="Outstanding" value={inr(customer.outstandingBalance)} danger={customer.outstandingBalance > 0} />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-100">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-indigo text-indigo' : 'text-gray-500 hover:text-ink'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-600">Last Order</h3>
            {overview?.lastOrder ? (
              <Link to={`/orders/${overview.lastOrder._id}`} className="flex items-center justify-between text-sm hover:underline">
                <span>{overview.lastOrder.orderNumber} · {fmtDate(overview.lastOrder.orderDate)}</span>
                <StatusPill value={overview.lastOrder.status} />
              </Link>
            ) : <p className="text-sm text-gray-400">No orders yet.</p>}
          </div>
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-600">Upcoming Delivery</h3>
            {overview?.upcomingDelivery ? (
              <Link to={`/orders/${overview.upcomingDelivery._id}`} className="flex items-center justify-between text-sm hover:underline">
                <span>{overview.upcomingDelivery.orderNumber} · {fmtDate(overview.upcomingDelivery.deliveryDate)}</span>
                <StatusPill value={overview.upcomingDelivery.status} />
              </Link>
            ) : <p className="text-sm text-gray-400">No upcoming deliveries.</p>}
          </div>
          {customer.notes && <div className="card p-4 md:col-span-2"><h3 className="mb-1 text-sm font-medium text-gray-600">Notes</h3><p className="text-sm text-gray-600">{customer.notes}</p></div>}
        </div>
      )}

      {tab === 'Measurements' && (rows.length ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => (
            <div key={m._id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{titleCase(m.garmentType)}</span>
                <span className="text-xs text-gray-400">v{m.version}{m.isActive ? ' · active' : ''}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-gray-600">
                {Object.entries(m.values || {}).map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-gray-400">{k}</span><span>{v}</span></div>)}
              </div>
              {m.fittingType && <div className="mt-2 text-xs text-gray-400">Fit: {m.fittingType}</div>}
            </div>
          ))}
        </div>
      ) : <EmptyState title="No measurements" />)}

      {tab === 'Orders' && (rows.length ? (
        <SimpleTable cols={['Order', 'Date', 'Total', 'Pending', 'Status']}
          rows={rows.map((o) => [
            <Link key="l" to={`/orders/${o._id}`} className="font-medium text-indigo hover:underline">{o.orderNumber}</Link>,
            fmtDate(o.orderDate), inr(o.grandTotal), inr(o.pendingAmount), <StatusPill key="s" value={o.status} />,
          ])} />
      ) : <EmptyState title="No orders" />)}

      {tab === 'Fabrics' && (rows.length ? (
        <SimpleTable cols={['Fabric', 'Code', 'Color', 'Meters', 'Total', 'Order']}
          rows={rows.map((f) => [f.name, f.code || '—', f.color || '—', f.meters, inr(f.total), f.order?.orderNumber || '—'])} />
      ) : <EmptyState title="No fabric history" />)}

      {tab === 'Payments' && (rows.length ? (
        <SimpleTable cols={['Code', 'Date', 'Amount', 'Method', 'Order', 'Status']}
          rows={rows.map((p) => [p.paymentCode, fmtDate(p.paymentDate), inr(p.amount), titleCase(p.method), p.order?.orderNumber || '—', <StatusPill key="s" value={p.status} />])} />
      ) : <EmptyState title="No payments" />)}

      {tab === 'Invoices' && (rows.length ? (
        <SimpleTable cols={['Invoice', 'Date', 'Total', 'Balance']}
          rows={rows.map((i) => [
            <Link key="l" to={`/invoices/${i._id}`} className="font-medium text-indigo hover:underline">{i.invoiceNumber}</Link>,
            fmtDate(i.invoiceDate), inr(i.totals?.grandTotal), inr(i.totals?.balance),
          ])} />
      ) : <EmptyState title="No invoices" />)}

      {tab === 'Notes' && (
        <div className="card p-4">
          {customer.notes ? <p className="whitespace-pre-line text-sm text-gray-600">{customer.notes}</p> : <p className="text-sm text-gray-400">No notes. Use Edit to add notes.</p>}
        </div>
      )}

      {editOpen && <EditCustomer customer={customer} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); reloadCustomer(); }} />}
      {payOpen && <ReceivePaymentForCustomer customerId={id} onClose={() => setPayOpen(false)} onDone={() => { setPayOpen(false); reloadCustomer(); setTabData({}); }} toast={toast} />}
      <ConfirmDialog open={archiveOpen} onClose={() => setArchiveOpen(false)} onConfirm={archive} busy={archiving} danger
        title="Archive customer" confirmLabel="Archive" message={`Archive ${customer.fullName}? They'll be hidden from the active list but their orders and history are kept.`} />
    </div>
  );
}

function EditCustomer({ customer, onClose, onSaved }) {
  const toast = useToast();
  const { register, handleSubmit } = useForm({ defaultValues: customer });
  const [busy, setBusy] = useState(false);
  const save = async (values) => {
    setBusy(true);
    try { await api.put(`/customers/${customer._id}`, values); toast.success('Customer updated'); onSaved(); }
    catch (e) { toast.error(msg(e, 'Could not update')); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Edit customer"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={handleSubmit(save)} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="label">Full name</label><input className="input" {...register('fullName')} /></div>
        <div><label className="label">Mobile</label><input className="input" {...register('mobile')} /></div>
        <div><label className="label">Alternate mobile</label><input className="input" {...register('altMobile')} /></div>
        <div className="col-span-2"><label className="label">Email</label><input className="input" {...register('email')} /></div>
        <div className="col-span-2"><label className="label">Address</label><input className="input" {...register('address')} /></div>
        <div><label className="label">City</label><input className="input" {...register('city')} /></div>
        <div><label className="label">State</label><input className="input" {...register('state')} /></div>
        <div><label className="label">Pincode</label><input className="input" {...register('pincode')} /></div>
        <div className="col-span-2"><label className="label">Notes</label><textarea className="input" rows="3" {...register('notes')} /></div>
      </div>
    </Modal>
  );
}

function ReceivePaymentForCustomer({ customerId, onClose, onDone, toast }) {
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/customers/${customerId}/orders`).then(({ data }) => {
      const pend = (data.data || []).filter((o) => o.pendingAmount > 0);
      setOrders(pend);
      if (pend[0]) { setOrderId(pend[0]._id); setAmount(pend[0].pendingAmount); }
    }).catch(() => {});
  }, [customerId]);

  const selected = orders.find((o) => o._id === orderId);
  const save = async () => {
    setBusy(true);
    try { await api.post(`/orders/${orderId}/payments`, { amount: Number(amount), method }); toast.success('Payment received'); onDone(); }
    catch (e) { toast.error(msg(e, 'Could not record payment')); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Receive payment"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy || !orderId}>{busy ? 'Saving…' : 'Receive'}</button></>}>
      {orders.length === 0 ? <p className="text-sm text-gray-500">No orders with a pending balance.</p> : (
        <div className="space-y-3">
          <div><label className="label">Order</label>
            <select className="input" value={orderId} onChange={(e) => { setOrderId(e.target.value); const o = orders.find((x) => x._id === e.target.value); setAmount(o?.pendingAmount || ''); }}>
              {orders.map((o) => <option key={o._id} value={o._id}>{o.orderNumber} — pending {inr(o.pendingAmount)}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount ₹ {selected ? `(max ${inr(selected.pendingAmount)})` : ''}</label>
              <input type="number" min="1" max={selected?.pendingAmount} className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><label className="label">Method</label>
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option>
              </select></div>
          </div>
        </div>
      )}
    </Modal>
  );
}

async function remind(id, toast) {
  try { const { data } = await api.get(`/pending-payments/${id}/reminder`); window.open(data.link, '_blank'); }
  catch (e) { toast.error(msg(e, 'Could not build reminder')); }
}

function Stat({ label, value, danger }) {
  return <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">{label}</div><div className={`mt-0.5 text-lg font-semibold ${danger ? 'text-red-600' : ''}`}>{value}</div></div>;
}
function SimpleTable({ cols, rows }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>{cols.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => <tr key={i} className="hover:bg-gray-50">{r.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
