const mongoose = require('mongoose');

// Daily snapshot of sales for quick analytics queries
const dailyAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  shop: {
    type: String,
    default: 'default-shop'
  },
  totalOrders: { type: Number, default: 0 },
  completedOrders: { type: Number, default: 0 },
  cancelledOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  avgOrderValue: { type: Number, default: 0 },
  avgWaitTime: { type: Number, default: 0 }, // minutes
  // Orders per hour: array index = hour (0-23)
  ordersPerHour: {
    type: [Number],
    default: Array(24).fill(0)
  },
  revenuePerHour: {
    type: [Number],
    default: Array(24).fill(0)
  },
  // Top items sold
  topItems: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    quantitySold: Number,
    revenue: Number
  }],
  peakHour: { type: Number, default: null } // 0-23
}, {
  timestamps: true
});

dailyAnalyticsSchema.index({ date: 1, shop: 1 }, { unique: true });

module.exports = mongoose.model('DailyAnalytics', dailyAnalyticsSchema);
