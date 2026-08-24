const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Fabric = require('../models/Fabric');

// GET /api/search?q=
exports.global = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ success: true, customers: [], orders: [], invoices: [], fabrics: [] });
  const rx = { $regex: q, $options: 'i' };

  const [customers, orders, invoices, fabrics] = await Promise.all([
    Customer.find({ $or: [{ fullName: rx }, { mobile: rx }, { altMobile: rx }, { customerCode: rx }] })
      .select('customerCode fullName mobile city outstandingBalance').limit(5).lean(),
    Order.find({ orderNumber: rx }).select('orderNumber status grandTotal pendingAmount')
      .populate('customer', 'fullName').limit(5).lean(),
    Invoice.find({ invoiceNumber: rx }).select('invoiceNumber invoiceDate').populate('customer', 'fullName').limit(5).lean(),
    Fabric.find({ code: rx }).select('name code color').populate('customer', 'fullName').limit(5).lean(),
  ]);
  res.json({ success: true, customers, orders, invoices, fabrics });
});
