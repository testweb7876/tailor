import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Mail, MessageCircle } from 'lucide-react';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';
import { inr, fmtDate, titleCase } from '../lib/format';

export default function InvoiceDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [inv, setInv] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/invoices/${id}`).then(({ data }) => setInv(data.invoice)).catch((e) => toast.error(msg(e, 'Failed to load invoice')));
  }, [id]); // eslint-disable-line

  const openPdf = async () => {
    try {
      const { data } = await api.get('/auth/download-token');
      window.open(`${api.defaults.baseURL}/invoices/${id}/pdf?token=${data.token}`, '_blank');
    } catch (e) { toast.error(msg(e, 'Could not open PDF')); }
  };

  const sendEmail = async () => {
    setSending(true);
    try { const { data } = await api.post(`/invoices/${id}/email`); toast[data.emailed ? 'success' : 'info'](data.emailed ? `Emailed to ${data.to}` : `Email not configured (${data.detail})`); }
    catch (e) { toast.error(msg(e, 'Could not email')); } finally { setSending(false); }
  };
  const whatsapp = async () => {
    try { const { data } = await api.get(`/invoices/${id}/whatsapp`); window.open(data.link, '_blank'); }
    catch (e) { toast.error(msg(e, 'Could not build link')); }
  };

  if (!inv) return <div className="text-gray-400">Loading…</div>;
  const s = inv.shopSnapshot || {}, c = inv.customerSnapshot || {}, t = inv.totals || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => nav('/invoices')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-ink"><ArrowLeft size={15} /> Invoices</button>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={openPdf}><FileText size={15} /> PDF</button>
          <button className="btn-ghost" onClick={sendEmail} disabled={sending}><Mail size={15} /> {sending ? 'Sending…' : 'Email'}</button>
          <button className="btn-ghost" onClick={whatsapp}><MessageCircle size={15} /> WhatsApp</button>
        </div>
      </div>

      <div className="card mx-auto max-w-3xl p-8">
        <div className="flex items-start justify-between border-b border-gray-100 pb-5">
          <div>
            <h2 className="text-lg font-bold">{s.name}</h2>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-500">{s.address}</p>
            {s.phone && <p className="text-sm text-gray-500">{s.phone}</p>}
            {s.gstNumber && <p className="text-sm text-gray-500">GSTIN: {s.gstNumber}</p>}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-indigo">INVOICE</div>
            <div className="mt-1 text-sm text-gray-500">{inv.invoiceNumber}</div>
            <div className="text-sm text-gray-500">Order {inv.orderNumber}</div>
            <div className="text-sm text-gray-500">{fmtDate(inv.invoiceDate)}</div>
          </div>
        </div>

        <div className="py-5">
          <div className="text-xs uppercase tracking-wide text-gray-400">Bill To</div>
          <div className="font-medium">{c.fullName}</div>
          <div className="text-sm text-gray-500">{c.mobile}{c.email ? ` · ${c.email}` : ''}</div>
          <div className="text-sm text-gray-500">{c.address}</div>
        </div>

        <table className="w-full text-sm">
          <thead className="border-y border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
            <tr><th className="py-2">Garment</th><th className="py-2">Qty</th><th className="py-2">Fabric</th><th className="py-2 text-right">Stitching</th><th className="py-2 text-right">Fabric ₹</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(inv.itemsSnapshot || []).map((it, i) => (
              <tr key={i}><td className="py-2">{titleCase(it.garmentType)}</td><td className="py-2">{it.quantity}</td><td className="py-2 text-gray-500">{it.fabricName || '—'}</td>
                <td className="py-2 text-right">{inr(it.stitchingPrice)}</td><td className="py-2 text-right">{inr(it.fabricTotal)}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-5 max-w-xs space-y-1 text-sm">
          <Row label="Subtotal" value={inr(t.subtotal)} />
          {t.discount > 0 && <Row label="Discount" value={`− ${inr(t.discount)}`} />}
          {t.tax > 0 && <Row label={`Tax (${t.taxPercent}%)`} value={inr(t.tax)} />}
          <div className="border-t border-gray-100 pt-1"><Row label="Grand Total" value={inr(t.grandTotal)} bold /></div>
          <Row label="Paid" value={inr(t.paid)} />
          <Row label="Balance Due" value={inr(t.balance)} bold danger={t.balance > 0} />
        </div>

        {inv.footer && <p className="mt-8 border-t border-gray-100 pt-4 text-center text-sm italic text-gray-500">{inv.footer}</p>}
      </div>
    </div>
  );
}
function Row({ label, value, bold, danger }) {
  return <div className={`flex justify-between ${bold ? 'font-semibold' : 'text-gray-600'} ${danger ? 'text-red-600' : ''}`}><span>{label}</span><span>{value}</span></div>;
}