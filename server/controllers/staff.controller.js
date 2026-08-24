const asyncHandler = require('../utils/asyncHandler');
const Staff = require('../models/Staff');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const activity = require('../services/activityService');

// GET /api/staff
exports.list = asyncHandler(async (req, res) => {
  const { active } = req.query;
  const filter = {};
  if (active !== undefined) filter.isActive = active === 'true';
  const data = await Staff.find(filter).sort('name').lean();
  res.json({ success: true, data });
});

// POST /api/staff
exports.create = asyncHandler(async (req, res) => {
  const staff = await Staff.create({ ...req.body, createdBy: req.user._id });
  await activity.log({ req, action: 'staff.create', description: `Added staff ${staff.name}`, resource: 'Staff', resourceId: staff._id });
  res.status(201).json({ success: true, staff });
});

// PUT /api/staff/:id
exports.update = asyncHandler(async (req, res) => {
  const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!staff) throw ApiError.notFound('Staff not found');
  res.json({ success: true, staff });
});

// DELETE /api/staff/:id — soft delete (deactivate) so past orders keep their reference
exports.remove = asyncHandler(async (req, res) => {
  const staff = await Staff.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!staff) throw ApiError.notFound('Staff not found');
  res.json({ success: true, message: 'Staff deactivated' });
});

// GET /api/staff/:id/orders — orders currently assigned to this staff member
exports.orders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ assignedTo: req.params.id, status: { $nin: ['delivered', 'cancelled'] } })
    .populate('customer', 'fullName mobile').sort('deliveryDate').lean();
  res.json({ success: true, data: orders });
});