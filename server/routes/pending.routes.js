const express = require('express');
const authenticate = require('../middleware/auth');
const ctrl = require('../controllers/pending.controller');
const router = express.Router();
router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:customerId/reminder', ctrl.reminder);
module.exports = router;
