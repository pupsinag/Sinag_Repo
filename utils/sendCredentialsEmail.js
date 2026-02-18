const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendCredentialsEmail = async ({ email, password, role }) => {
  const loginUrl = 'http://localhost:5173/pup-sinag/login';

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your PUP SINAG Account Credentials',
    html: `
      <p>Hello,</p>

      <p>Your <strong>PUP SINAG</strong> account has been created.</p>

      <p><strong>Role:</strong> ${role}</p>

      <p><strong>Login Credentials:</strong></p>
      <ul>
        <li>Email: <strong>${email}</strong></li>
        <li>Password: <strong>${password}</strong></li>
      </ul>

      <p>Login here:</p>
      <a href="${loginUrl}">${loginUrl}</a>

      <p style="color:red;">
        Please change your password immediately after logging in.
      </p>

      <br />
      <p>— PUP SINAG System</p>
    `,
  });
};

module.exports = sendCredentialsEmail;
