const express = require('express');
const authenticate = require('../middleware/auth');
const ctrl = require('../controllers/dashboard.controller');
const requirePermission = require('../middleware/requirePermission');
const router = express.Router();

router.use(authenticate, requirePermission('dashboard'));

router.get('/', ctrl.summary);
router.get('/charts', ctrl.charts);
router.get('/recent', ctrl.recent);
module.exports = router;
