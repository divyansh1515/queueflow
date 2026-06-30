const Order = require('../models/Order');
const DailyAnalytics = require('../models/Analytics');
const MenuItem = require('../models/MenuItem');

// ─── GET /api/analytics/dashboard ─────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayOrders,
      todayRevenue,
      activeOrders,
      topItems
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today }, status: { $ne: 'pending_payment' } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, 'payment.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.countDocuments({ status: { $in: ['pending', 'preparing'] } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, status: 'completed' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.menuItem', name: { $first: '$items.name' }, qty: { $sum: '$items.quantity' }, rev: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { qty: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        today: {
          orders: todayOrders,
          revenue: todayRevenue[0]?.total || 0,
          activeOrders
        },
        topItems
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/weekly ────────────────────────────────────────────
const getWeeklyAnalytics = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const data = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, 'payment.status': 'paid' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/peak-hours ────────────────────────────────────────
const getPeakHours = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const data = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'pending_payment' } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill all 24 hours
    const hours = Array.from({ length: 24 }, (_, i) => {
      const found = data.find(d => d._id === i);
      return { hour: i, orders: found?.orders || 0, revenue: found?.revenue || 0 };
    });

    res.json({ success: true, data: hours });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/inventory-forecast ────────────────────────────────
const getInventoryForecast = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const itemDemand = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          name: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          daysActive: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }
        }
      },
      {
        $project: {
          name: 1,
          totalSold: 1,
          avgPerDay: { $divide: ['$totalSold', { $size: '$daysActive' }] }
        }
      },
      { $sort: { avgPerDay: -1 } }
    ]);

    // Simple linear forecast: next 7 days
    const forecast = itemDemand.map(item => ({
      ...item,
      forecast7Days: Math.ceil(item.avgPerDay * 7),
      recommendation: item.avgPerDay > 10
        ? 'High demand — ensure extra stock'
        : item.avgPerDay > 5
          ? 'Moderate demand — standard stock'
          : 'Low demand — minimal stock needed'
    }));

    res.json({ success: true, data: forecast });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getWeeklyAnalytics, getPeakHours, getInventoryForecast };
