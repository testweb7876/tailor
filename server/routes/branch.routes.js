const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/branch.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', authorize('SUPER_ADMIN'), ctrl.create);
router.put('/:id', authorize('SUPER_ADMIN'), ctrl.update);
router.delete('/:id', authorize('SUPER_ADMIN'), ctrl.remove);

module.exports = router;