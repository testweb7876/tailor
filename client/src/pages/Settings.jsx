import { useEffect, useState } from 'react';
import { Upload, CheckCircle2, XCircle } from 'lucide-react';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [integrations, setIntegrations] = useState({});
  const [tab, setTab] = useState('shop');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/settings').then(({ data }) => { setSettings(data.settings); setIntegrations(data.integrations || {}); })
      .catch((e) => toast.error(msg(e, 'Failed to load settings')));
  }, []); // eslint-disable-line

  const setField = (section, key, value) => setSettings((s) => ({ ...s, [section]: { ...s[section], [key]: value } }));

  const save = async () => {
    setBusy(true);
    try {
      const { shop, invoice, order, payment } = settings;
      const { data } = await api.put('/settings', { shop, invoice, order, payment });
      setSettings(data.settings); toast.success('Settings saved');
    } catch (e) { toast.error(msg(e, 'Could not save')); } finally { setBusy(false); }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('image', file);
    try { const { data } = await api.post('/settings/logo', fd); setField('shop', 'logoUrl', data.logoUrl); toast.success('Logo updated'); }
    catch (err) { toast.error(msg(err, 'Upload failed')); }
  };

  if (!settings) return <div className="text-gray-400">Loading…</div>;
  const TABS = ['shop', 'invoice', 'order', 'payment'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Settings</h1>
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-600">Integrations</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          {Object.entries(integrations).map(([k, v]) => (
            <span key={k} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${v ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {v ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {k}: {v ? 'connected' : 'not set'}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-indigo text-indigo' : 'text-gray-500 hover:text-ink'}`}>{t}</button>)}
      </div>

      <div className="card space-y-4 p-5">
        {tab === 'shop' && (
          <>
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-lg bg-gray-100 text-gray-400">
                {settings.shop?.logoUrl ? <img src={settings.shop.logoUrl} alt="logo" className="h-full w-full object-cover" /> : 'Logo'}
              </div>
              <label className="btn-ghost cursor-pointer"><Upload size={15} /> Upload logo<input type="file" accept="image/*" className="hidden" onChange={uploadLogo} /></label>
            </div>
            <Grid>
              <Field label="Shop name" v={settings.shop?.name} on={(x) => setField('shop', 'name', x)} />
              <Field label="Phone" v={settings.shop?.phone} on={(x) => setField('shop', 'phone', x)} />
              <Field label="Email" v={settings.shop?.email} on={(x) => setField('shop', 'email', x)} />
              <Field label="Website" v={settings.shop?.website} on={(x) => setField('shop', 'website', x)} />
              <Field label="GST Number" v={settings.shop?.gstNumber} on={(x) => setField('shop', 'gstNumber', x)} />
              <Field label="Currency" v={settings.shop?.currency} on={(x) => setField('shop', 'currency', x)} />
              <Field label="Address" v={settings.shop?.address} on={(x) => setField('shop', 'address', x)} full />
              <Field label="Tagline" v={settings.shop?.tagline} on={(x) => setField('shop', 'tagline', x)} full />
              <Field label="Proprietor name" v={settings.shop?.proprietorName} on={(x) => setField('shop', 'proprietorName', x)} />
              <Field label="Established year" v={settings.shop?.establishedYear} on={(x) => setField('shop', 'establishedYear', x)} />
              <Field label="WhatsApp number" v={settings.shop?.whatsappNumber} on={(x) => setField('shop', 'whatsappNumber', x)} />
            </Grid>
          </>
        )}
        {tab === 'invoice' && (
          <Grid>
            <Field label="Invoice prefix" v={settings.invoice?.prefix} on={(x) => setField('invoice', 'prefix', x)} />
            <Field label="GST %" type="number" v={settings.invoice?.gstPercent} on={(x) => setField('invoice', 'gstPercent', Number(x))} />
            <Field label="Terms" v={settings.invoice?.terms} on={(x) => setField('invoice', 'terms', x)} full />
            <Field label="Footer" v={settings.invoice?.footer} on={(x) => setField('invoice', 'footer', x)} full />
          </Grid>
        )}
        {tab === 'order' && (
          <Grid>
            <Field label="Order prefix" v={settings.order?.prefix} on={(x) => setField('order', 'prefix', x)} />
            <Field label="Default delivery days" type="number" v={settings.order?.defaultDeliveryDays} on={(x) => setField('order', 'defaultDeliveryDays', Number(x))} />
          </Grid>
        )}
        {tab === 'payment' && (
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!settings.payment?.manualEnabled} onChange={(e) => setField('payment', 'manualEnabled', e.target.checked)} />
              Manual payments enabled
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
function Grid({ children }) { return <div className="grid gap-3 md:grid-cols-2">{children}</div>; }
function Field({ label, v, on, type = 'text', full }) {
  return <div className={full ? 'md:col-span-2' : ''}><label className="label">{label}</label><input type={type} className="input" value={v ?? ''} onChange={(e) => on(e.target.value)} /></div>;
}
