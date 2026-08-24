const asyncHandler = require('../utils/asyncHandler');
const Measurement = require('../models/Measurement');
const ApiError = require('../utils/ApiError');
const activity = require('../services/activityService');

// GET /api/measurements/garments — supported garment types for the UI
exports.garments = asyncHandler(async (req, res) => {
  res.json({ success: true, data: Measurement.GARMENTS });
});

exports.create = asyncHandler(async (req, res) => {
  const { customer, garmentType } = req.body;

  const prev = await Measurement.findOne({ customer, garmentType, isActive: true }).sort('-version');
  const version = prev ? prev.version + 1 : 1;
  if (prev) { prev.isActive = false; await prev.save(); }

  const measurement = await Measurement.create({
    ...req.body,
    version,
    isActive: true,
    createdBy: req.user._id,
  });

  await activity.log({
    req, action: 'measurement.create',
    description: `Added ${garmentType} measurement (v${version})`,
    resource: 'Measurement', resourceId: measurement._id, meta: { customer },
  });
  res.status(201).json({ success: true, measurement });
});

exports.update = asyncHandler(async (req, res) => {
  const source = await Measurement.findById(req.params.id);
  if (!source) throw ApiError.notFound('Measurement not found');

  await Measurement.updateMany(
    { customer: source.customer, garmentType: source.garmentType, isActive: true },
    { isActive: false }
  );

  const merged = new Map(source.values);
  if (req.body.values) Object.entries(req.body.values).forEach(([k, val]) => merged.set(k, String(val)));

  const next = await Measurement.create({
    customer: source.customer,
    garmentType: source.garmentType,
    values: merged,
    fittingType: req.body.fittingType ?? source.fittingType,
    unit: req.body.unit ?? source.unit,
    notes: req.body.notes ?? source.notes,
    version: source.version + 1,
    isActive: true,
    createdBy: req.user._id,
  });

  await activity.log({
    req, action: 'measurement.update',
    description: `Updated ${source.garmentType} measurement -> v${next.version}`,
    resource: 'Measurement', resourceId: next._id, meta: { customer: source.customer },
  });
  res.json({ success: true, measurement: next });
});

// POST /api/measurements/:id/duplicate — copy an old measurement as a new active version
exports.duplicate = asyncHandler(async (req, res) => {
  const source = await Measurement.findById(req.params.id);
  if (!source) throw ApiError.notFound('Measurement not found');

  await Measurement.updateMany(
    { customer: source.customer, garmentType: source.garmentType, isActive: true },
    { isActive: false }
  );
  const latest = await Measurement.findOne({ customer: source.customer, garmentType: source.garmentType }).sort('-version');

  const copy = await Measurement.create({
    customer: source.customer,
    garmentType: source.garmentType,
    values: source.values,
    fittingType: source.fittingType,
    unit: source.unit,
    notes: source.notes,
    version: (latest?.version || 0) + 1,
    isActive: true,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, measurement: copy });
});

// GET /api/measurements/:id
exports.getOne = asyncHandler(async (req, res) => {
  const measurement = await Measurement.findById(req.params.id).lean();
  if (!measurement) throw ApiError.notFound('Measurement not found');
  res.json({ success: true, measurement });
});

// GET /api/measurements/history?customer=&garmentType=
exports.history = asyncHandler(async (req, res) => {
  const { customer, garmentType } = req.query;
  if (!customer) throw ApiError.badRequest('customer is required');
  const filter = { customer };
  if (garmentType) filter.garmentType = garmentType;
  const data = await Measurement.find(filter).sort({ garmentType: 1, version: -1 }).lean();
  res.json({ success: true, data });
});
