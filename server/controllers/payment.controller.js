const asyncHandler = require('../utils/asyncHandler');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');
const activity = require('../services/activityService');
const finance = require('../services/financeService');

// POST /api/orders/:id/payments — manual payment against an order
exports.receiveForOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const { amount, method, transactionId, notes, paymentDate } = req.body;
  if (amount > order.pendingAmount + 0.01) {
    throw ApiError.badRequest(`Amount exceeds pending balance (₹${order.pendingAmount})`);
  }

  const payment = await Payment.create({
    order: order._id, customer: order.customer, amount, method,
    transactionId, notes, paymentDate: paymentDate || new Date(),
    status: 'paid', receivedBy: req.user._id,
  });

  const updated = await finance.recomputeOrderPayments(order._id);
  await finance.recomputeCustomerRollups(order.customer);

  await activity.log({
    req, action: 'payment.receive',
    description: `Received ₹${amount} (${method}) for order ${order.orderNumber}`,
    resource: 'Payment', resourceId: payment._id, meta: { order: order._id },
  });

  res.status(201).json({
    success: true, payment,
    order: { paidAmount: updated.paidAmount, pendingAmount: updated.pendingAmount, paymentStatus: updated.paymentStatus },
  });
});

// GET /api/payments
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, method, customer, order, from, to } = req.query;
  const filter = {};
  if (method) filter.method = method;
  if (customer) filter.customer = customer;
  if (order) filter.order = order;
  if (from || to) {
    filter.paymentDate = {};
    if (from) filter.paymentDate.$gte = from;
    if (to) filter.paymentDate.$lte = to;
  }
  const result = await paginate(Payment, filter, {
    page, limit, sort: '-paymentDate',
    populate: [{ path: 'customer', select: 'fullName mobile' }, { path: 'order', select: 'orderNumber' }],
  });
  res.json({ success: true, ...result });
});

// GET /api/payments/:id
exports.getOne = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('customer', 'fullName mobile').populate('order', 'orderNumber grandTotal');
  if (!payment) throw ApiError.notFound('Payment not found');
  res.json({ success: true, payment });
});

// POST /api/payments/:id/refund — records a refund payment (negative effect on paid)
exports.refund = asyncHandler(async (req, res) => {
  const original = await Payment.findById(req.params.id);
  if (!original) throw ApiError.notFound('Payment not found');
  if (original.status !== 'paid') throw ApiError.badRequest('Only a paid payment can be refunded');

  const amount = req.body.amount || original.amount;
  if (amount > original.amount) throw ApiError.badRequest('Refund cannot exceed the original payment');

  const refund = await Payment.create({
    order: original.order, customer: original.customer, amount,
    method: original.method, status: 'refunded', isAdvance: false,
    notes: req.body.notes || `Refund of ${original.paymentCode}`,
    transactionId: original.transactionId, receivedBy: req.user._id,
  });

  const updated = await finance.recomputeOrderPayments(original.order);
  await finance.recomputeCustomerRollups(original.customer);

  await activity.log({
    req, action: 'payment.refund',
    description: `Refunded ₹${amount} against ${original.paymentCode}`,
    resource: 'Payment', resourceId: refund._id,
  });
  res.status(201).json({ success: true, refund, order: updated && {
    paidAmount: updated.paidAmount, pendingAmount: updated.pendingAmount, paymentStatus: updated.paymentStatus,
  } });
});
