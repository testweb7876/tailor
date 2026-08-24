const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/activity.controller');
const router = express.Router();
router.use(authenticate, authorize('SUPER_ADMIN'));
router.get('/', ctrl.list);
module.exports = router;
