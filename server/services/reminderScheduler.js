const cron = require('node-cron');
const dayjs = require('dayjs');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const whatsapp = require('./whatsappService');
const logger = require('../utils/logger');

async function sendDeliveryReminders() {
  if (!whatsapp.isCloudConfigured()) {
    logger.warn('WhatsApp Cloud API not configured — skipping automatic delivery reminders');
    return;
  }
  const settings = await Settings.getSingleton();
  const start = dayjs().add(1, 'day').startOf('day').toDate();
  const end = dayjs().add(1, 'day').endOf('day').toDate();

  const orders = await Order.find({
    deliveryDate: { $gte: start, $lte: end },
    status: { $nin: ['delivered', 'cancelled'] },
    deliveryReminderSent: { $ne: true },
  }).populate('customer', 'fullName mobile');

  for (const order of orders) {
    if (!order.customer?.mobile) continue;
    const message = whatsapp.deliveryUpcomingMessage({
      shopName: settings.shop.name,
      customerName: order.customer.fullName,
      orderNumber: order.orderNumber,
      deliveryDate: order.deliveryDate,
    });
    const result = await whatsapp.sendViaCloudApi(order.customer.mobile, message);
    if (!result.error) {
      order.deliveryReminderSent = true;
      await order.save();
    }
  }
  if (orders.length) logger.info(`Delivery reminders processed for ${orders.length} order(s)`);
}

function start() {
  cron.schedule('0 9 * * *', () => { 
    sendDeliveryReminders().catch((e) => logger.error(`Delivery reminder job failed: ${e.message}`));
  });
  logger.info('Delivery reminder scheduler started (daily 9:00 AM)');
}

module.exports = { start, sendDeliveryReminders };