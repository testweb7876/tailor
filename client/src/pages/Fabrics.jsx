import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import usePaginatedList from '../hooks/usePaginatedList';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { inr, fmtDate, titleCase } from '../lib/format';

export default function Fabrics() {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const { data, meta, loading, setPage } = usePaginatedList('/fabrics', { search, source });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Fabrics</h1>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="input pl-9" placeholder="Search name, code, color…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-auto" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
          <option value="">All sources</option><option value="shop">Shop</option><option value="customer">Customer</option>
        </select>
      </div>

      {loading ? <div className="card p-8 text-center text-gray-400">Loading…</div> : data.length === 0 ? <EmptyState title="No fabrics" hint="Fabrics are added while creating orders." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((f) => (
            <div key={f._id} className="card overflow-hidden">
              <div className="h-32 bg-gray-100">
                {f.imageUrl ? <img src={f.imageUrl} alt={f.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-gray-300">No image</div>}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-xs text-gray-400">{titleCase(f.source)}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{[f.code, f.color, f.material].filter(Boolean).join(' · ') || '—'}</div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-500">{f.meters} m × {inr(f.rate)}</span><span className="font-medium">{inr(f.total)}</span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {f.customer?.fullName ? <>{f.customer.fullName}</> : ''}{f.order?.orderNumber ? ` · ${f.order.orderNumber}` : ''} · {fmtDate(f.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination meta={meta} onPage={setPage} />
    </div>
  );
}
