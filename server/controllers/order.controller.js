const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Fabric = require('../models/Fabric');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');
const activity = require('../services/activityService');
const finance = require('../services/financeService');
const pdfService = require('../services/pdfService');
const Settings = require('../models/Settings');
const Measurement = require('../models/Measurement');

async function attachCustomerFilter(search) {
  const custIds = await Customer.find({
    $or: [
      { fullName: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
    ],
  }).select('_id').lean();
  return custIds.map((c) => c._id);
}

// GET /api/orders
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, status, paymentStatus, priority, customer, search, from, to, assignedTo } = req.query;
  const filter = { ...req.branchFilter };
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (priority) filter.priority = priority;
  if (customer) filter.customer = customer;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (from || to) {
    filter.orderDate = {};
    if (from) filter.orderDate.$gte = from;
    if (to) filter.orderDate.$lte = to;
  }
  if (search) {
    const custIds = await attachCustomerFilter(search);
    filter.$or = [{ orderNumber: { $regex: search, $options: 'i' } }, { customer: { $in: custIds } }];
  }
  const result = await paginate(Order, filter, {
    page, limit, sort: '-orderDate',
    populate: [{ path: 'customer', select: 'fullName mobile customerCode' }, { path: 'assignedTo', select: 'name role' }],
  });
  res.json({ success: true, ...result });
});

// POST /api/orders
exports.create = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.body.customer);
  if (!customer) throw ApiError.badRequest('Customer not found');

  const { advance, ...orderData } = req.body;
  const order = await Order.create({
    ...orderData,
    branch: req.body.branch || req.user.branch || undefined,
    createdBy: req.user._id,
  });

  for (const item of order.items) {
    if (item.fabric && (item.fabric.name || item.fabric.code || item.fabric.imageUrl)) {
      await Fabric.create({
        name: item.fabric.name || `${item.garmentType} fabric`,
        brand: item.fabric.brand, code: item.fabric.code, color: item.fabric.color,
        pattern: item.fabric.pattern, material: item.fabric.material,
        meters: item.fabric.meters, rate: item.fabric.rate, source: item.fabric.source || 'shop',
        imageUrl: item.fabric.imageUrl,
        customer: customer._id, order: order._id, orderItemId: item._id,
        createdBy: req.user._id,
      });
    }
  }

  // Advance → real Payment document, then recompute balances
  if (advance && advance.amount > 0) {
    if (advance.amount > order.grandTotal) throw ApiError.badRequest('Advance cannot exceed the order total');
    await Payment.create({
      order: order._id, customer: customer._id, amount: advance.amount,
      method: advance.method, transactionId: advance.transactionId, notes: advance.notes,
      isAdvance: true, status: 'paid', receivedBy: req.user._id,
    });
    await finance.recomputeOrderPayments(order._id);
  }
  await finance.recomputeCustomerRollups(customer._id);

  await activity.log({
    req, action: 'order.create',
    description: `Created order ${order.orderNumber} for ${customer.fullName} (₹${order.grandTotal})`,
    resource: 'Order', resourceId: order._id,
  });

  const fresh = await Order.findById(order._id).populate('customer', 'fullName mobile customerCode');
  res.status(201).json({ success: true, order: fresh });
});

// GET /api/orders/:id
exports.getOne = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'fullName mobile email address customerCode')
    .populate('items.measurement')
    .populate('assignedTo', 'name role phone');
  if (!order) throw ApiError.notFound('Order not found');
  const payments = await Payment.find({ order: order._id }).sort('-paymentDate').lean();
  res.json({ success: true, order, payments });
});

// PUT /api/orders/:id
exports.update = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (['delivered', 'cancelled'].includes(order.status)) {
    throw ApiError.badRequest(`A ${order.status} order cannot be edited`);
  }
  if (req.body.deliveryDate) order.deliveryReminderSent = false; 
  Object.assign(order, req.body);
  order.recalculateTotals();
  await order.save();
  await finance.recomputeOrderPayments(order._id); // keep paid/pending consistent
  await finance.recomputeCustomerRollups(order.customer);
  await activity.log({
    req, action: 'order.update', description: `Updated order ${order.orderNumber}`,
    resource: 'Order', resourceId: order._id,
  });
  res.json({ success: true, order });
});

// PATCH /api/orders/:id/status
exports.changeStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  const prev = order.status;
  order.status = req.body.status;
  await order.save();
  await finance.recomputeCustomerRollups(order.customer);
  await activity.log({
    req, action: 'order.status_change',
    description: `Order ${order.orderNumber}: ${prev} → ${order.status}`,
    resource: 'Order', resourceId: order._id, meta: { from: prev, to: order.status },
  });
  res.json({ success: true, order });
});


// GET /api/orders/:id/slip
exports.slip = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('customer', 'fullName mobile');
  if (!order) throw ApiError.notFound('Order not found');
  const settings = await Settings.getSingleton();
  const customerId = order.customer._id;
  const measurements = await Measurement.find({ customer: customerId, isActive: true }).lean();
  const buffer = await pdfService.generateOrderSlipPDF(order, settings, measurements);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="slip-${order.orderNumber}.pdf"`);
  res.send(buffer);
});