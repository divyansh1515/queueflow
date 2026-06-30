// payment.js
const express = require('express');
const paymentRouter = express.Router();
const { createPaymentOrder, verifyPayment, processRefund } = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

paymentRouter.post('/create-order', authenticate, createPaymentOrder);
paymentRouter.post('/verify', authenticate, verifyPayment);
paymentRouter.post('/refund', authenticate, authorize('admin'), processRefund);

module.exports = paymentRouter;
