const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

const ROOMS = {
  WORKER_DASHBOARD: 'worker-dashboard',
  ADMIN_DASHBOARD: 'admin-dashboard',
  orderRoom: (orderId) => `order-${orderId}`,
  customerRoom: (userId) => `customer-${userId}`
};

const initSocket = (server) => {
  io = new Server(server, {
   cors: {
  origin: [
    "http://localhost:3000",
    "http://192.168.31.215:3000"
  ],
  methods: ["GET", "POST"],
  credentials: true
},
    pingTimeout: 60000
  });

  // ─── Auth Middleware for Socket ──────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow unauthenticated for customers tracking orders
      socket.user = null;
      return next();
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    socket.onAny((event, ...args) => {
  console.log("📡 EVENT RECEIVED:", event);
});
    logger.info(`🔌 Socket connected: ${socket.id} | user: ${socket.user?.id || 'guest'}`);

    // ─── Room Joins ───────────────────────────────────────────────────────
    socket.on('join:worker', () => {
      if (socket.user?.role === 'worker' || socket.user?.role === 'admin') {
        socket.join(ROOMS.WORKER_DASHBOARD);
        logger.info(`Worker ${socket.user.id} joined worker dashboard`);
      }
    });

    socket.on("join:admin", () => {
  console.log("\n========== JOIN ADMIN ==========");
  console.log("Socket ID:", socket.id);
  console.log("User:", socket.user);
  console.log("Role:", socket.user?.role);

  if (socket.user?.role === "admin") {
    socket.join(ROOMS.ADMIN_DASHBOARD);

    console.log("✅ Joined:", ROOMS.ADMIN_DASHBOARD);

    logger.info(`Admin ${socket.user.id} joined admin dashboard`);
  } else {
    console.log("❌ Not Admin");
  }
});
    socket.on('join:order', (orderId) => {
      socket.join(ROOMS.orderRoom(orderId));
      logger.info(`Socket ${socket.id} tracking order ${orderId}`);
    });

    socket.on('join:customer', (userId) => {
      socket.join(ROOMS.customerRoom(userId));
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// ─── Emit Helpers (called from controllers) ─────────────────────────────────

const emitOrderStatusUpdate = (order) => {
  if (!io) return;
  const payload = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    tokenNumber: order.tokenNumber,
    status: order.status,
    estimatedWaitTime: order.estimatedWaitTime,
    queuePosition: order.queuePosition,
    updatedAt: new Date()
  };
  // Notify the specific order room (customer tracking)
  io.to(ROOMS.orderRoom(order._id.toString())).emit('order:status_updated', payload);
  // Notify workers
  io.to(ROOMS.WORKER_DASHBOARD).emit('order:status_updated', payload);
  // Notify admin
  io.to(ROOMS.ADMIN_DASHBOARD).emit('order:status_updated', payload);
};

const emitNewOrder = (order) => {
  if (!io) return;

  console.log("\n========== EMIT NEW ORDER ==========");
  console.log("Token:", order.tokenNumber);

  // TEMP TEST - Broadcast to every connected socket
  io.emit("order:new", order);

  console.log("✅ Broadcasted order:new to ALL clients");
};
const emitQueueUpdate = (queueData) => {
  if (!io) return;
  io.emit('queue:updated', queueData); // broadcast to all
};

const emitAnalyticsUpdate = (analytics) => {
  if (!io) return;
  io.to(ROOMS.ADMIN_DASHBOARD).emit('analytics:updated', analytics);
};

const getIO = () => io;

module.exports = { initSocket, getIO, emitOrderStatusUpdate, emitNewOrder, emitQueueUpdate, emitAnalyticsUpdate, ROOMS };
