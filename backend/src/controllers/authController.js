const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '7d'
});

// ─── POST /api/auth/register ───────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Prevent self-assigning admin/worker roles
    const assignedRole = ['admin', 'worker'].includes(role) ? 'customer' : (role || 'customer');

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, phone, role: assignedRole });
    const token = signToken(user._id);

    res.status(201).json({ success: true, token, data: user });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/login ──────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    const token = signToken(user._id);
    const userData = user.toJSON();

    res.json({ success: true, token, data: userData });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

// ─── PATCH /api/auth/update-fcm-token ─────────────────────────────────────
const updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user.id, { fcmToken });
    res.json({ success: true, message: 'FCM token updated' });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/create-staff ──────────────────────────────────────────
// Admin only: create worker/admin accounts
const createStaff = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!['worker', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role for staff creation' });
    }
    const user = await User.create({ name, email, password, phone, role });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateFcmToken, createStaff };
