import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Plus, Search, Archive } from 'lucide-react';
import api, { msg } from '../services/api';
import usePaginatedList from '../hooks/usePaginatedList';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { inr, fmtDate } from '../lib/format';

export default function Customers() {
  const nav = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState('false');
  const [open, setOpen] = useState(false);
  const { data, meta, loading, page, setPage, reload } = usePaginatedList('/customers', { search, archived });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const onCreate = async (values) => {
    try {
      await api.post('/customers', values);
      toast.success('Customer added');
      setOpen(false); reset(); reload();
    } catch (e) { toast.error(msg(e, 'Could not add customer')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Customers</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New Customer</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="input pl-9" placeholder="Search name, mobile or code…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-auto" value={archived} onChange={(e) => { setArchived(e.target.value); setPage(1); }}>
          <option value="false">Active</option>
          <option value="true">Archived</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : data.length === 0 ? (
          <EmptyState title="No customers found" hint="Add your first customer to get started." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Mobile</th><th className="px-4 py-3">City</th>
                <th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((c) => (
                <tr key={c._id} className="cursor-pointer hover:bg-gray-50" onClick={() => nav(`/customers/${c._id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.customerCode}</td>
                  <td className="px-4 py-3 font-medium">{c.fullName}{c.isArchived && <Archive size={13} className="ml-1 inline text-gray-400" />}</td>
                  <td className="px-4 py-3">{c.mobile}</td>
                  <td className="px-4 py-3 text-gray-500">{c.city || '—'}</td>
                  <td className="px-4 py-3 text-right">{c.totalOrders || 0}</td>
                  <td className={`px-4 py-3 text-right font-medium ${c.outstandingBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>{inr(c.outstandingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Customer"
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit(onCreate)} disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Full name *</label>
            <input className="input" {...register('fullName', { required: 'Required' })} />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}</div>
          <div><label className="label">Mobile *</label>
            <input className="input" {...register('mobile', { required: 'Required' })} />
            {errors.mobile && <p className="mt-1 text-xs text-red-600">{errors.mobile.message}</p>}</div>
          <div><label className="label">Alternate mobile</label><input className="input" {...register('altMobile')} /></div>
          <div className="col-span-2"><label className="label">Email</label><input className="input" type="email" {...register('email')} /></div>
          <div className="col-span-2"><label className="label">Address</label><input className="input" {...register('address')} /></div>
          <div><label className="label">City</label><input className="input" {...register('city')} /></div>
          <div><label className="label">State</label><input className="input" {...register('state')} /></div>
          <div><label className="label">Pincode</label><input className="input" {...register('pincode')} /></div>
          <div><label className="label">Notes</label><input className="input" {...register('notes')} /></div>
        </div>
      </Modal>
    </div>
  );
}
