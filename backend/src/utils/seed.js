/**
 * Development seed script
 * Run: node src/utils/seed.js
 */

require('dotenv').config();

const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Shop = require('../models/Shop');
const connectDB = require('../config/database');

const MENU_ITEMS = [
  { name: 'Masala Chai', description: 'Classic spiced Indian tea', price: 15, category: 'beverage', preparationTime: 3, tags: ['bestseller', 'hot'], isAvailable: true },
  { name: 'Cold Coffee', description: 'Chilled blended coffee with ice cream', price: 50, category: 'beverage', preparationTime: 5, tags: ['cold', 'bestseller'], isAvailable: true },
  { name: 'Fresh Lime Soda', description: 'Sweet or salted, with soda', price: 30, category: 'beverage', preparationTime: 3, tags: ['cold', 'veg'], isAvailable: true },
  { name: 'Mango Juice', description: 'Fresh Alphonso mango blend', price: 45, category: 'beverage', preparationTime: 4, tags: ['cold', 'seasonal'], isAvailable: true },

  { name: 'Samosa (2 pcs)', description: 'Crispy fried pastry with spiced potato filling', price: 20, category: 'snack', preparationTime: 2, tags: ['veg', 'fried'], isAvailable: true },
  { name: 'Vada Pav', description: 'Mumbai street classic — spiced potato in bun', price: 18, category: 'snack', preparationTime: 3, tags: ['veg', 'bestseller'], isAvailable: true },
  { name: 'Paneer Sandwich', description: 'Grilled with veggies and mint chutney', price: 55, category: 'snack', preparationTime: 7, tags: ['veg'], isAvailable: true },
  { name: 'Maggi Noodles', description: 'The classic 2-minute noodles, canteen style', price: 35, category: 'snack', preparationTime: 8, tags: ['bestseller'], isAvailable: true },

  { name: 'Rajma Rice', description: 'Slow-cooked kidney beans with steamed rice', price: 80, category: 'meal', preparationTime: 10, tags: ['veg'], isAvailable: true },
  { name: 'Chole Bhature', description: 'Spiced chickpeas with fried bread', price: 70, category: 'meal', preparationTime: 12, tags: ['veg', 'bestseller'], isAvailable: true },
  { name: 'Chicken Biryani', description: 'Aromatic basmati rice with tender chicken', price: 120, category: 'meal', preparationTime: 15, tags: ['non-veg', 'bestseller'], isAvailable: true },
  { name: 'Egg Fried Rice', description: 'Wok-tossed rice with scrambled egg', price: 75, category: 'meal', preparationTime: 10, tags: ['egg'], isAvailable: true },

  { name: 'Gulab Jamun (2 pcs)', description: 'Soft milk dumplings in sugar syrup', price: 30, category: 'dessert', preparationTime: 2, tags: ['veg', 'sweet'], isAvailable: true },
  { name: 'Ice Cream', description: 'Vanilla / Chocolate / Strawberry scoop', price: 40, category: 'dessert', preparationTime: 2, tags: ['cold'], isAvailable: true }
];

const USERS = [
  { name: 'Admin User', email: 'admin@queueflow.com', password: 'admin123', role: 'admin', phone: '+919876500001' },
  { name: 'Worker One', email: 'worker1@queueflow.com', password: 'worker123', role: 'worker', phone: '+919876500002' },
  { name: 'Worker Two', email: 'worker2@queueflow.com', password: 'worker123', role: 'worker', phone: '+919876500003' },
  { name: 'Test Customer', email: 'customer@queueflow.com', password: 'customer123', role: 'customer', phone: '+919876500004' }
];

async function seed() {
  try {
    await connectDB();

    console.log("🌱 Starting seed...");

    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Shop.deleteMany({});

    console.log("🗑️ Cleared existing data");

    const createdUsers = await User.create(USERS);

    const shop = await Shop.create({
      shopId: "abc-juice",
      name: "ABC Juice Corner",
      
      address: "College Canteen",
      phone: "9999999999",
      isActive: true
    });

    console.log("🏪 Shop created:", shop.shopId);

    const menuWithShop = MENU_ITEMS.map(item => ({
  ...item,
  shop: "abc-juice"
}));
console.log(menuWithShop[0]);
const createdItems = await MenuItem.create(menuWithShop);

    console.log(`👥 Created ${createdUsers.length} users`);
    console.log(`🍽️ Created ${createdItems.length} menu items`);

    console.log("");
    console.log("✅ Seed complete!");
    console.log("");
    console.log("Login credentials:");
    console.log("Admin    : admin@queueflow.com / admin123");
    console.log("Worker   : worker1@queueflow.com / worker123");
    console.log("Customer : customer@queueflow.com / customer123");

    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();