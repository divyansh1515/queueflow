const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// POST /api/notifications/send — manual broadcast (admin)
router.post('/send', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { title, body, topic } = req.body;
    await notificationService.sendTopicNotification(topic || 'customers', title, body);
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) { next(error); }
});

module.exports = router;
