// ═══════════════════════════════════════════════════════════
// routes/auth.js
// ═══════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { register, login, getMe, updateFcmToken, createStaff } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.patch('/update-fcm-token', authenticate, updateFcmToken);
router.post('/create-staff', authenticate, authorize('admin'), createStaff);

module.exports = router;
