import { STATUS_TONE, titleCase } from '../lib/format';

export default function StatusPill({ value }) {
  const tone = STATUS_TONE[value] || 'bg-gray-100 text-gray-700';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{titleCase(value)}</span>;
}
