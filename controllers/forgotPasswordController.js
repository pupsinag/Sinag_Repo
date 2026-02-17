const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

/* =========================
   SEND RESET CODE
========================= */
const sendResetCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ message: 'If the email exists, a code has been sent' });
    }

    const code = crypto.randomInt(100000, 999999).toString();

    user.resetCode = code;
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'PUP SINAG Password Reset Code',
      text: `Your verification code is: ${code}`,
    });

    return res.json({ message: 'Verification code sent' });
  } catch (err) {
    console.error('SEND CODE ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/* =========================
   VERIFY RESET CODE
========================= */
const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.resetCode || !user.resetCodeExpires) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // Normalize comparison
    const storedCode = String(user.resetCode).trim();
    const inputCode = String(code).trim();

    if (storedCode !== inputCode) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    if (new Date(user.resetCodeExpires) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    return res.json({ message: 'Code verified' });
  } catch (err) {
    console.error('VERIFY CODE ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/* =========================
   RESET PASSWORD
========================= */
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.resetCode || !user.resetCodeExpires) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const storedCode = String(user.resetCode).trim();
    const inputCode = String(code).trim();

    if (storedCode !== inputCode) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    if (new Date(user.resetCodeExpires) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;

    // Clear reset fields
    user.resetCode = null;
    user.resetCodeExpires = null;

    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendResetCode,
  verifyResetCode,
  resetPassword,
};
