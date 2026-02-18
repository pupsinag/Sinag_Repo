require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, User } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();

    const email = 'pupsinag@gmail.com';
    const plainPassword = 'SuperAdmin@123'; // change after login
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      console.log('❌ SuperAdmin already exists');
      process.exit(0);
    }

    await User.create({
      email,
      password: hashedPassword,
      firstName: 'SUPER',
      lastName: 'ADMIN',
      mi: null,
      studentId: null,
      role: 'SuperAdmin',
      program: null,
      yearSection: null,
      guardian: null,
      resetCode: null,
      resetCodeExpires: null,
      forcePasswordChange: 0,
    });

    console.log('✅ SuperAdmin injected into DB');
    console.log('Email:', email);
    console.log('Password:', plainPassword);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
