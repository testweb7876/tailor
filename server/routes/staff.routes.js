const express = require('express');
const authenticate = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const ctrl = require('../controllers/staff.controller');

const router = express.Router();
router.use(authenticate, requirePermission('orders')); // staff management lives under Orders permission

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/orders', ctrl.orders);

module.exports = router;