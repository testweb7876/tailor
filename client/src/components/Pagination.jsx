import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm text-gray-500">
      <span>Page {meta.page} of {meta.pages} · {meta.total} total</span>
      <div className="flex gap-1">
        <button className="btn-ghost px-2 py-1" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft size={16} /></button>
        <button className="btn-ghost px-2 py-1" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}
