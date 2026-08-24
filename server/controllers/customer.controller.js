const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Measurement = require('../models/Measurement');
const Invoice = require('../models/Invoice');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');
const activity = require('../services/activityService');

// GET /api/customers
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, search, city, archived, sort } = req.query;
  const filter = { ...req.branchFilter };
  filter.isArchived = archived === 'true';
  if (city) filter.city = { $regex: city, $options: 'i' };
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { altMobile: { $regex: search, $options: 'i' } },
      { customerCode: { $regex: search, $options: 'i' } },
    ];
  }
  const result = await paginate(Customer, filter, { page, limit, sort: sort || '-createdAt' });
  res.json({ success: true, ...result });
});

// GET /api/customers/search?phone= (fast phone/name lookup for the header search)
exports.search = asyncHandler(async (req, res) => {
  const { phone, name, q } = req.query;
  const term = phone || name || q;
  if (!term || String(term).trim().length < 2) return res.json({ success: true, data: [] });
  const rx = { $regex: String(term).trim(), $options: 'i' };
  const data = await Customer.find({
    isArchived: false,
    $or: [{ mobile: rx }, { altMobile: rx }, { fullName: rx }, { customerCode: rx }],
  })
    .select('customerCode fullName mobile city outstandingBalance')
    .limit(10)
    .lean();
  res.json({ success: true, data });
});

// POST /api/customers
exports.create = asyncHandler(async (req, res) => {
  const existing = await Customer.findOne({ mobile: req.body.mobile });
  if (existing) throw ApiError.conflict('A customer with this mobile number already exists');

  const customer = await Customer.create({
    ...req.body,
    branch: req.body.branch || req.user.branch || undefined,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, customer });
});

// GET /api/customers/:id
exports.getOne = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');

  // Overview extras for the profile header
  const [lastOrder, upcoming] = await Promise.all([
    Order.findOne({ customer: customer._id }).sort('-orderDate').select('orderNumber orderDate grandTotal status').lean(),
    Order.findOne({
      customer: customer._id,
      status: { $nin: ['delivered', 'cancelled'] },
      deliveryDate: { $gte: new Date() },
    })
      .sort('deliveryDate')
      .select('orderNumber deliveryDate status pendingAmount')
      .lean(),
  ]);

  res.json({ success: true, customer, overview: { lastOrder, upcomingDelivery: upcoming } });
});

// PUT /api/customers/:id
exports.update = asyncHandler(async (req, res) => {
  if (req.body.mobile) {
    const dupe = await Customer.findOne({ mobile: req.body.mobile, _id: { $ne: req.params.id } });
    if (dupe) throw ApiError.conflict('Another customer already uses this mobile number');
  }
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!customer) throw ApiError.notFound('Customer not found');
  await activity.log({
    req,
    action: 'customer.update',
    description: `Updated customer ${customer.fullName}`,
    resource: 'Customer',
    resourceId: customer._id,
  });
  res.json({ success: true, customer });
});

// DELETE /api/customers/:id  (archive by default; ?hard=true for real delete, SUPER_ADMIN only)
exports.remove = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');

  const hard = req.query.hard === 'true';
  if (hard) {
    if (req.user.role !== 'SUPER_ADMIN') throw ApiError.forbidden('Only Super Admin can permanently delete');
    const orderCount = await Order.countDocuments({ customer: customer._id });
    if (orderCount > 0) throw ApiError.badRequest('Cannot delete a customer with orders — archive instead');
    await customer.deleteOne();
    await activity.log({
      req, action: 'customer.delete',
      description: `Permanently deleted customer ${customer.fullName}`,
      resource: 'Customer', resourceId: customer._id,
    });
    return res.json({ success: true, message: 'Customer deleted' });
  }

  customer.isArchived = true;
  await customer.save();
  await activity.log({
    req, action: 'customer.archive',
    description: `Archived customer ${customer.fullName}`,
    resource: 'Customer', resourceId: customer._id,
  });
  res.json({ success: true, message: 'Customer archived', customer });
});

// GET /api/customers/:id/orders
exports.orders = asyncHandler(async (req, res) => {
  const result = await paginate(Order, { customer: req.params.id }, {
    page: req.query.page, limit: req.query.limit, sort: '-orderDate',
  });
  res.json({ success: true, ...result });
});

// GET /api/customers/:id/payments
exports.payments = asyncHandler(async (req, res) => {
  const result = await paginate(Payment, { customer: req.params.id }, {
    page: req.query.page, limit: req.query.limit, sort: '-paymentDate',
    populate: { path: 'order', select: 'orderNumber' },
  });
  res.json({ success: true, ...result });
});

// GET /api/customers/:id/invoices
exports.invoices = asyncHandler(async (req, res) => {
  const result = await paginate(Invoice, { customer: req.params.id }, {
    page: req.query.page, limit: req.query.limit, sort: '-invoiceDate',
  });
  res.json({ success: true, ...result });
});

// GET /api/customers/:id/measurements
exports.measurements = asyncHandler(async (req, res) => {
  const filter = { customer: req.params.id };
  if (req.query.active === 'true') filter.isActive = true;
  const data = await Measurement.find(filter).sort('-createdAt').lean();
  res.json({ success: true, data });
});

// GET /api/customers/:id/fabrics
exports.fabrics = asyncHandler(async (req, res) => {
  const Fabric = require('../models/Fabric');
  const data = await Fabric.find({ customer: req.params.id })
    .sort('-createdAt')
    .populate({ path: 'order', select: 'orderNumber' })
    .lean();
  res.json({ success: true, data });
});
