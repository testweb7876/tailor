const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const Payment = require('../models/Payment');
const { round2 } = require('../utils/money');

/* Build an immutable invoice snapshot from an order + current shop settings. */
async function generateForOrder(orderId, userId) {
  const order = await Order.findById(orderId).populate('customer');
  if (!order) throw new Error('Order not found');
  if (!order.orderNumber) throw new Error('Order is missing its order number — cannot generate invoice');
  const settings = await Settings.getSingleton();

  const existing = await Invoice.findOne({ order: order._id });
  if (existing) return existing;

  const c = order.customer;
  const itemsSnapshot = order.items.map((it) => ({
    garmentType: it.garmentType,
    quantity: it.quantity,
    stitchingPrice: it.stitchingPrice,
    fabricName: it.fabric?.name || '',
    fabricCode: it.fabric?.code || '',
    fabricColor: it.fabric?.color || '',
    fabricMeters: it.fabric?.meters || 0,
    fabricTotal: it.fabric?.total || 0,
    manualBillNo: order.manualBillNo || '',
    notes: it.notes || '',
  }));

  const invoice = await Invoice.create({
    order: order._id,
    orderNumber: order.orderNumber,
    customer: c._id,
    invoiceDate: new Date(),
    deliveryDate: order.deliveryDate,
    shopSnapshot: {
      name: settings.shop.name, logoUrl: settings.shop.logoUrl, address: settings.shop.address,
      phone: settings.shop.phone, email: settings.shop.email, gstNumber: settings.shop.gstNumber,
      currency: settings.shop.currency,
    },
    customerSnapshot: { fullName: c.fullName, mobile: c.mobile, email: c.email, address: c.address },
    itemsSnapshot,
    totals: {
      fabricTotal: order.fabricTotal, stitchingTotal: order.stitchingTotal,
      subtotal: order.subtotal, discount: order.discount, taxPercent: order.taxPercent,
      tax: order.tax, grandTotal: order.grandTotal, paid: order.paidAmount,
      balance: round2(order.grandTotal - order.paidAmount),
    },
    terms: settings.invoice.terms,
    footer: settings.invoice.footer,
    createdBy: userId,
  });
  return invoice;
}

/* Refresh the paid/balance figures on an invoice snapshot from live order state
   (used right before generating a PDF / sending, so figures are current). */
async function withLiveBalances(invoice) {
  const [paidAgg] = await Payment.aggregate([
    { $match: { order: invoice.order } },
    { $group: { _id: '$status', total: { $sum: '$amount' } } },
  ]).then((rows) => [{
    paid: (rows.find((r) => r._id === 'paid')?.total || 0) - (rows.find((r) => r._id === 'refunded')?.total || 0),
  }]);
  const paid = round2(Math.max(paidAgg.paid, 0));
  const obj = invoice.toObject();
  obj.totals = { ...obj.totals, paid, balance: round2(obj.totals.grandTotal - paid) };
  return obj;
}

module.exports = { generateForOrder, withLiveBalances };
