import { useState } from 'react';
import api, { msg } from '../services/api';
import { useToast } from './Toast';
import Modal from './Modal';

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
        <div><label className="label">Current password</label><input type="password" className="input" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} /></div>
        <div><label className="label">New password (min 8, letters + numbers)</label><input type="password" className="input" value={newPassword} onChange={(e) => setNext(e.target.value)} /></div>
        <div><label className="label">Confirm new password</label><input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        <p className="text-xs text-gray-400">Changing your password will sign you out of all other sessions.</p>
      </div>
    </Modal>
  );
}
