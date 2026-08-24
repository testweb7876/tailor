const express = require('express');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/order.validators');
const ctrl = require('../controllers/order.controller');
const payCtrl = require('../controllers/payment.controller');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();
router.use(authenticate, requirePermission('orders'));

router.get('/', validate(v.listQuery), ctrl.list);
router.post('/', validate(v.create), ctrl.create);
router.get('/:id', validate({ params: v.idParam }), ctrl.getOne);
router.put('/:id', validate(v.update), ctrl.update);
router.patch('/:id/status', validate(v.status), ctrl.changeStatus);
router.post('/:id/payments', payCtrl.receiveForOrder);
router.get('/:id/slip', validate({ params: v.idParam }), ctrl.slip);

module.exports = router;
