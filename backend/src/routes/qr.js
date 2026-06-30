const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Shop = require('../models/Shop');
const { authenticate, authorize } = require('../middleware/auth');

// Generate QR
router.get('/generate', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // Get first shop from DB
    const shop = await Shop.findOne();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'No shop found'
      });
    }

    const baseUrl =
      process.env.QR_BASE_URL || 'http://localhost:3000/order';
      console.log("QR_BASE_URL =", process.env.QR_BASE_URL);
console.log("SHOP_ID =", process.env.SHOP_ID);

    // IMPORTANT: use /order/:shopId
    const qrUrl = `${baseUrl}/${shop.shopId}`;

    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2
    });

    res.json({
      success: true,
      data: {
        shopId: shop.shopId,
        qrUrl,
        qrDataUrl
      }
    });

  } catch (err) {
    next(err);
  }
});

// Download QR
router.get('/download', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const shop = await Shop.findOne();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'No shop found'
      });
    }

    const baseUrl =
      process.env.QR_BASE_URL || 'http://localhost:3000/order';

    const qrUrl = `${baseUrl}/${shop.shopId}`;

    const buffer = await QRCode.toBuffer(qrUrl, {
      width: 600,
      margin: 2
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${shop.shopId}.png"`
    );

    res.send(buffer);

  } catch (err) {
    next(err);
  }
});

module.exports = router;