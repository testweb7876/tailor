const asyncHandler = require('../utils/asyncHandler');
const { Parser } = require('json2csv');
const XLSX = require('xlsx');
const { generateReportPDF } = require('../services/pdfService');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Fabric = require('../models/Fabric');
const { resolveRange } = require('../utils/dateRange');

async function maybeCsv(res, req, rows, filename) {
  const fmt = req.query.format;
  if (fmt === 'csv' && rows.length) {
    const csv = new Parser().parse(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  }
  if (fmt === 'xlsx' && rows.length) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return res.send(buf);
  }
  if (fmt === 'pdf') {
    const buf = await generateReportPDF(filename.replace(/-/g, ' ').toUpperCase(), rows);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);
    return res.send(buf);
  }
  return res.json({ success: true, data: rows });
}

function range(req) { return resolveRange(req.query.preset, req.query.from, req.query.to); }

// GET /api/reports/sales
exports.sales = asyncHandler(async (req, res) => {
  const { start, end } = range(req);
  const orders = await Order.find({ orderDate: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } })
    .populate('customer', 'fullName mobile').sort('orderDate').lean();
  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber,
    date: new Date(o.orderDate).toLocaleDateString('en-IN'),
    customer: o.customer?.fullName, phone: o.customer?.mobile,
    subtotal: o.subtotal, discount: o.discount, tax: o.tax, grandTotal: o.grandTotal,
    paid: o.paidAmount, pending: o.pendingAmount, status: o.status,
  }));
  return maybeCsv(res, req, rows, 'sales-report');
});

// GET /api/reports/revenue — monthly grouped revenue in range
exports.revenue = asyncHandler(async (req, res) => {
  const { start, end } = range(req);
  const rows = await Order.aggregate([
    { $match: { orderDate: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
    { $group: { _id: { y: { $year: '$orderDate' }, m: { $month: '$orderDate' } },
      orders: { $sum: 1 }, revenue: { $sum: '$grandTotal' }, collected: { $sum: '$paidAmount' } } },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);
  const data = rows.map((r) => ({ period: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`, orders: r.orders, revenue: r.revenue, collected: r.collected }));
  return maybeCsv(res, req, data, 'revenue-report');
});

// GET /api/reports/payments
exports.payments = asyncHandler(async (req, res) => {
  const { start, end } = range(req);
  const payments = await Payment.find({ paymentDate: { $gte: start, $lte: end } })
    .populate('customer', 'fullName').populate('order', 'orderNumber').sort('paymentDate').lean();
  const rows = payments.map((p) => ({
    paymentCode: p.paymentCode,
    date: new Date(p.paymentDate).toLocaleDateString('en-IN'), 
    customer: p.customer?.fullName,
    order: p.order?.orderNumber, amount: p.amount, method: p.method, status: p.status, txn: p.transactionId || '',
  }));
  return maybeCsv(res, req, rows, 'payment-report');
});

// GET /api/reports/pending
exports.pending = asyncHandler(async (req, res) => {
  const orders = await Order.find({ pendingAmount: { $gt: 0 }, status: { $ne: 'cancelled' } })
    .populate('customer', 'fullName mobile').sort('-pendingAmount').lean();
  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber, customer: o.customer?.fullName, phone: o.customer?.mobile,
    total: o.grandTotal, paid: o.paidAmount, pending: o.pendingAmount,
    deliveryDate: o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('en-IN') : '',  
    status: o.status,
  }));
  return maybeCsv(res, req, rows, 'pending-report');
});

// GET /api/reports/orders
exports.orders = asyncHandler(async (req, res) => {
  const { start, end } = range(req);
  const filter = { orderDate: { $gte: start, $lte: end } };
  if (req.query.status) filter.status = req.query.status;
  const orders = await Order.find(filter).populate('customer', 'fullName').sort('orderDate').lean();
  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber,
    date: new Date(o.orderDate).toLocaleDateString('en-IN'),  
    customer: o.customer?.fullName,
    items: o.items.length, priority: o.priority, status: o.status, grandTotal: o.grandTotal,
  }));
  return maybeCsv(res, req, rows, 'order-report');
});

// GET /api/reports/customers
exports.customers = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ isArchived: false }).sort('-totalPurchase').lean();
  const rows = customers.map((c) => ({
    customerCode: c.customerCode, name: c.fullName, mobile: c.mobile, city: c.city || '',
    totalOrders: c.totalOrders, totalPurchase: c.totalPurchase, totalPaid: c.totalPaid, outstanding: c.outstandingBalance,
  }));
  return maybeCsv(res, req, rows, 'customer-report');
});

// GET /api/reports/fabrics
exports.fabrics = asyncHandler(async (req, res) => {
  const fabrics = await Fabric.find().populate('customer', 'fullName').populate('order', 'orderNumber').sort('-createdAt').lean();
  const rows = fabrics.map((f) => ({
    name: f.name, code: f.code || '', brand: f.brand || '', color: f.color || '', material: f.material || '',
    meters: f.meters, rate: f.rate, total: f.total, source: f.source,
    customer: f.customer?.fullName || '', order: f.order?.orderNumber || '',
    date: new Date(f.createdAt).toLocaleDateString('en-IN'),  
  }));
  return maybeCsv(res, req, rows, 'fabric-report');
});
