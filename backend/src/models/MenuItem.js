const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['beverage', 'snack', 'meal', 'dessert', 'other'],
    default: 'other'
  },
  image: {
    type: String, // URL to image
    default: null
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number, // in minutes
    required: [true, 'Preparation time is required'],
    default: 5,
    min: [1, 'Prep time must be at least 1 minute']
  },
  tags: [String], // e.g., ['veg', 'bestseller', 'spicy']
  soldCount: {
    type: Number,
    default: 0
  },
  shop: {
    type: String,
    default: 'default-shop'
  }
}, {
  timestamps: true
});

menuItemSchema.index({ category: 1, isAvailable: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);
