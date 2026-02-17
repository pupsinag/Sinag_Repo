/* eslint-env node */
require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmailService = async () => {
  console.log('🧪 Testing Email Service Configuration...\n');

  // Check if credentials are set
  console.log('1️⃣  Checking credentials...');
  if (!process.env.EMAIL_USER) {
    console.error('❌ EMAIL_USER not set in .env');
    return;
  }
  if (!process.env.EMAIL_PASS) {
    console.error('❌ EMAIL_PASS not set in .env');
    return;
  }
  console.log(`✅ EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`✅ EMAIL_PASS: (${process.env.EMAIL_PASS.length} characters)\n`);

  // Create transporter
  console.log('2️⃣  Creating nodemailer transporter...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  console.log('✅ Transporter created\n');

  // Verify connection
  console.log('3️⃣  Verifying SMTP connection...');
  try {
    const verified = await transporter.verify();
    if (verified) {
      console.log('✅ SMTP connection verified successfully\n');
    } else {
      console.error('❌ SMTP connection verification failed\n');
      return;
    }
  } catch (err) {
    console.error('❌ SMTP verification error:', err.message);
    console.error('\nPossible causes:');
    console.error('  1. Invalid Gmail credentials');
    console.error('  2. Gmail account 2FA enabled without app password');
    console.error('  3. "Less secure apps" access needs to be enabled');
    console.error('  4. Gmail account blocked the login attempt');
    console.error('  5. Network connectivity issues\n');
    console.error('Full error:', err, '\n');
    return;
  }

  // Send test email
  console.log('4️⃣  Attempting to send test email...');
  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'PUP SINAG - Email Service Test',
      html: '<p>This is a test email from PUP SINAG backend.</p><p>If you received this, email service is working correctly!</p>',
      text: 'This is a test email from PUP SINAG backend. If you received this, email service is working correctly!',
    });
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId, '\n');
  } catch (err) {
    console.error('❌ Error sending email:', err.message);
    console.error('Full error:', err, '\n');
    return;
  }

  console.log('✅ All tests passed! Email service is configured correctly.\n');
};

testEmailService();
