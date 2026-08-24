const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');

// GET /api/pending-payments
exports.list = asyncHandler(async (req, res) => {
  const { customer, overdue, minAmount } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = { pendingAmount: { $gt: Number(minAmount) || 0 }, status: { $ne: 'cancelled' } };
  if (customer) filter.customer = customer;
  if (overdue === 'true') filter.deliveryDate = { $lt: new Date() };

  const [orders, total] = await Promise.all([
    Order.find(filter).sort('-pendingAmount').skip((page - 1) * limit).limit(limit)
      .populate('customer', 'fullName mobile').lean(),
    Order.countDocuments(filter),
  ]);

  const orderIds = orders.map((o) => o._id);
  const [invoices, lastPayments] = await Promise.all([
    Invoice.find({ order: { $in: orderIds } }).select('order invoiceNumber').lean(),
    Payment.aggregate([
      { $match: { order: { $in: orderIds }, status: 'paid' } },
      { $group: { _id: '$order', last: { $max: '$paymentDate' } } },
    ]),
  ]);
  const invMap = Object.fromEntries(invoices.map((i) => [String(i.order), i.invoiceNumber]));
  const payMap = Object.fromEntries(lastPayments.map((p) => [String(p._id), p.last]));

  const data = orders.map((o) => ({
    orderId: o._id,
    customerId: o.customer?._id,
    customer: o.customer?.fullName,
    phone: o.customer?.mobile,
    orderNumber: o.orderNumber,
    invoiceNumber: invMap[String(o._id)] || null,
    total: o.grandTotal,
    paid: o.paidAmount,
    pending: o.pendingAmount,
    deliveryDate: o.deliveryDate,
    lastPaymentDate: payMap[String(o._id)] || null,
  }));

  res.json({ success: true, data, meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
});

// GET /api/pending-payments/:customerId/reminder — whatsapp reminder link
exports.reminder = asyncHandler(async (req, res) => {
  const Customer = require('../models/Customer');
  const Settings = require('../models/Settings');
  const whatsapp = require('../services/whatsappService');
  const customer = await Customer.findById(req.params.customerId);
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  const settings = await Settings.getSingleton();
  const message = whatsapp.reminderMessage({
    shopName: settings.shop.name, customerName: customer.fullName, pending: customer.outstandingBalance,
  });
  res.json({ success: true, link: whatsapp.clickToChatLink(customer.mobile, message), message });
});
