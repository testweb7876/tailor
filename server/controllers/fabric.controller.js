const asyncHandler = require('../utils/asyncHandler');
const Fabric = require('../models/Fabric');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');
const cloud = require('../services/cloudinaryService');
const activity = require('../services/activityService');

// GET /api/fabrics
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, search, source, customer, order } = req.query;
  const filter = {};
  if (source) filter.source = source;
  if (customer) filter.customer = customer;
  if (order) filter.order = order;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { color: { $regex: search, $options: 'i' } },
    ];
  }
  const result = await paginate(Fabric, filter, {
    page, limit, sort: '-createdAt',
    populate: [{ path: 'customer', select: 'fullName mobile' }, { path: 'order', select: 'orderNumber' }],
  });
  res.json({ success: true, ...result });
});

// POST /api/fabrics  (multipart: fields + optional `image` file)
exports.create = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user._id };
  ['meters', 'rate'].forEach((k) => { if (payload[k] !== undefined) payload[k] = Number(payload[k]); });

  if (req.file) {
    const uploaded = await cloud.uploadBuffer(req.file.buffer);
    if (uploaded) { payload.imageUrl = uploaded.url; payload.imagePublicId = uploaded.publicId; }
  }

  const fabric = await Fabric.create(payload);
  await activity.log({
    req, action: 'fabric.create',
    description: `Added fabric ${fabric.name}${fabric.code ? ` (${fabric.code})` : ''}`,
    resource: 'Fabric', resourceId: fabric._id,
  });
  res.status(201).json({ success: true, fabric });
});

// POST /api/fabrics/upload — upload just an image, return the URL (used by the order form)
exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image provided');
  const uploaded = await cloud.uploadBuffer(req.file.buffer);
  if (!uploaded) throw ApiError.badRequest('Image upload unavailable — configure Cloudinary');
  res.status(201).json({ success: true, ...uploaded });
});

// GET /api/fabrics/:id
exports.getOne = asyncHandler(async (req, res) => {
  const fabric = await Fabric.findById(req.params.id)
    .populate('customer', 'fullName mobile')
    .populate('order', 'orderNumber');
  if (!fabric) throw ApiError.notFound('Fabric not found');
  res.json({ success: true, fabric });
});

// PUT /api/fabrics/:id
exports.update = asyncHandler(async (req, res) => {
  const fabric = await Fabric.findById(req.params.id);
  if (!fabric) throw ApiError.notFound('Fabric not found');

  Object.assign(fabric, req.body);
  ['meters', 'rate'].forEach((k) => { if (req.body[k] !== undefined) fabric[k] = Number(req.body[k]); });

  if (req.file) {
    if (fabric.imagePublicId) await cloud.destroy(fabric.imagePublicId);
    const uploaded = await cloud.uploadBuffer(req.file.buffer);
    if (uploaded) { fabric.imageUrl = uploaded.url; fabric.imagePublicId = uploaded.publicId; }
  }
  await fabric.save();
  res.json({ success: true, fabric });
});

// DELETE /api/fabrics/:id
exports.remove = asyncHandler(async (req, res) => {
  const fabric = await Fabric.findById(req.params.id);
  if (!fabric) throw ApiError.notFound('Fabric not found');
  if (fabric.imagePublicId) await cloud.destroy(fabric.imagePublicId);
  await fabric.deleteOne();
  await activity.log({
    req, action: 'fabric.delete', description: `Deleted fabric ${fabric.name}`,
    resource: 'Fabric', resourceId: fabric._id,
  });
  res.json({ success: true, message: 'Fabric deleted' });
});
