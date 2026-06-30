const DailyAnalytics = require('../models/Analytics');
const logger = require('../utils/logger');

const recordOrder = async (order) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hour = new Date().getHours();

    await DailyAnalytics.findOneAndUpdate(
      { date: today, shop: order.shop },
      {
        $inc: {
          totalOrders: 1,
          totalRevenue: order.totalAmount,
          [`ordersPerHour.${hour}`]: 1,
          [`revenuePerHour.${hour}`]: order.totalAmount
        }
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    logger.error('Analytics record error:', error.message);
  }
};

module.exports = { recordOrder };
