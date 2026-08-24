const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

router.use('/auth', require('./auth.routes'));
router.use('/admins', require('./admin.routes'));
router.use('/customers', require('./customer.routes'));
router.use('/measurements', require('./measurement.routes'));
router.use('/fabrics', require('./fabric.routes'));
router.use('/orders', require('./order.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/invoices', require('./invoice.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/pending-payments', require('./pending.routes'));
router.use('/reports', require('./report.routes'));
router.use('/search', require('./search.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/activity', require('./activity.routes'));
router.use('/broadcast', require('./broadcast.routes'));
router.use('/staff', require('./staff.routes'));
router.use('/branches', require('./branch.routes'));

module.exports = router;
