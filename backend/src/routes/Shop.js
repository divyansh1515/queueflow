const express = require("express");
const router = express.Router();

const Shop = require("../models/Shop");

// Get shop details by Shop ID
router.get("/:shopId", async (req, res) => {
  try {
    const shop = await Shop.findOne({
      shopId: req.params.shopId,
      isActive: true,
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    res.json({
      success: true,
      data: shop,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;