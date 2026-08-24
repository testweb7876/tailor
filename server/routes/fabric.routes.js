const express = require('express');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/fabric.controller');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();
router.use(authenticate, requirePermission('fabrics'));

router.get('/', ctrl.list);
router.post('/', upload.single('image'), ctrl.create);
router.post('/upload', upload.single('image'), ctrl.uploadImage);
router.get('/:id', ctrl.getOne);
router.put('/:id', upload.single('image'), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
