const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');
const whatsapp = require('../services/whatsappService');
const activity = require('../services/activityService');
const ApiError = require('../utils/ApiError');

exports.send = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) throw ApiError.badRequest('Message is required');

  const customers = await Customer.find({ isArchived: false, mobile: { $exists: true, $ne: '' } })
    .select('fullName mobile').lean();

  const cloudReady = whatsapp.isCloudConfigured();

  if (!cloudReady) {
    const links = customers.map((c) => ({ customer: c.fullName, link: whatsapp.clickToChatLink(c.mobile, message) }));
    return res.json({ success: true, sent: false, mode: 'manual', total: customers.length, links });
  }

  let delivered = 0;
  let failed = 0;
  for (const c of customers) {
    const result = await whatsapp.sendViaCloudApi(c.mobile, message);
    if (result.error) failed += 1; else delivered += 1;
    await new Promise((r) => setTimeout(r, 250)); 
  }

  await activity.log({
    req, action: 'broadcast.send',
    description: `Sent broadcast message to ${delivered}/${customers.length} customers`,
    resource: 'Customer',
  });

  res.json({ success: true, sent: true, mode: 'cloud', total: customers.length, delivered, failed });
});