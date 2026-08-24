const asyncHandler = require('../utils/asyncHandler');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');
const activity = require('../services/activityService');
const invoiceService = require('../services/invoiceService');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
const whatsapp = require('../services/whatsappService');
const env = require('../config/env');

const publicInvoiceLink = (id) => `${env.clientUrl}/invoices/${id}`;

// POST /api/invoices/:orderId/generate
exports.generate = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.generateForOrder(req.params.orderId, req.user._id);
  await activity.log({
    req, action: 'invoice.generate',
    description: `Generated invoice ${invoice.invoiceNumber}`,
    resource: 'Invoice', resourceId: invoice._id,
  });
  res.status(201).json({ success: true, invoice });
});

// GET /api/invoices
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const filter = {};
  if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };
  const result = await paginate(Invoice, filter, {
    page, limit, sort: '-invoiceDate',
    populate: { path: 'customer', select: 'fullName mobile' },
  });
  res.json({ success: true, ...result });
});

// GET /api/invoices/:id
exports.getOne = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('customer', 'fullName mobile email');
  if (!invoice) throw ApiError.notFound('Invoice not found');
  res.json({ success: true, invoice: await invoiceService.withLiveBalances(invoice) });
});

// GET /api/invoices/:id/pdf  → streams a PDF
exports.pdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  const live = await invoiceService.withLiveBalances(invoice);
  const buffer = await pdfService.generateInvoicePDF(live);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(buffer);
});

// POST /api/invoices/:id/email
exports.email = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('customer', 'fullName mobile email');
  if (!invoice) throw ApiError.notFound('Invoice not found');
  const to = req.body.to || invoice.customer?.email || invoice.customerSnapshot?.email;
  if (!to) throw ApiError.badRequest('No email address available for this customer');

  const live = await invoiceService.withLiveBalances(invoice);
  const pdfBuffer = await pdfService.generateInvoicePDF(live);
  const html = emailService.buildInvoiceHtml({
    shopName: invoice.shopSnapshot?.name,
    customerName: invoice.customerSnapshot?.fullName,
    invoiceNumber: invoice.invoiceNumber,
    orderNumber: invoice.orderNumber,
    grandTotal: live.totals.grandTotal, paid: live.totals.paid, balance: live.totals.balance,
    deliveryDate: invoice.deliveryDate, invoiceLink: publicInvoiceLink(invoice._id),
  });

  const result = await emailService.sendInvoiceEmail({
    to, subject: `Invoice ${invoice.invoiceNumber} — ${invoice.shopSnapshot?.name || ''}`,
    html, pdfBuffer, invoiceNumber: invoice.invoiceNumber,
  });

  if (!result.skipped) {
    invoice.emailSent = true; invoice.emailSentAt = new Date(); await invoice.save();
    await activity.log({
      req, action: 'invoice.email', description: `Emailed invoice ${invoice.invoiceNumber} to ${to}`,
      resource: 'Invoice', resourceId: invoice._id,
    });
  }
  res.json({ success: true, emailed: !result.skipped, detail: result.reason || 'sent', to });
});

// GET /api/invoices/:id/whatsapp → returns a click-to-chat link + message (and sends via Cloud API if configured)
exports.whatsappLink = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('customer', 'fullName mobile');
  if (!invoice) throw ApiError.notFound('Invoice not found');
  const live = await invoiceService.withLiveBalances(invoice);
  const phone = invoice.customer?.mobile || invoice.customerSnapshot?.mobile;
  const message = whatsapp.invoiceMessage({
    shopName: invoice.shopSnapshot?.name, customerName: invoice.customerSnapshot?.fullName,
    invoiceNumber: invoice.invoiceNumber, grandTotal: live.totals.grandTotal,
    paid: live.totals.paid, pending: live.totals.balance, deliveryDate: invoice.deliveryDate,
    invoiceLink: publicInvoiceLink(invoice._id),
  });
  const cloud = await whatsapp.sendViaCloudApi(phone, message);
  res.json({ success: true, link: whatsapp.clickToChatLink(phone, message), message, sent: !cloud.skipped && !cloud.error });
});
