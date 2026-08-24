const express = require('express');
const rateLimit = require('express-rate-limit');

const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const authValidators = require('../validators/auth.validators');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

router.post('/login', loginLimiter, validate(authValidators.login), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.post('/change-password', authenticate, validate(authValidators.changePassword), ctrl.changePassword);

module.exports = router;
