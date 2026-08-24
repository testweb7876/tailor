import React, { useEffect, useState } from "react";
import { useForm } from 'react-hook-form';
import { Plus, KeyRound, Power, Trash2 } from 'lucide-react';
import api, { msg } from '../services/api';
import usePaginatedList from '../hooks/usePaginatedList';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import StatusPill from '../components/StatusPill';
import PasswordInput from '../components/PasswordInput';
import { fmtDateTime, titleCase } from '../lib/format';

const PERMISSIONS = ['customers','orders','measurements','fabrics','payments','invoices','reports','settings','activity','dashboard','broadcast'];

export default function Admins() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [resetFor, setResetFor] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type:'disable'|'enable'|'delete', admin }
  const [busy, setBusy] = useState(false);
  const { data, meta, loading, setPage, reload } = usePaginatedList('/admins', {});
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    api.get('/branches').then(({ data }) => setBranches(data.data || [])).catch(() => {});
  }, []);

  const branchName = (id) => branches.find((b) => b._id === id)?.name;

  const create = async (values) => {
    try { await api.post('/admins', { ...values, permissions: selectedPerms, branch: selectedBranch || null }); toast.success('Admin created'); setOpen(false); reset(); setSelectedPerms([]); setSelectedBranch(''); reload(); }
    catch (e) { toast.error(msg(e, 'Could not create admin')); }
  };
  const toggle = async () => {
    setBusy(true);
    try {
      const status = confirm.type === 'disable' ? 'disabled' : 'active';
      await api.put(`/admins/${confirm.admin._id}`, { status });
      toast.success(confirm.type === 'disable' ? 'Admin disabled' : 'Admin enabled'); setConfirm(null); reload();
    } catch (e) { toast.error(msg(e, 'Action failed')); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/admins/${confirm.admin._id}`); toast.success('Admin deleted'); setConfirm(null); reload(); }
    catch (e) { toast.error(msg(e, 'Delete failed')); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admins</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New Admin</button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : data.length === 0 ? <EmptyState title="No users" /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((u) => {
                const isAdmin = u.role === 'ADMIN';
                return (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.role}</td>
                    <td className="px-4 py-3 text-xs">
                      {u.role === 'SUPER_ADMIN' ? (
                        <span className="text-gray-400">All branches</span>
                      ) : u.branch ? (
                        <span className="rounded-full bg-indigo/10 px-2 py-0.5 font-medium text-indigo">{branchName(u.branch) || 'Unknown'}</span>
                      ) : (
                        <span className="text-gray-400">All branches</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[240px] text-xs text-gray-500">
                      {u.role === 'SUPER_ADMIN' ? 'All' : (u.permissions?.length ? u.permissions.map(titleCase).join(', ') : '—')}
                    </td>
                    <td className="px-4 py-3"><StatusPill value={u.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{fmtDateTime(u.lastLogin)}</td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin ? (
                        <div className="flex justify-end gap-2 text-xs">
                          <button className="text-gray-500 hover:text-indigo" onClick={() => setResetFor(u)} title="Reset password"><KeyRound size={15} /></button>
                          <button className="text-gray-500 hover:text-amber-600" onClick={() => setConfirm({ type: u.status === 'active' ? 'disable' : 'enable', admin: u })} title="Enable/disable"><Power size={15} /></button>
                          <button className="text-gray-500 hover:text-red-600" onClick={() => setConfirm({ type: 'delete', admin: u })} title="Delete"><Trash2 size={15} /></button>
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Admin"
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSubmit(create)} disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Create'}</button></>}>
        <div className="space-y-3">
          <div><label className="label">Name *</label><input className="input" {...register('name', { required: 'Required' })} />{errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}</div>
          <div><label className="label">Email *</label><input className="input" type="email" {...register('email', { required: 'Required' })} />{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}</div>
          <div><label className="label">Phone</label><input className="input" {...register('phone')} /></div>
          <div>
            <label className="label">Password * (min 8, letters + numbers)</label>
            <PasswordInput {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {branches.length > 0 && (
            <div>
              <label className="label">Branch</label>
              <select className="input" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                <option value="">All branches</option>
                {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
              <p className="mt-1 text-xs text-gray-400">Leave as "All branches" for an admin who should see every location's data.</p>
            </div>
          )}

          <div>
            <label className="label">Module access</label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedPerms.includes(p)}
                    onChange={(e) => setSelectedPerms((prev) => e.target.checked ? [...prev, p] : prev.filter((x) => x !== p))} />
                  {titleCase(p)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {resetFor && <ResetPassword admin={resetFor} onClose={() => setResetFor(null)} />}

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} busy={busy}
        danger={confirm?.type !== 'enable'}
        onConfirm={confirm?.type === 'delete' ? remove : toggle}
        title={confirm?.type === 'delete' ? 'Delete admin' : confirm?.type === 'disable' ? 'Disable admin' : 'Enable admin'}
        confirmLabel={confirm?.type === 'delete' ? 'Delete' : confirm?.type === 'disable' ? 'Disable' : 'Enable'}
        message={confirm ? `${confirm.type === 'delete' ? 'Permanently delete' : confirm.type === 'disable' ? 'Disable' : 'Enable'} ${confirm.admin.name}? ${confirm.type !== 'enable' ? 'Their active sessions will end immediately.' : ''}` : ''} />
    </div>
  );
}

function ResetPassword({ admin, onClose }) {
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api.post(`/admins/${admin._id}/reset-password`, { newPassword: pw }); toast.success('Password reset'); onClose(); }
    catch (e) { toast.error(msg(e, 'Reset failed')); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Reset password — ${admin.name}`}
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy || pw.length < 8}>{busy ? 'Saving…' : 'Reset'}</button></>}>
      <label className="label">New password (min 8, letters + numbers)</label>
      <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} />
      <p className="mt-2 text-xs text-gray-400">The admin will be logged out of all sessions.</p>
    </Modal>
  );
}