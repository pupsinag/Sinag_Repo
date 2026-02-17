const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const sendCredentialsEmail = require('../utils/sendCredentialsEmail');

const registerUser = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required' });
    }

    // Prevent duplicate accounts
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 🔑 Generate temporary password
    const tempPassword = crypto.randomBytes(4).toString('hex');

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 💾 Save user
    await User.create({
      email,
      passwordHash: hashedPassword,
      role,
      forcePasswordChange: true,
    });

    // 📧 Send credentials email
    await sendCredentialsEmail({
      email,
      password: tempPassword,
      role,
    });

    res.json({ message: 'User registered and credentials sent' });
  } catch (err) {
    console.error('REGISTER USER ERROR:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

module.exports = {
  registerUser,
};
