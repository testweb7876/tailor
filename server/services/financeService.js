const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const { round2 } = require('../utils/money');

/* Single source of truth for money rollups. Called after any payment/order change.
   paidAmount for an order = sum(paid) - sum(refunded). Never trusts client numbers. */
async function recomputeOrderPayments(orderId) {
  const oid = new mongoose.Types.ObjectId(orderId);
  const agg = await Payment.aggregate([
    { $match: { order: oid } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' },
      },
    },
  ]);
  const paid = agg.find((a) => a._id === 'paid')?.total || 0;
  const refunded = agg.find((a) => a._id === 'refunded')?.total || 0;

  const order = await Order.findById(orderId);
  if (!order) return null;
  order.paidAmount = round2(Math.max(paid - refunded, 0));
  order.recalculateTotals();
  await order.save();
  return order;
}

/* Recompute the denormalised rollups shown on the customer profile / dashboard. */
async function recomputeCustomerRollups(customerId) {
  const cid = new mongoose.Types.ObjectId(customerId);

  const [orderAgg] = await Order.aggregate([
    { $match: { customer: cid, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalPurchase: { $sum: '$grandTotal' },
        totalPaid: { $sum: '$paidAmount' },
        outstanding: { $sum: '$pendingAmount' },
        lastOrderDate: { $max: '$orderDate' },
      },
    },
  ]);

  const update = {
    totalOrders: orderAgg?.totalOrders || 0,
    totalPurchase: round2(orderAgg?.totalPurchase || 0),
    totalPaid: round2(orderAgg?.totalPaid || 0),
    outstandingBalance: round2(orderAgg?.outstanding || 0),
    lastOrderDate: orderAgg?.lastOrderDate || null,
  };
  await Customer.findByIdAndUpdate(customerId, update);
  return update;
}

module.exports = { recomputeOrderPayments, recomputeCustomerRollups };
