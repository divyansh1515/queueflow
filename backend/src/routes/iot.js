const express = require('express');
const router = express.Router();
const { handleButtonPress, getCurrentOrder, getStatus } = require('../controllers/iotController');
const { authenticateIoT } = require('../middleware/auth');

router.get('/status', authenticateIoT, getStatus);
router.get('/current-order', authenticateIoT, getCurrentOrder);
router.post('/button-press', authenticateIoT, handleButtonPress);

module.exports = router;
