const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/broadcast.controller');
const requirePermission = require('../middleware/requirePermission');
const router = express.Router();
router.use(authenticate, requirePermission('broadcast'));
router.post('/', ctrl.send);
module.exports = router;