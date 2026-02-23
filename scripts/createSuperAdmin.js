require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();

    const email = 'pupsinag@gmail.com';
    const plainPassword = 'SuperAdmin@123'; // change after login
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      await exists.update({
        password: hashedPassword,
        role: 'superadmin',
        forcePasswordChange: false,
      });
      console.log('✅ Existing SuperAdmin updated');
    } else {
      await User.create({
        email,
        password: hashedPassword,
        firstName: 'SUPER',
        lastName: 'ADMIN',
        mi: null,
        studentId: null,
        role: 'superadmin',
        program: null,
        yearSection: null,
        guardian: null,
        resetCode: null,
        resetCodeExpires: null,
        forcePasswordChange: false,
      });

      console.log('✅ SuperAdmin injected into DB');
    }
    console.log('Email:', email);
    console.log('Password:', plainPassword);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
