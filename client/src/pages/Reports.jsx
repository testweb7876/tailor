import { useEffect, useState } from 'react';
import { Download, FileText, Sheet } from 'lucide-react';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { inr } from '../lib/format';

const REPORTS = [
  { key: 'sales', label: 'Sales' }, { key: 'revenue', label: 'Revenue' }, { key: 'payments', label: 'Payments' },
  { key: 'pending', label: 'Pending' }, { key: 'orders', label: 'Orders' }, { key: 'customers', label: 'Customers' }, { key: 'fabrics', label: 'Fabrics' },
];
const PRESETS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This Week'], ['month', 'This Month'], ['custom', 'Custom']];
const MONEY_KEYS = new Set(['subtotal','discount','tax','grandTotal','paid','pending','total','revenue','collected','totalPurchase','totalPaid','outstanding','amount','rate']);

export default function Reports() {
  const toast = useToast();
  const [type, setType] = useState('sales');
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const params = () => ({ preset, ...(preset === 'custom' ? { from, to } : {}) });

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get(`/reports/${type}`, { params: params() }); setRows(data.data || []); }
    catch (e) { toast.error(msg(e, 'Failed to load report')); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [type, preset]); // eslint-disable-line

  const exportAs = (format) => {
    const q = new URLSearchParams({ format, ...params() }).toString();
    window.open(`/api/reports/${type}?${q}`, '_blank');
  };

  const cols = rows[0] ? Object.keys(rows[0]) : [];
  const fmtCell = (k, v) => {
    if (v == null) return '—';
    if (MONEY_KEYS.has(k) && typeof v === 'number') return inr(v);
    if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString('en-IN');
    return String(v);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Reports</h1>
        <div className="flex gap-2">
          {/* <button className="btn-ghost" onClick={() => exportAs('csv')} disabled={!rows.length}><Download size={15} /> CSV</button> */}
          {/* <button className="btn-ghost" onClick={() => exportAs('xlsx')} disabled={!rows.length}><Sheet size={15} /> Excel</button> */}
          {/* <button className="btn-ghost" onClick={() => exportAs('pdf')} disabled={!rows.length}><FileText size={15} /> PDF</button> */}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-100">
        {REPORTS.map((r) => (
          <button key={r.key} onClick={() => setType(r.key)}
            className={`px-3 py-2 text-sm font-medium ${type === r.key ? 'border-b-2 border-indigo text-indigo' : 'text-gray-500 hover:text-ink'}`}>{r.label}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={preset} onChange={(e) => setPreset(e.target.value)}>{PRESETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        {preset === 'custom' && (
          <>
            <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
            <button className="btn-primary" onClick={load}>Apply</button>
          </>
        )}
      </div>

      <div className="card overflow-x-auto">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : rows.length === 0 ? <EmptyState title="No data for this range" /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>{cols.map((c) => <th key={c} className="whitespace-nowrap px-4 py-3">{c.replace(/([A-Z])/g, ' $1')}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r, i) => <tr key={i} className="hover:bg-gray-50">{cols.map((c) => <td key={c} className="whitespace-nowrap px-4 py-3">{fmtCell(c, r[c])}</td>)}</tr>)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
