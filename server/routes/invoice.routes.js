const express = require('express');
const authenticate = require('../middleware/auth');
const ctrl = require('../controllers/invoice.controller');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();
router.use(authenticate, requirePermission('invoices'));

router.get('/', ctrl.list);
router.post('/:orderId/generate', ctrl.generate);
router.get('/:id', ctrl.getOne);
router.get('/:id/pdf', ctrl.pdf);
router.post('/:id/email', ctrl.email);
router.get('/:id/whatsapp', ctrl.whatsappLink);

module.exports = router;
