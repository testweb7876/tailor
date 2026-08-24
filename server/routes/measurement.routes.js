const express = require('express');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/measurement.validators');
const ctrl = require('../controllers/measurement.controller');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();
router.use(authenticate, requirePermission('measurements'));

router.get('/garments', ctrl.garments);
router.get('/history', ctrl.history);
router.post('/', validate(v.create), ctrl.create);
router.get('/:id', validate({ params: v.idParam }), ctrl.getOne);
router.put('/:id', validate(v.update), ctrl.update);
router.post('/:id/duplicate', validate({ params: v.idParam }), ctrl.duplicate);

module.exports = router;
