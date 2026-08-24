const asyncHandler = require('../utils/asyncHandler');
const Settings = require('../models/Settings');
const activity = require('../services/activityService');
const cloud = require('../services/cloudinaryService');
const email = require('../services/emailService');
const whatsapp = require('../services/whatsappService');

// GET /api/settings — ADMIN gets public subset; SUPER_ADMIN gets full config + integration status
exports.get = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.json({ success: true, settings: settings.toPublic() });
  }
  res.json({
    success: true,
    settings,
    integrations: {
      cloudinary: cloud.isConfigured(),
      email: email.isConfigured(),
      whatsappCloud: whatsapp.isCloudConfigured(),
    },
  });
});

// PUT /api/settings — SUPER_ADMIN only. Merges provided sections; never stores secrets.
exports.update = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const { shop, invoice, order, payment } = req.body;
  if (shop) settings.shop = { ...settings.shop.toObject(), ...shop };
  if (invoice) settings.invoice = { ...settings.invoice.toObject(), ...invoice };
  if (order) settings.order = { ...settings.order.toObject(), ...order };
  if (payment) settings.payment = { ...settings.payment.toObject(), ...payment };
  await settings.save();
  await activity.log({
    req, action: 'settings.update', description: 'Updated application settings', resource: 'Settings',
  });
  res.json({ success: true, settings });
});

// POST /api/settings/logo — upload shop logo
exports.uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image provided' });
  const uploaded = await cloud.uploadBuffer(req.file.buffer, 'tailor-erp/shop');
  if (!uploaded) return res.status(400).json({ success: false, message: 'Configure Cloudinary to upload a logo' });
  const settings = await Settings.getSingleton();
  settings.shop.logoUrl = uploaded.url;
  await settings.save();
  res.json({ success: true, logoUrl: uploaded.url });
});
