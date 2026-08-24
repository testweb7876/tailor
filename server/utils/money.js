/* Round to 2 decimals, avoiding float drift (e.g. 1200.005 -> 1200.01). */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
module.exports = { round2 };
