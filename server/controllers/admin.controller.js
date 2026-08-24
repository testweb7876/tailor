const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');
const activity = require('../services/activityService');

async function loadAdminTarget(id) {
  const user = await User.findById(id).select('+status');
  if (!user) throw ApiError.notFound('Admin not found');
  if (user.role !== 'ADMIN') {
    throw ApiError.forbidden('This account cannot be managed here');
  }
  return user;
}

// GET /api/admins
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, role, status, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const result = await paginate(User, filter, {
    page,
    limit,
    select: '-password -tokenVersion',
    sort: '-createdAt',
  });
  res.json({ success: true, ...result });
});

// POST /api/admins
exports.create = asyncHandler(async (req, res) => {
  const { name, email, phone, password, status } = req.body;

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const admin = await User.create({
    name, email, phone, password,
    status: status || 'active',
    role: 'ADMIN',
    createdBy: req.user._id,
    permissions: req.body.permissions || [],
    branch: req.body.branch || null,
  });

  await activity.log({
    req,
    action: 'admin.create',
    description: `Created admin ${admin.name} (${admin.email})`,
    resource: 'User',
    resourceId: admin._id,
  });

  res.status(201).json({ success: true, user: admin.toSafeJSON() });
});

exports.getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -tokenVersion');
  if (!user) throw ApiError.notFound('Admin not found');
  res.json({ success: true, user });
});

// PUT /api/admins/:id
exports.update = asyncHandler(async (req, res) => {
  const admin = await loadAdminTarget(req.params.id);
  const { name, phone, status } = req.body;

  if (name !== undefined) admin.name = name;
  if (phone !== undefined) admin.phone = phone;
  if (req.body.permissions !== undefined) admin.permissions = req.body.permissions;
  if (req.body.branch !== undefined) admin.branch = req.body.branch || null;

  let disabled = false;
  if (status !== undefined && status !== admin.status) {
    admin.status = status;
    if (status === 'disabled') {
      admin.tokenVersion += 1; 
      disabled = true;
    }
  }

  await admin.save();

  await activity.log({
    req,
    action: disabled ? 'admin.disable' : 'admin.update',
    description: `Updated admin ${admin.name}${disabled ? ' (disabled)' : ''}`,
    resource: 'User',
    resourceId: admin._id,
  });

  res.json({ success: true, user: admin.toSafeJSON() });
});

// DELETE /api/admins/:id
exports.remove = asyncHandler(async (req, res) => {
  const admin = await loadAdminTarget(req.params.id);
  await admin.deleteOne();

  await activity.log({
    req,
    action: 'admin.delete',
    description: `Deleted admin ${admin.name} (${admin.email})`,
    resource: 'User',
    resourceId: admin._id,
  });

  res.json({ success: true, message: 'Admin deleted' });
});

// POST /api/admins/:id/reset-password
exports.resetPassword = asyncHandler(async (req, res) => {
  const admin = await loadAdminTarget(req.params.id);
  admin.password = req.body.newPassword;
  admin.tokenVersion += 1; // force re-login everywhere
  await admin.save();

  await activity.log({
    req,
    action: 'admin.reset_password',
    description: `Reset password for admin ${admin.name}`,
    resource: 'User',
    resourceId: admin._id,
  });

  res.json({ success: true, message: 'Password reset. The admin must log in again.' });
});

// GET /api/admins/:id/activity
exports.activity = asyncHandler(async (req, res) => {
  const ActivityLog = require('../models/ActivityLog');
  const result = await paginate(
    ActivityLog,
    { user: req.params.id },
    { page: req.query.page, limit: req.query.limit, sort: '-createdAt' }
  );
  res.json({ success: true, ...result });
});
