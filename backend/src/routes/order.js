const express = require('express');
const router = express.Router();
const {
  getActiveQueue,
  getOrder,
  createOrder,
  updateOrderStatus,
  getOrderHistory,
  verifyPickupPin
} = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/queue', authenticate, getActiveQueue);
router.get('/history', authenticate, getOrderHistory);
router.get('/:id', authenticate, getOrder);
router.post('/', authenticate, createOrder);
router.patch('/:id/status', authenticate, authorize('worker', 'admin'), updateOrderStatus);
router.post(
  '/:id/verify-pin',
  authenticate,
  authorize('worker', 'admin'),
  verifyPickupPin
);

module.exports = router;
