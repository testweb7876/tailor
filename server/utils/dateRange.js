const dayjs = require('dayjs');

/* Resolve a named preset or custom from/to into { start, end }. */
function resolveRange(preset, from, to) {
  const now = dayjs();
  switch (preset) {
    case 'today': return { start: now.startOf('day').toDate(), end: now.endOf('day').toDate() };
    case 'yesterday': {
      const y = now.subtract(1, 'day');
      return { start: y.startOf('day').toDate(), end: y.endOf('day').toDate() };
    }
    case 'week': return { start: now.startOf('week').toDate(), end: now.endOf('week').toDate() };
    case 'month': return { start: now.startOf('month').toDate(), end: now.endOf('month').toDate() };
    case 'custom':
      return {
        start: from ? dayjs(from).startOf('day').toDate() : now.startOf('month').toDate(),
        end: to ? dayjs(to).endOf('day').toDate() : now.endOf('day').toDate(),
      };
    default: return { start: now.startOf('month').toDate(), end: now.endOf('day').toDate() };
  }
}

module.exports = { resolveRange };
