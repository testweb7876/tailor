import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import usePaginatedList from '../hooks/usePaginatedList';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { inr, fmtDate } from '../lib/format';

export default function Invoices() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const { data, meta, loading, setPage } = usePaginatedList('/invoices', { search });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Invoices</h1>
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        <input className="input pl-9" placeholder="Search invoice #…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <div className="card overflow-x-auto">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : data.length === 0 ? <EmptyState title="No invoices" /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Balance</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((i) => (
                <tr key={i._id} className="cursor-pointer hover:bg-gray-50" onClick={() => nav(`/invoices/${i._id}`)}>
                  <td className="px-4 py-3 font-medium text-indigo">{i.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-500">{i.orderNumber}</td>
                  <td className="px-4 py-3">{i.customer?.fullName || i.customerSnapshot?.fullName}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(i.invoiceDate)}</td>
                  <td className="px-4 py-3 text-right">{inr(i.totals?.grandTotal)}</td>
                  <td className={`px-4 py-3 text-right ${i.totals?.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>{inr(i.totals?.balance)}</td>
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
