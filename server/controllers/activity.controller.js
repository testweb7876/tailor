const asyncHandler = require('../utils/asyncHandler');
const ActivityLog = require('../models/ActivityLog');
const paginate = require('../utils/paginate');

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, user, action, resource } = req.query;
  const filter = {};
  if (user) filter.user = user;
  if (action) filter.action = { $regex: action, $options: 'i' };
  if (resource) filter.resource = resource;
  const result = await paginate(ActivityLog, filter, {
    page, limit, sort: '-createdAt', populate: { path: 'user', select: 'name role' },
  });
  res.json({ success: true, ...result });
});
