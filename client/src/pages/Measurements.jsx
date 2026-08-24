import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Copy, Search, X } from 'lucide-react';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { fmtDate, titleCase } from '../lib/format';

const DEFAULT_FIELDS = {
  shirt: ['length', 'chest', 'waist', 'shoulder', 'sleeve', 'collar'],
  pant: ['waist', 'hip', 'thigh', 'knee', 'bottom', 'length', 'rise'],
  trouser: ['waist', 'hip', 'thigh', 'knee', 'bottom', 'length', 'rise'],
  kurta: ['length', 'chest', 'waist', 'shoulder', 'sleeve'],
  pajama: ['waist', 'length', 'bottom'],
  suit: ['chest', 'waist', 'shoulder', 'sleeve', 'coatLength', 'trouserWaist', 'inseam'],
  blazer: ['chest', 'waist', 'shoulder', 'sleeve', 'length'],
  waistcoat: ['chest', 'waist', 'length'],
  sherwani: ['length', 'chest', 'waist', 'shoulder', 'sleeve'],
  jacket: ['chest', 'shoulder', 'sleeve', 'length'],
  custom: [],
};

export default function Measurements() {
  const [sp] = useSearchParams();
  const toast = useToast();
  const [customer, setCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const cid = sp.get('customer');
    if (cid) api.get(`/customers/${cid}`).then(({ data }) => setCustomer(data.customer)).catch(() => {});
  }, [sp]);

  const loadHistory = async (cid) => {
    try { const { data } = await api.get('/measurements/history', { params: { customer: cid } }); setHistory(data.data || []); }
    catch (e) { toast.error(msg(e, 'Failed to load history')); }
  };
  useEffect(() => { if (customer?._id) loadHistory(customer._id); }, [customer]); // eslint-disable-line

  const duplicate = async (mid) => {
    try { await api.post(`/measurements/${mid}/duplicate`); toast.success('Set as active version'); loadHistory(customer._id); }
    catch (e) { toast.error(msg(e, 'Could not duplicate')); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Measurements</h1>

      <CustomerPicker customer={customer} onPick={setCustomer} />

      {!customer ? (
        <EmptyState title="Pick a customer" hint="Search a customer above to view or add measurements." />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Showing history for <span className="font-medium text-ink">{customer.fullName}</span></div>
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add Measurement</button>
          </div>

          {history.length === 0 ? <EmptyState title="No measurements yet" /> : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {history.map((m) => (
                <div key={m._id} className={`card p-4 ${m.isActive ? 'ring-1 ring-indigo/30' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{titleCase(m.garmentType)}</span>
                    <span className="text-xs text-gray-400">v{m.version}{m.isActive ? ' · active' : ''}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-gray-600">
                    {Object.entries(m.values || {}).map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-gray-400">{k}</span><span>{v}</span></div>)}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{fmtDate(m.createdAt)}</span>
                    {!m.isActive && <button className="text-xs text-indigo hover:underline" onClick={() => duplicate(m._id)}><Copy size={12} className="mr-1 inline" />Use this</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {open && <AddMeasurement customer={customer} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); loadHistory(customer._id); }} />}
    </div>
  );
}

function CustomerPicker({ customer, onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const search = async (v) => {
    setQ(v);
    if (v.trim().length < 2) return setResults([]);
    try { const { data } = await api.get('/customers/search', { params: { q: v } }); setResults(data.data || []); } catch { setResults([]); }
  };
  if (customer) return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded-lg bg-indigo/10 px-3 py-1.5 text-indigo">{customer.fullName} · {customer.mobile}</span>
      <button className="text-gray-400 hover:text-ink" onClick={() => onPick(null)}><X size={16} /></button>
    </div>
  );
  return (
    <div className="relative max-w-md">
      <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
      <input className="input pl-9" placeholder="Search customer by name or mobile…" value={q} onChange={(e) => search(e.target.value)} />
      {results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-100 bg-white p-1 text-sm shadow-card">
          {results.map((c) => <div key={c._id} className="cursor-pointer rounded px-3 py-2 hover:bg-gray-50" onClick={() => { onPick(c); setResults([]); setQ(''); }}>{c.fullName} — {c.mobile}</div>)}
        </div>
      )}
    </div>
  );
}

function AddMeasurement({ customer, onClose, onSaved }) {
  const toast = useToast();
  const [garment, setGarment] = useState('shirt');
  const [values, setValues] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [fitting, setFitting] = useState('Regular');
  const [unit, setUnit] = useState('in');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const fields = [...(DEFAULT_FIELDS[garment] || []), ...customFields];

  const save = async () => {
    setBusy(true);
    try {
      await api.post('/measurements', { customer: customer._id, garmentType: garment, values, fittingType: fitting, unit, notes });
      toast.success('Measurement added'); onSaved();
    } catch (e) { toast.error(msg(e, 'Could not save')); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Add measurement — ${customer.fullName}`} wide
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Garment</label>
          <select className="input" value={garment} onChange={(e) => { setGarment(e.target.value); setValues({}); setCustomFields([]); }}>
            {Object.keys(DEFAULT_FIELDS).map((g) => <option key={g} value={g}>{titleCase(g)}</option>)}
          </select></div>
        <div><label className="label">Fitting</label><input className="input" value={fitting} onChange={(e) => setFitting(e.target.value)} /></div>
        <div><label className="label">Unit</label><select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}><option value="in">inches</option><option value="cm">cm</option></select></div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f}><label className="label capitalize">{f}</label>
            <input className="input" value={values[f] || ''} onChange={(e) => setValues((p) => ({ ...p, [f]: e.target.value }))} /></div>
        ))}
      </div>
      <button className="mt-3 text-sm text-indigo hover:underline" onClick={() => { const k = prompt('Field name (e.g. cuff)'); if (k) setCustomFields((p) => [...p, k]); }}>
        <Plus size={13} className="mr-1 inline" />Add custom field
      </button>
      <div className="mt-4"><label className="label">Notes</label><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
    </Modal>
  );
}
