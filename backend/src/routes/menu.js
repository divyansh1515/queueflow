const express = require('express');
const router = express.Router();
const { getAllItems, createItem, updateItem, deleteItem, toggleAvailability } = require('../controllers/menuController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', getAllItems); // public
router.post('/', authenticate, authorize('admin'), createItem);
router.put('/:id', authenticate, authorize('admin'), updateItem);
router.delete('/:id', authenticate, authorize('admin'), deleteItem);
router.patch('/:id/toggle', authenticate, authorize('admin'), toggleAvailability);

module.exports = router;
