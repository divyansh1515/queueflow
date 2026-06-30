const express = require('express');
const router = express.Router();
const { getDashboard, getWeeklyAnalytics, getPeakHours, getInventoryForecast } = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/dashboard', authenticate, authorize('admin'), getDashboard);
router.get('/weekly', authenticate, authorize('admin'), getWeeklyAnalytics);
router.get('/peak-hours', authenticate, authorize('admin'), getPeakHours);
router.get('/inventory-forecast', authenticate, authorize('admin'), getInventoryForecast);

module.exports = router;
