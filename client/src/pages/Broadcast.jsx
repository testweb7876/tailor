import { useState } from 'react';
import { Send } from 'lucide-react';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';

export default function Broadcast() {
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const send = async () => {
    if (!message.trim()) return toast.error('Message cannot be empty');
    setBusy(true);
    try {
      const { data } = await api.post('/broadcast', { message });
      setResult(data);
      if (data.mode === 'cloud') toast.success(`Sent to ${data.delivered}/${data.total} customers`);
      else toast.info(`WhatsApp Cloud API not configured — ${data.total} manual links generated below`);
    } catch (e) { toast.error(msg(e, 'Could not send broadcast')); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Broadcast Offer / Message</h1>
      <p className="text-sm text-gray-500">This message will be sent to every active customer on WhatsApp.</p>

      <div className="card p-4 space-y-3">
        <textarea className="input" rows="5" placeholder="e.g. Diwali offer: 20% off on all suit orders this week!"
          value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="btn-primary" onClick={send} disabled={busy}>
          <Send size={16} /> {busy ? 'Sending…' : 'Send to all customers'}
        </button>
      </div>

      {result && (
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-600">
            {result.mode === 'cloud' ? `Delivered ${result.delivered} / ${result.total}` : `Manual links (${result.total} customers)`}
          </h3>
          {result.mode === 'manual' && (
            <div className="max-h-96 space-y-1 overflow-y-auto text-sm">
              {result.links.map((l, i) => (
                <div key={i} className="flex items-center justify-between border-b border-gray-50 py-1.5">
                  <span>{l.customer}</span>
                  <a href={l.link} target="_blank" rel="noreferrer" className="text-indigo hover:underline">Open chat</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}