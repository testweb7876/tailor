/* WhatsApp: click-to-chat links + an optional Meta Cloud API sender.
   If WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are set, sendViaCloudApi() posts a real message
   via the Graph API; otherwise callers use the click-to-chat link. Same interface either way. */
const https = require('https');
const logger = require('../utils/logger');

function normalizePhone(phone, defaultCountry = '91') {
  let p = String(phone || '').replace(/[^0-9]/g, '');
  if (p.length === 10) p = defaultCountry + p; // assume India if 10 digits
  return p;
}

function clickToChatLink(phone, message) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

function invoiceMessage({ shopName, customerName, invoiceNumber, grandTotal, paid, pending, deliveryDate, invoiceLink }) {
  return [
    `Hello ${customerName},`, '',
    `Thank you for choosing ${shopName}.`, '',
    `Invoice: ${invoiceNumber}`,
    `Total: Rs. ${Number(grandTotal).toLocaleString('en-IN')}`,
    `Paid: Rs. ${Number(paid).toLocaleString('en-IN')}`,
    `Pending: Rs. ${Number(pending).toLocaleString('en-IN')}`,
    deliveryDate ? `Delivery Date: ${new Date(deliveryDate).toLocaleDateString('en-IN')}` : '',
    invoiceLink ? `\nInvoice: ${invoiceLink}` : '',
    '', 'Thank you.',
  ].filter((l) => l !== undefined).join('\n');
}

function reminderMessage({ shopName, customerName, invoiceNumber, pending }) {
  return [
    `Hello ${customerName},`, '',
    `This is a friendly reminder from ${shopName}.`, '',
    invoiceNumber ? `Invoice: ${invoiceNumber}` : '',
    `Outstanding Balance: Rs. ${Number(pending).toLocaleString('en-IN')}`, '',
    `Please contact us regarding payment.`, '', `Thank you.`,
  ].filter(Boolean).join('\n');
}

const isCloudConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

/* Send a text message via the Meta WhatsApp Cloud API. Resolves { skipped } when unconfigured. */
function sendViaCloudApi(phone, message) {
  if (!isCloudConfigured()) return Promise.resolve({ skipped: true, reason: 'Cloud API not configured (use click-to-chat)' });
  const payload = JSON.stringify({
    messaging_product: 'whatsapp',
    to: normalizePhone(phone),
    type: 'text',
    text: { body: message },
  });
  const options = {
    method: 'POST',
    hostname: 'graph.facebook.com',
    path: `/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve({ skipped: false, response: safeJson(body) });
        else { logger.error(`WhatsApp Cloud API ${res.statusCode}: ${body}`); resolve({ skipped: false, error: safeJson(body) }); }
      });
    });
    req.on('error', (e) => { logger.error(`WhatsApp Cloud API error: ${e.message}`); resolve({ skipped: false, error: e.message }); });
    req.write(payload); req.end();
  });
}
function safeJson(s) { try { return JSON.parse(s); } catch { return s; } }

function deliveryUpcomingMessage({ shopName, customerName, orderNumber, deliveryDate }) {
  return [
    `Hello ${customerName},`, '',
    `Your order ${orderNumber} from ${shopName} is expected to be ready by ${new Date(deliveryDate).toLocaleDateString('en-IN')}.`,
    '', `We will inform you once it is ready for pickup. Thank you!`,
  ].join('\n');
}

module.exports = { clickToChatLink, invoiceMessage, reminderMessage, normalizePhone, sendViaCloudApi, isCloudConfigured, deliveryUpcomingMessage };
