/* eslint-env node */
require('dotenv').config();
const { User } = require('./models');
const db = require('./models');

const checkUsers = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected\n');

    const users = await User.findAll({
      limit: 10,
      attributes: ['id', 'email', 'firstName', 'lastName', 'role'],
    });

    console.log('Users in database:');
    users.forEach((user) => {
      console.log(`  - ${user.email} (${user.firstName} ${user.lastName}) - ${user.role}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  }
};

checkUsers();
