import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Power, Users } from 'lucide-react';
import api, { msg } from '../services/api';
import usePaginatedList from '../hooks/usePaginatedList';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { titleCase } from '../lib/format';

export default function Staff() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();
  const [refreshKey, setRefreshKey] = useState(0);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/staff', { params: showInactive ? {} : { active: true } });
      setList(data.data || []);
    } catch (e) { toast.error(msg(e, 'Failed to load staff')); } finally { setLoading(false); }
  };

  useState(() => { load(); }, []); // eslint-disable-line

  const create = async (values) => {
    try { await api.post('/staff', values); toast.success('Staff added'); setOpen(false); reset(); load(); }
    catch (e) { toast.error(msg(e, 'Could not add staff')); }
  };

  const deactivate = async (id) => {
    try { await api.delete(`/staff/${id}`); toast.success('Staff deactivated'); load(); }
    catch (e) { toast.error(msg(e, 'Could not deactivate')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Staff / Tailors</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add Staff</button>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={showInactive} onChange={(e) => { setShowInactive(e.target.checked); setTimeout(load, 0); }} />
        Show inactive
      </label>

      {loading ? <div className="card p-8 text-center text-gray-400">Loading…</div> : list.length === 0 ? (
        <EmptyState title="No staff added yet" hint="Add tailors, cutters, or helpers so orders can be assigned to them." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{titleCase(s.role)}</td>
                  <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                  <td className="px-4 py-3">{s.isActive ? <span className="text-green-700">Active</span> : <span className="text-gray-400">Inactive</span>}</td>
                  <td className="px-4 py-3 text-right">
                    {s.isActive && <button className="text-gray-500 hover:text-red-600" onClick={() => deactivate(s._id)}><Power size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Staff"
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSubmit(create)} disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</button></>}>
        <div className="space-y-3">
          <div><label className="label">Name *</label><input className="input" {...register('name', { required: 'Required' })} />{errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}</div>
          <div><label className="label">Role</label>
            <select className="input" {...register('role')}>
              <option value="tailor">Tailor</option><option value="cutter">Cutter</option><option value="helper">Helper</option><option value="other">Other</option>
            </select></div>
          <div><label className="label">Phone</label><input className="input" {...register('phone')} /></div>
          <div><label className="label">Notes</label><input className="input" {...register('notes')} /></div>
        </div>
      </Modal>
    </div>
  );
}