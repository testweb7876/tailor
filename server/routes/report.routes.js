const express = require('express');
const authenticate = require('../middleware/auth');
const ctrl = require('../controllers/report.controller');
const requirePermission = require('../middleware/requirePermission');
const router = express.Router();

router.use(authenticate, requirePermission('reports'));

router.get('/sales', ctrl.sales);
router.get('/revenue', ctrl.revenue);
router.get('/payments', ctrl.payments);
router.get('/pending', ctrl.pending);
router.get('/orders', ctrl.orders);
router.get('/customers', ctrl.customers);
router.get('/fabrics', ctrl.fabrics);
module.exports = router;
