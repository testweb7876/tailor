import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import api, { msg } from '../services/api';
import { useToast } from './Toast';
import Modal from './Modal';

function PasswordField({ label, value, onChange, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input pr-10"
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function ChangePassword({ onClose }) {
  const toast = useToast();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (newPassword !== confirm) return toast.error('New passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed');
      onClose();
    } catch (e) { toast.error(msg(e, 'Could not change password')); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Change password"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button></>}>
      <div className="space-y-3">
        <PasswordField label="Current password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        <PasswordField label="New password" value={newPassword} onChange={(e) => setNext(e.target.value)} hint="Min 8 characters, letters + numbers" />
        <PasswordField label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <p className="text-xs text-gray-400">Changing your password will sign you out of all other sessions.</p>
      </div>
    </Modal>
  );
}