import { useState } from 'react';
import { Search } from 'lucide-react';
import usePaginatedList from '../hooks/usePaginatedList';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { fmtDateTime } from '../lib/format';

export default function ActivityLogs() {
  const [action, setAction] = useState('');
  const { data, meta, loading, setPage } = usePaginatedList('/activity', { action });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Activity Logs</h1>
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        <input className="input pl-9" placeholder="Filter by action (e.g. order, payment, login)…" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
      </div>

      <div className="card overflow-x-auto">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : data.length === 0 ? <EmptyState title="No activity" /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">IP</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((a) => (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">{fmtDateTime(a.createdAt)}</td>
                  <td className="px-4 py-3">{a.user?.name || a.userName || '—'}</td>
                  <td className="px-4 py-3"><span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">{a.action}</span></td>
                  <td className="px-4 py-3 text-gray-600">{a.description}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{a.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>
    </div>
  );
}
