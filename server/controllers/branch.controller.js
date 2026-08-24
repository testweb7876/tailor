const asyncHandler = require('../utils/asyncHandler');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const activity = require('../services/activityService');

// GET /api/branches — everyone can see the list (for dropdowns)
exports.list = asyncHandler(async (req, res) => {
  const data = await Branch.find({ isActive: true }).sort('name').lean();
  res.json({ success: true, data });
});

// POST /api/branches — SUPER_ADMIN only
exports.create = asyncHandler(async (req, res) => {
  const branch = await Branch.create(req.body);
  await activity.log({ req, action: 'branch.create', description: `Created branch ${branch.name}`, resource: 'Branch', resourceId: branch._id });
  res.status(201).json({ success: true, branch });
});

// PUT /api/branches/:id — SUPER_ADMIN only
exports.update = asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!branch) throw ApiError.notFound('Branch not found');
  await activity.log({ req, action: 'branch.update', description: `Updated branch ${branch.name}`, resource: 'Branch', resourceId: branch._id });
  res.json({ success: true, branch });
});

// DELETE /api/branches/:id — soft delete
exports.remove = asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!branch) throw ApiError.notFound('Branch not found');
  res.json({ success: true, message: 'Branch deactivated' });
});