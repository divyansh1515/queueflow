const Order = require('../models/Order');
const { emitOrderStatusUpdate, emitQueueUpdate } = require('../socket/socketManager');
const notificationService = require('../services/notificationService');

// ─── POST /api/iot/button-press ────────────────────────────────────────────
// Called by ESP32 when physical button is pressed
// Marks the oldest "preparing" order as "ready"
const handleButtonPress = async (req, res, next) => {
  try {
    const { workerId } = req.body; // optional: which worker station pressed

    // Find oldest order in "preparing" state
    const order = await Order.findOne({ status: 'preparing' })
      .sort({ statusTimestamps_preparing: 1, createdAt: 1 })
      .populate('customer', 'fcmToken name');

    if (!order) {
      // Try "pending" if no preparing orders
      const pendingOrder = await Order.findOne({ status: 'pending' })
        .sort({ createdAt: 1 })
        .populate('customer', 'fcmToken name');

      if (!pendingOrder) {
        return res.status(404).json({
          success: false,
          message: 'No active orders to update'
        });
      }

      pendingOrder.status = 'preparing';
      pendingOrder.statusTimestamps.preparing = new Date();
      await pendingOrder.save();
      emitOrderStatusUpdate(pendingOrder);

      return res.json({
        success: true,
        message: 'Order moved to preparing',
        data: { orderId: pendingOrder._id, tokenNumber: pendingOrder.tokenNumber, status: 'preparing' }
      });
    }

    // Mark as ready
    order.status = 'ready';
    order.statusTimestamps.ready = new Date();
    await order.save();

    emitOrderStatusUpdate(order);

    // Push notification to customer
    if (order.customer?.fcmToken) {
      notificationService.sendOrderReadyNotification(
        order.customer.fcmToken,
        order.tokenNumber
      ).catch(() => {});
    }

    // Rebuild queue
    const activeOrders = await Order.find({ status: { $in: ['pending', 'preparing'] } })
      .sort({ createdAt: 1 }).select('tokenNumber status estimatedWaitTime');
    emitQueueUpdate({ queueLength: activeOrders.length, orders: activeOrders, updatedAt: new Date() });

    res.json({
      success: true,
      message: `Token #${order.tokenNumber} marked as ready`,
      data: { orderId: order._id, tokenNumber: order.tokenNumber, status: 'ready' }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/iot/current-order ────────────────────────────────────────────
// ESP32 polls this to get current active order info (e.g. for a display)
const getCurrentOrder = async (req, res, next) => {
  try {
    const preparingOrder = await Order.findOne({ status: 'preparing' })
      .sort({ createdAt: 1 })
      .select('tokenNumber status items totalAmount estimatedWaitTime');

    const pendingCount = await Order.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      data: {
        currentOrder: preparingOrder || null,
        pendingCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/iot/status ───────────────────────────────────────────────────
// Heartbeat / status for ESP32 to confirm connection
const getStatus = async (req, res) => {
  res.json({
    success: true,
    status: 'connected',
    serverTime: new Date().toISOString()
  });
};

module.exports = { handleButtonPress, getCurrentOrder, getStatus };
