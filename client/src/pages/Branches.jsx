import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Power } from 'lucide-react';
import api, { msg } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function Branches() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/branches'); setList(data.data || []); }
    catch (e) { toast.error(msg(e, 'Failed to load branches')); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const create = async (values) => {
    try { await api.post('/branches', values); toast.success('Branch added'); setOpen(false); reset(); load(); }
    catch (e) { toast.error(msg(e, 'Could not add branch')); }
  };

  const deactivate = async (id) => {
    try { await api.delete(`/branches/${id}`); toast.success('Branch deactivated'); load(); }
    catch (e) { toast.error(msg(e, 'Could not deactivate')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Branches</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add Branch</button>
      </div>
      <p className="text-sm text-gray-500">Admins without a branch assigned can see all branches. Assign a branch to an admin to restrict them to that branch's customers and orders.</p>

      {loading ? <div className="card p-8 text-center text-gray-400">Loading…</div> : list.length === 0 ? (
        <EmptyState title="No branches yet" hint="This shop currently runs as a single location. Add a branch when you open a second location." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Address</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((b) => (
                <tr key={b._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-gray-500">{b.address || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{b.phone || '—'}</td>
                  <td className="px-4 py-3 text-right"><button className="text-gray-500 hover:text-red-600" onClick={() => deactivate(b._id)}><Power size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Branch"
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSubmit(create)} disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</button></>}>
        <div className="space-y-3">
          <div><label className="label">Branch name *</label><input className="input" {...register('name', { required: 'Required' })} />{errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}</div>
          <div><label className="label">Address</label><input className="input" {...register('address')} /></div>
          <div><label className="label">Phone</label><input className="input" {...register('phone')} /></div>
          <div><label className="label">WhatsApp number</label><input className="input" {...register('whatsappNumber')} /></div>
        </div>
      </Modal>
    </div>
  );
}