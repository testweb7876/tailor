import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Nothing here yet', hint, action }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-gray-200 py-14 text-center">
      <Inbox className="mb-2 text-gray-300" size={32} />
      <div className="font-medium text-gray-600">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-sm text-gray-400">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
