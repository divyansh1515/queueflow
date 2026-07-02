const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

let razorpay = null;

if (
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET &&
  process.env.RAZORPAY_KEY_ID !== "test"
) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}
// ─── POST /api/payment/create-order ───────────────────────────────────────
// Called before placing order — creates a Razorpay order to show payment UI
const createPaymentOrder = async (req, res, next) => {
  try {
    const { items } = req.body;
    const MenuItem = require('../models/MenuItem');

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Server-side total calculation
    let totalAmount = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ success: false, message: `Item unavailable: ${item.name}` });
      }
      totalAmount += menuItem.price * item.quantity;
    }

    const amountInPaise = Math.round(totalAmount * 100); // Razorpay uses paise

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        customerId: req.user.id,
        customerName: req.user.name
      }
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmount,
        amountInPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        prefill: {
          name: req.user.name,
          email: req.user.email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/payment/verify ──────────────────────────────────────────────
// Verify Razorpay signature after payment
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // HMAC verification
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    res.json({
      success: true,
      message: 'Payment verified',
      data: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/payment/refund ──────────────────────────────────────────────
const processRefund = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.payment.status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Order is not in paid state' });
    }

    const refund = await razorpay.payments.refund(order.payment.razorpayPaymentId, {
      amount: Math.round(order.totalAmount * 100)
    });

    order.payment.status = 'refunded';
    order.status = 'cancelled';
    order.statusTimestamps.cancelled = new Date();
    await order.save();

    res.json({ success: true, data: refund, message: 'Refund initiated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPaymentOrder, verifyPayment, processRefund };
