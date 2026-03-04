const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

/* =========================
   SEND RESET CODE
========================= */
const sendResetCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user in database
    let user;
    try {
      user = await User.findOne({ where: { email } });
    } catch (dbErr) {
      console.error('DATABASE ERROR (Finding user):', dbErr.message);
      return res.status(500).json({ 
        message: 'Database error', 
        error: dbErr.message 
      });
    }

    if (!user) {
      return res.json({ message: 'If the email exists, a code has been sent' });
    }

    const code = crypto.randomInt(100000, 999999).toString();

    user.resetCode = code;
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    
    // Save reset code to database
    try {
      await user.save();
      console.log(`✅ Reset code saved for ${email}`);
    } catch (saveErr) {
      console.error('DATABASE ERROR (Saving reset code):', saveErr.message);
      return res.status(500).json({ 
        message: 'Failed to save reset code', 
        error: saveErr.message 
      });
    }

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('SEND CODE ERROR: Email credentials not configured');
      console.error('EMAIL_USER:', process.env.EMAIL_USER);
      console.error('EMAIL_PASS:', process.env.EMAIL_PASS ? '***HIDDEN***' : 'NOT SET');
      return res.status(500).json({ message: 'Email service not configured' });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      console.log('📧 Nodemailer transporter created successfully');

      // Verify the transporter connection
      const verified = await transporter.verify();
      if (!verified) {
        console.error('SEND CODE ERROR: Nodemailer verification failed - credentials may be invalid');
        return res.status(500).json({ 
          message: 'Email service verification failed - check credentials' 
        });
      }

      console.log('✅ Nodemailer transporter verified');

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'PUP SINAG Password Reset Code',
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 10 minutes.</p>`,
        text: `Your verification code is: ${code}. This code will expire in 10 minutes.`,
      });

      console.log(`✅ Email sent successfully to ${email}`);
      return res.json({ message: 'Verification code sent' });
    } catch (emailErr) {
      console.error('SEND CODE ERROR (Email):', emailErr.message || emailErr);
      console.error('Full error:', emailErr);
      
      // Provide more specific error messages
      if (emailErr.message.includes('Invalid login') || emailErr.message.includes('authentication failed')) {
        return res.status(500).json({ 
          message: 'Email authentication failed - invalid credentials' 
        });
      }
      
      return res.status(500).json({ 
        message: 'Failed to send verification code', 
        error: emailErr.message 
      });
    }
  } catch (err) {
    console.error('SEND CODE ERROR (General):', err.message || err);
    console.error('Full error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
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

    let user;
    try {
      user = await User.findOne({ where: { email } });
    } catch (dbErr) {
      console.error('DATABASE ERROR (Finding user for verification):', dbErr.message);
      return res.status(500).json({ 
        message: 'Database error', 
        error: dbErr.message 
      });
    }

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
    console.error('VERIFY CODE ERROR (General):', err.message || err);
    return res.status(500).json({ message: 'Server error', error: err.message });
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

    let user;
    try {
      user = await User.findOne({ where: { email } });
    } catch (dbErr) {
      console.error('DATABASE ERROR (Finding user for reset):', dbErr.message);
      return res.status(500).json({ 
        message: 'Database error', 
        error: dbErr.message 
      });
    }

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
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(newPassword, 10);
    } catch (hashErr) {
      console.error('BCRYPT ERROR:', hashErr.message);
      return res.status(500).json({ 
        message: 'Failed to hash password', 
        error: hashErr.message 
      });
    }

    user.password = hashedPassword;

    // Clear reset fields
    user.resetCode = null;
    user.resetCodeExpires = null;

    // Save updated user to database
    try {
      await user.save();
      console.log(`✅ Password reset successfully for ${email}`);
    } catch (saveErr) {
      console.error('DATABASE ERROR (Saving new password):', saveErr.message);
      return res.status(500).json({ 
        message: 'Failed to save new password', 
        error: saveErr.message 
      });
    }

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('RESET PASSWORD ERROR (General):', err.message || err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  sendResetCode,
  verifyResetCode,
  resetPassword,
};
