const MenuItem = require('../models/MenuItem');

// GET ALL MENU ITEMS
const getAllItems = async (req, res, next) => {
  try {
    const { category, available, shop } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (available !== undefined) {
      filter.isAvailable = available === 'true';
    }

    if (shop) {
      filter.shop = shop;
    }

    const items = await MenuItem.find(filter).sort({
      category: 1,
      name: 1
    });

    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    next(error);
  }
};

// CREATE ITEM
const createItem = async (req, res, next) => {
  try {
    const item = await MenuItem.create(req.body);

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE ITEM
const updateItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });

  } catch (error) {
    next(error);
  }
};

// DELETE ITEM
const deleteItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item deleted'
    });

  } catch (error) {
    next(error);
  }
};

// TOGGLE AVAILABILITY
const toggleAvailability = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    res.json({
      success: true,
      data: item
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllItems,
  createItem,
  updateItem,
  deleteItem,
  toggleAvailability
};