import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Search, X, ArrowLeft, ImagePlus, Loader2 } from 'lucide-react';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';
import { inr, titleCase } from '../lib/format';

const GARMENTS = ['shirt','pant','trouser','kurta','pajama','suit','blazer','waistcoat','sherwani','jacket','custom'];
const blankItem = () => ({ garmentType: 'shirt', quantity: 1, stitchingPrice: 0, notes: '', fabric: { name: '', code: '', color: '', meters: 0, rate: 0, source: 'shop', imageUrl: '' } });

export default function CreateOrder() {
  const nav = useNavigate();
  const toast = useToast();
  const [sp] = useSearchParams();
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([blankItem()]);
  const [discount, setDiscount] = useState(0);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxPercent, setTaxPercent] = useState(5);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [trialDate, setTrialDate] = useState('');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [advance, setAdvance] = useState({ amount: 0, method: 'cash' });
  const [measurements, setMeasurements] = useState([]);
  const [busy, setBusy] = useState(false);
  const [manualBillNo, setManualBillNo] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    const cid = sp.get('customer');
    if (cid) api.get(`/customers/${cid}`).then(({ data }) => setCustomer(data.customer)).catch(() => {});
  }, [sp]);

  useEffect(() => {
    api.get('/staff', { params: { active: true } }).then(({ data }) => setStaffList(data.data || [])).catch(() => {});
  }, []);

  // load the customer's active measurements so items can reuse a saved profile
  useEffect(() => {
    if (!customer?._id) { setMeasurements([]); return; }
    api.get(`/customers/${customer._id}/measurements`, { params: { active: true } })
      .then(({ data }) => setMeasurements(data.data || [])).catch(() => setMeasurements([]));
  }, [customer]);

  // client-side PREVIEW only — the server is authoritative on submit
  const preview = (() => {
    const fabricTotal = items.reduce((s, it) => s + Number(it.fabric?.meters || 0) * Number(it.fabric?.rate || 0), 0);
    const stitchingTotal = items.reduce((s, it) => s + Number(it.stitchingPrice || 0) * Number(it.quantity || 1), 0);
    const subtotal = fabricTotal + stitchingTotal;
    const disc = Math.min(Number(discount || 0), subtotal);
    const tax = taxEnabled ? ((subtotal - disc) * Number(taxPercent || 0)) / 100 : 0;
    return { fabricTotal, stitchingTotal, subtotal, discount: disc, tax, grandTotal: subtotal - disc + tax };
  })();

  const [uploadingIdx, setUploadingIdx] = useState(null);
  const setItem = (i, patch) => setItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const setFabric = (i, patch) => setItems((p) => p.map((it, idx) => (idx === i ? { ...it, fabric: { ...it.fabric, ...patch } } : it)));

  const uploadFabricImage = async (i, file) => {
    if (!file) return;
    setUploadingIdx(i);
    try {
      const fd = new FormData(); fd.append('image', file);
      const { data } = await api.post('/fabrics/upload', fd);
      setFabric(i, { imageUrl: data.url });
      toast.success('Fabric photo added');
    } catch (e) { toast.error(msg(e, 'Upload failed — is Cloudinary configured?')); }
    finally { setUploadingIdx(null); }
  };

  const submit = async () => {
  if (!customer) return toast.error('Select a customer first');
  const missing = items.find((it) => !it.fabric?.imageUrl?.trim() && !it.fabric?.code?.trim());
  if (missing) return toast.error('Each garment needs a fabric photo or fabric code');
  setBusy(true);
    try {
      const payload = {
        customer: customer._id, items, discount: Number(discount || 0), taxEnabled, taxPercent: Number(taxPercent || 0),
        priority, notes, deliveryDate: deliveryDate || undefined, trialDate: trialDate || undefined,
        manualBillNo: manualBillNo || undefined,
        assignedTo: assignedTo || undefined,
      };
      if (Number(advance.amount) > 0) payload.advance = { amount: Number(advance.amount), method: advance.method };
      const { data } = await api.post('/orders', payload);
      toast.success(`Order ${data.order.orderNumber} created`);
      nav(`/orders/${data.order._id}`);
    } catch (e) { toast.error(msg(e, 'Could not create order')); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <button onClick={() => nav('/orders')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-ink"><ArrowLeft size={15} /> Orders</button>
      <h1 className="text-xl font-semibold">New Order</h1>

      <div className="card p-4">
        <label className="label">Customer</label>
        <CustomerPicker customer={customer} onPick={setCustomer} />
      </div>

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Item {i + 1}</span>
              {items.length > 1 && <button className="text-red-500 hover:text-red-600" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div><label className="label">Garment</label>
                <select className="input" value={it.garmentType} onChange={(e) => setItem(i, { garmentType: e.target.value })}>{GARMENTS.map((g) => <option key={g} value={g}>{titleCase(g)}</option>)}</select>
              </div>
              <div><label className="label">Qty</label><input type="number" min="1" className="input" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} /></div>
              <div><label className="label">Stitching ₹</label><input type="number" min="0" className="input" value={it.stitchingPrice} onChange={(e) => setItem(i, { stitchingPrice: e.target.value })} /></div>
              <div><label className="label">Notes</label><input className="input" value={it.notes} onChange={(e) => setItem(i, { notes: e.target.value })} /></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div><label className="label">Fabric</label><input className="input" value={it.fabric.name} onChange={(e) => setFabric(i, { name: e.target.value })} /></div>
              <div><label className="label">Color</label><input className="input" value={it.fabric.color} onChange={(e) => setFabric(i, { color: e.target.value })} /></div>
              <div><label className="label">Meters</label><input type="number" min="0" step="0.1" className="input" value={it.fabric.meters} onChange={(e) => setFabric(i, { meters: e.target.value })} /></div>
              <div><label className="label">Fabric Code</label><input className="input" value={it.fabric.code} onChange={(e) => setFabric(i, { code: e.target.value })} /></div>
              <div><label className="label">Rate ₹/m</label><input type="number" min="0" className="input" value={it.fabric.rate} onChange={(e) => setFabric(i, { rate: e.target.value })} /></div>
              <div><label className="label">Source</label><select className="input" value={it.fabric.source} onChange={(e) => setFabric(i, { source: e.target.value })}><option value="shop">Shop</option><option value="customer">Customer</option></select></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
  
              {/* Camera */}
              <label className="btn-ghost cursor-pointer text-sm">
                {uploadingIdx === i ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <span>📷</span>
                )}

                Take Photo

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => uploadFabricImage(i, e.target.files?.[0])}
                />
              </label>

              {/* Gallery */}
              <label className="btn-ghost cursor-pointer text-sm">
                <ImagePlus size={15} />
                Upload Photo

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadFabricImage(i, e.target.files?.[0])}
                />
              </label>

              {/* Preview */}
              {it.fabric.imageUrl && (
                <img
                  src={it.fabric.imageUrl}
                  alt="Fabric preview"
                  className="h-16 w-16 rounded-lg border object-cover"
                />
              )}

              {/* Required message */}
              {!it.fabric.imageUrl && !it.fabric.code && (
                <span className="text-xs text-amber-600">
                  Photo or code is required
                </span>
              )}
            </div>
            {measurements.length > 0 && (
              <div className="mt-3 max-w-xs">
                <label className="label">Use saved measurement</label>
                <select className="input" value={it.measurement || ''} onChange={(e) => setItem(i, { measurement: e.target.value || undefined })}>
                  <option value="">None</option>
                  {measurements.filter((m) => m.garmentType === it.garmentType).map((m) => (
                    <option key={m._id} value={m._id}>{titleCase(m.garmentType)} v{m.version}{m.fittingType ? ` · ${m.fittingType}` : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
        <button className="btn-ghost" onClick={() => setItems((p) => [...p, blankItem()])}><Plus size={16} /> Add item</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3 p-4">
          <h3 className="text-sm font-medium text-gray-600">Schedule & discount</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Trial date</label><input type="date" className="input" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} /></div>
            <div><label className="label">Delivery date</label><input type="date" className="input" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
            <div><label className="label">Priority</label><select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="express">Express</option></select></div>
            <div><label className="label">Discount ₹</label><input type="number" min="0" className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            <div><label className="label">Bill Book No.</label><input className="input" value={manualBillNo} onChange={(e) => setManualBillNo(e.target.value)} placeholder="e.g. 401" /></div>
          </div>
          <div><label className="label">Assign to</label>
            <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Unassigned</option>
              {staffList.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} /> Apply tax
            {taxEnabled && <input type="number" className="input ml-2 w-20" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />}{taxEnabled && '%'}
          </label>
          <div><label className="label">Order notes</label><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="rounded-lg bg-amber-50 p-3">
            <h4 className="mb-2 text-sm font-medium text-amber-800">Advance payment (optional)</h4>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="0" className="input" placeholder="Amount" value={advance.amount} onChange={(e) => setAdvance((p) => ({ ...p, amount: e.target.value }))} />
              <select className="input" value={advance.method} onChange={(e) => setAdvance((p) => ({ ...p, method: e.target.value }))}>
                <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-600">Summary <span className="text-xs font-normal text-gray-400">(preview — final total computed by server)</span></h3>
          <Row label="Fabric total" value={inr(preview.fabricTotal)} />
          <Row label="Stitching total" value={inr(preview.stitchingTotal)} />
          <Row label="Subtotal" value={inr(preview.subtotal)} />
          <Row label="Discount" value={`− ${inr(preview.discount)}`} />
          {taxEnabled && <Row label={`Tax (${taxPercent}%)`} value={inr(preview.tax)} />}
          <div className="my-2 border-t border-gray-100" />
          <Row label="Grand total" value={inr(preview.grandTotal)} bold />
          {Number(advance.amount) > 0 && <><Row label="Advance" value={`− ${inr(advance.amount)}`} /><Row label="Balance" value={inr(Math.max(preview.grandTotal - Number(advance.amount), 0))} bold /></>}
          <button className="btn-primary mt-4 w-full" onClick={submit} disabled={busy}>{busy ? 'Creating…' : 'Create order'}</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return <div className={`flex justify-between py-1 text-sm ${bold ? 'font-semibold text-ink' : 'text-gray-600'}`}><span>{label}</span><span>{value}</span></div>;
}
function CustomerPicker({ customer, onPick }) {
  const [q, setQ] = useState(''); const [results, setResults] = useState([]);
  const search = async (v) => { setQ(v); if (v.trim().length < 2) return setResults([]); try { const { data } = await api.get('/customers/search', { params: { q: v } }); setResults(data.data || []); } catch { setResults([]); } };
  if (customer) return <div className="flex items-center gap-2 text-sm"><span className="rounded-lg bg-indigo/10 px-3 py-1.5 text-indigo">{customer.fullName} · {customer.mobile}</span><button className="text-gray-400 hover:text-ink" onClick={() => onPick(null)}><X size={16} /></button></div>;
  return (
    <div className="relative max-w-md">
      <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
      <input className="input pl-9" placeholder="Search customer…" value={q} onChange={(e) => search(e.target.value)} />
      {results.length > 0 && <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-100 bg-white p-1 text-sm shadow-card">{results.map((c) => <div key={c._id} className="cursor-pointer rounded px-3 py-2 hover:bg-gray-50" onClick={() => { onPick(c); setResults([]); setQ(''); }}>{c.fullName} — {c.mobile}</div>)}</div>}
    </div>
  );
}
