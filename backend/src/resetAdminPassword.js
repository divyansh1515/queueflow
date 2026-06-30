require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const hash = await bcrypt.hash('admin123', 12);

  await User.findByIdAndUpdate(
    '63a2e79fb98f366dffc18515',
    { password: hash }
  );

  console.log('✅ Admin password reset');
  process.exit();
});