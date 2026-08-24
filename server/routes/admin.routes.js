const express = require('express');

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const v = require('../validators/admin.validators');
const ctrl = require('../controllers/admin.controller');

const router = express.Router();

// Everything here is Super Admin only.
router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/', validate(v.listQuery), ctrl.list);
router.post('/', validate(v.create), ctrl.create);
router.get('/:id', validate({ params: v.idParam }), ctrl.getOne);
router.put('/:id', validate(v.update), ctrl.update);
router.delete('/:id', validate({ params: v.idParam }), ctrl.remove);
router.post('/:id/reset-password', validate(v.resetPassword), ctrl.resetPassword);
router.get('/:id/activity', validate({ params: v.idParam }), ctrl.activity);

module.exports = router;
