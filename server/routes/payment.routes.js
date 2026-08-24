const express = require('express');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/payment.validators');
const ctrl = require('../controllers/payment.controller');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();
router.use(authenticate, requirePermission('payments'));

router.get('/', validate(v.listQuery), ctrl.list);
router.get('/:id', validate({ params: v.idParam }), ctrl.getOne);
router.post('/:id/refund', validate(v.refund), ctrl.refund);

module.exports = router;
