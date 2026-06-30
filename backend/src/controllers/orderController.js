const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { emitOrderStatusUpdate, emitNewOrder, emitQueueUpdate } = require('../socket/socketManager');
const notificationService = require('../services/notificationService');
const aiService = require('../services/aiService');
const analyticsService = require('../services/analyticsService');

// ─── GET /api/orders/queue ─────────────────────────────────────────────────
const getActiveQueue = async (req, res, next) => {
  try {
    const activeOrders = await Order.find({
      status: { $in: ['pending', 'preparing','ready'] }
    })
      .populate('customer', 'name phone')
      .populate('items.menuItem', 'name image')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: activeOrders, count: activeOrders.length });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/orders/:id ───────────────────────────────────────────────────
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('items.menuItem', 'name image category');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Customers can only view their own orders
if (
  req.user.role === 'customer' &&
  order.customer.user.toString() !== req.user.id
) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Compute live queue position
    const aheadCount = await Order.countDocuments({
      status: { $in: ['pending', 'preparing'] },
      createdAt: { $lt: order.createdAt }
    });
    order.queuePosition = aheadCount + 1;
    console.log("========== ORDER ==========");
console.log(order);
console.log("Pickup PIN:", order.pickupPin);
console.log("===========================");

res.json({
  success: true,
  data: order
});
  
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/orders ──────────────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { items, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }

    // Validate & enrich items from DB (never trust client prices)
    const enrichedItems = [];
    let totalAmount = 0;
    let maxPrepTime = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Item "${item.name || item.menuItemId}" is not available`
        });
      }
      const lineTotal = menuItem.price * item.quantity;
      totalAmount += lineTotal;
      if (menuItem.preparationTime > maxPrepTime) maxPrepTime = menuItem.preparationTime;
      enrichedItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        preparationTime: menuItem.preparationTime
      });
    }

    const tokenNumber = await Order.getNextToken();
    const pickupPin = Math.floor(1000 + Math.random() * 9000).toString();
    // Get AI wait time prediction
    const queueLength = await Order.countDocuments({ status: { $in: ['pending', 'preparing'] } });
    let estimatedWaitTime = maxPrepTime + (queueLength * 3); // fallback
    try {
      estimatedWaitTime = await aiService.predictWaitTime({ queueLength, items: enrichedItems });
    } catch { /* use fallback */ }

 const order = new Order({
  tokenNumber,pickupPin,

  customer: {
    user: req.user._id,
    name: req.user.name,
    phone: req.user.phone || ''
},
  

  items: enrichedItems,

  status: 'pending',

  totalAmount,

  estimatedWaitTime,

  queuePosition: queueLength + 1,

  payment: {
    method: 'UPI QR',
    status: 'paid',
    paidAt: new Date()
  },

  statusTimestamps: {
    pending: new Date()
  }
});
      

    await order.save();

    // Update sold counts
    for (const item of enrichedItems) {
      await MenuItem.findByIdAndUpdate(item.menuItem, {
        $inc: { soldCount: item.quantity }
      });
    }

    // Real-time broadcast
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name phone')
      .populate('items.menuItem', 'name image');

    emitNewOrder(populatedOrder);

    const queueData = await buildQueueSnapshot();
    emitQueueUpdate(queueData);

    // Analytics
    analyticsService.recordOrder(order).catch(() => {});

    res.status(201).json({ success: true, data: populatedOrder });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/orders/:id/status ─────────────────────────────────────────
const updateOrderStatus = async (req, res, next) => {
  try {
     console.log("PATCH HIT");
    console.log("Requested Status:", req.body.status);

    const { status } = req.body;
    const validTransitions = {
      pending: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['completed'],
      completed: [],
      cancelled: []
    };

    const order = await Order.findById(req.params.id).populate('customer', 'fcmToken name');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from "${order.status}" to "${status}"`
      });
    }
    console.log("PATCH HIT");
console.log("Requested Status:", req.body.status);
    order.status = status;
    order.statusTimestamps[status] = new Date();
    await order.save();
    console.log("Saved Status:", order.status);

const check = await Order.findById(order._id);
console.log("Database Status:", check.status);
    console.log("Saved Status:", order.status); 

    // Real-time update
    emitOrderStatusUpdate(order);

    // Notify customer when order is ready
    if (status === 'ready' && order.customer?.fcmToken) {
      notificationService.sendOrderReadyNotification(
        order.customer.fcmToken,
        order.tokenNumber
      ).catch(() => {});
    }

    // Rebuild and emit queue
    const queueData = await buildQueueSnapshot();
    emitQueueUpdate(queueData);

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/orders/history ───────────────────────────────────────────────
const getOrderHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

   const query =
  req.user.role === 'customer'
    ? {
        'customer.user': req.user._id
      }
    : {};
     
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'name email')
        .populate('items.menuItem', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};
const verifyPickupPin = async (req, res, next) => {
  try {
    const { pickupPin } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status !== "ready") {
      return res.status(400).json({
        success: false,
        message: "Order is not ready for collection"
      });
    }

    if (order.pickupPin !== pickupPin) {
      return res.status(400).json({
        success: false,
        message: "Invalid Pickup PIN"
      });
    }

    order.status = "completed";
    order.statusTimestamps.completed = new Date();

    await order.save();

    emitOrderStatusUpdate(order);

    const queueData = await buildQueueSnapshot();
    emitQueueUpdate(queueData);

    res.json({
      success: true,
      message: "Order collected successfully",
      data: order
    });

  } catch (err) {
    next(err);
  }
};

// ─── Helper: build queue snapshot ─────────────────────────────────────────
const buildQueueSnapshot = async () => {
  const activeOrders = await Order.find({
    status: { $in: ['pending', 'preparing','ready'] }
  }).sort({ createdAt: 1 }).select('tokenNumber status estimatedWaitTime createdAt');

  return {
    queueLength: activeOrders.length,
    orders: activeOrders.map((o, idx) => ({
      ...o.toObject(),
      queuePosition: idx + 1
    })),
    updatedAt: new Date()
  };
};


module.exports = {
  getActiveQueue,
  getOrder,
  createOrder,
  updateOrderStatus,
  getOrderHistory,
  verifyPickupPin
};