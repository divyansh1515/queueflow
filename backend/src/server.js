const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const { initSocket } = require('./socket/socketManager');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/order');
const paymentRoutes = require('./routes/payment');
const analyticsRoutes = require('./routes/analytics');
const qrRoutes = require('./routes/qr');
const iotRoutes = require('./routes/iot');
const notificationRoutes = require('./routes/notification');
const shopRoutes = require('./routes/shop');
const app = express();
const server = http.createServer(app);

// ─── Connect Database ──────────────────────────────────────────────────────
connectDB();

// ─── Init WebSockets ───────────────────────────────────────────────────────
initSocket(server);

// ─── Global Middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://192.168.31.215:3000"
  ],
  credentials: true
}));
app.use(morgan('combined', {
  stream: {
    write: msg => logger.info(msg.trim())
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ─────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

app.use('/api/', limiter);

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/shops', shopRoutes);
// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ─── Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {

  console.log("\n================ ERROR ================\n");

  console.error(err);

  console.error("\nStack:\n");

  console.error(err.stack);

  console.log("\n=======================================\n");

  logger.error(
    `${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
  );

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(
    `🚀 QueueFlow server running on port ${PORT} [${process.env.NODE_ENV}]`
  );
});

module.exports = { app, server };