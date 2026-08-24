export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const titleCase = (s) => (s ? String(s).replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

// tone classes for order/payment status pills
export const STATUS_TONE = {
  new: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-50 text-blue-700',
  cutting: 'bg-amber-50 text-amber-700',
  stitching: 'bg-amber-50 text-amber-700',
  trial: 'bg-purple-50 text-purple-700',
  alteration: 'bg-orange-50 text-orange-700',
  ready: 'bg-teal-50 text-teal-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  unpaid: 'bg-red-50 text-red-700',
  partial: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
  refunded: 'bg-gray-100 text-gray-600',
  active: 'bg-green-50 text-green-700',
  disabled: 'bg-red-50 text-red-700',
};
