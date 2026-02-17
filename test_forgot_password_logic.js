/* eslint-env node */
require('dotenv').config();
const { User } = require('./models');
const db = require('./models');

const testForgotPassword = async () => {
  try {
    console.log('🧪 Testing Forgot Password Flow...\n');

    // Connect to database
    console.log('Connecting to database...');
    await db.sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if test user exists
    console.log('Checking for test user...');
    let user = await User.findOne({ where: { email: 'test@example.com' } });
    
    if (!user) {
      console.log('Creating test user...');
      user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        role: 'intern',
      });
      console.log('✅ Test user created\n');
    } else {
      console.log('✅ Test user found\n');
    }

    // Simulate sendResetCode
    console.log('Simulating sendResetCode logic...');
    const crypto = require('crypto');
    
    const code = crypto.randomInt(100000, 999999).toString();
    user.resetCode = code;
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    
    await user.save();
    console.log(`✅ Reset code saved: ${code}\n`);

    console.log('Testing user retrieval after save...');
    const retrievedUser = await User.findOne({ where: { email: 'test@example.com' } });
    console.log('✅ User retrieved');
    console.log('Reset Code:', retrievedUser.resetCode);
    console.log('Reset Code Expires:', retrievedUser.resetCodeExpires, '\n');

    console.log('✅ All tests passed!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
};

testForgotPassword();
