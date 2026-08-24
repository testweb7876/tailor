const asyncHandler = require('../utils/asyncHandler');
const dayjs = require('dayjs');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const { round2 } = require('../utils/money');

// GET /api/dashboard
exports.summary = asyncHandler(async (req, res) => {
  const todayStart = dayjs().startOf('day').toDate();
  const todayEnd = dayjs().endOf('day').toDate();
  const in7 = dayjs().add(7, 'day').endOf('day').toDate();

  const [
    todayOrders, todayRevenueAgg, todayCollectionAgg,
    totalCustomers, pendingOrders, readyOrders, totalOrders,
    totalRevenueAgg, pendingPaymentAgg, upcoming,
  ] = await Promise.all([
    Order.countDocuments({ orderDate: { $gte: todayStart, $lte: todayEnd } }),
    Order.aggregate([{ $match: { orderDate: { $gte: todayStart, $lte: todayEnd }, status: { $ne: 'cancelled' } } }, { $group: { _id: null, t: { $sum: '$grandTotal' } } }]),
    Payment.aggregate([{ $match: { paymentDate: { $gte: todayStart, $lte: todayEnd }, status: 'paid' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Customer.countDocuments({ isArchived: false }),
    Order.countDocuments({ status: { $nin: ['delivered', 'cancelled'] } }),
    Order.countDocuments({ status: 'ready' }),
    Order.countDocuments({}),
    Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, t: { $sum: '$grandTotal' } } }]),
    Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, t: { $sum: '$pendingAmount' } } }]),
    Order.find({ status: { $nin: ['delivered', 'cancelled'] }, deliveryDate: { $gte: todayStart, $lte: in7 } })
      .sort('deliveryDate').limit(10).populate('customer', 'fullName mobile').lean(),
  ]);

  res.json({
    success: true,
    cards: {
      todayOrders,
      todayRevenue: round2(todayRevenueAgg[0]?.t || 0),
      todayCollection: round2(todayCollectionAgg[0]?.t || 0),
      totalCustomers,
      pendingOrders,
      readyForDelivery: readyOrders,
      upcomingDeliveries: upcoming.length,
      totalPendingPayment: round2(pendingPaymentAgg[0]?.t || 0),
      totalRevenue: round2(totalRevenueAgg[0]?.t || 0),
      totalOrders,
    },
    upcomingDeliveries: upcoming.map((o) => ({
      customer: o.customer?.fullName, phone: o.customer?.mobile, orderNumber: o.orderNumber,
      deliveryDate: o.deliveryDate, status: o.status, pendingAmount: o.pendingAmount,
    })),
  });
});

// GET /api/dashboard/charts
exports.charts = asyncHandler(async (req, res) => {
  const start = dayjs().subtract(11, 'month').startOf('month').toDate();

  const [revenueByMonth, ordersByMonth, methodBreakdown, statusBreakdown] = await Promise.all([
    Order.aggregate([
      { $match: { orderDate: { $gte: start }, status: { $ne: 'cancelled' } } },
      { $group: { _id: { y: { $year: '$orderDate' }, m: { $month: '$orderDate' } }, total: { $sum: '$grandTotal' } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]),
    Order.aggregate([
      { $match: { orderDate: { $gte: start } } },
      { $group: { _id: { y: { $year: '$orderDate' }, m: { $month: '$orderDate' } }, count: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: '$method', total: { $sum: '$amount' } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const label = (o) => dayjs(`${o._id.y}-${o._id.m}-01`).format('MMM YY');
  res.json({
    success: true,
    revenueByMonth: revenueByMonth.map((o) => ({ month: label(o), total: round2(o.total) })),
    ordersByMonth: ordersByMonth.map((o) => ({ month: label(o), count: o.count })),
    paymentMethods: methodBreakdown.map((o) => ({ method: o._id, total: round2(o.total) })),
    orderStatus: statusBreakdown.map((o) => ({ status: o._id, count: o.count })),
  });
});

// GET /api/dashboard/recent
exports.recent = asyncHandler(async (req, res) => {
  const [recentOrders, recentPayments, pendingPayments] = await Promise.all([
    Order.find().sort('-createdAt').limit(8).populate('customer', 'fullName mobile').lean(),
    Payment.find({ status: 'paid' }).sort('-paymentDate').limit(8)
      .populate('customer', 'fullName').populate('order', 'orderNumber').lean(),
    Order.find({ pendingAmount: { $gt: 0 }, status: { $ne: 'cancelled' } })
      .sort('-pendingAmount').limit(8).populate('customer', 'fullName mobile').lean(),
  ]);
  res.json({ success: true, recentOrders, recentPayments, pendingPayments });
});
