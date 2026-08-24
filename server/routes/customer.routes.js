const express = require('express');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/customer.validators');
const ctrl = require('../controllers/customer.controller');
const requirePermission = require('../middleware/requirePermission');
const branchScope = require('../middleware/branchScope');

const router = express.Router();
router.use(authenticate, requirePermission('customers'));

router.get('/search', ctrl.search);
router.get('/', validate(v.listQuery), ctrl.list);
router.post('/', validate(v.create), ctrl.create);
router.get('/:id', validate({ params: v.idParam }), ctrl.getOne);
router.put('/:id', validate(v.update), ctrl.update);
router.delete('/:id', validate({ params: v.idParam }), ctrl.remove);

router.get('/:id/orders', validate({ params: v.idParam }), ctrl.orders);
router.get('/:id/payments', validate({ params: v.idParam }), ctrl.payments);
router.get('/:id/invoices', validate({ params: v.idParam }), ctrl.invoices);
router.get('/:id/measurements', validate({ params: v.idParam }), ctrl.measurements);
router.get('/:id/fabrics', validate({ params: v.idParam }), ctrl.fabrics);
router.use(authenticate, requirePermission('customers'), branchScope);


module.exports = router;
