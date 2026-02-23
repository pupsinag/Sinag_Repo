const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send email notification when intern credentials are updated
 * @param {Object} params - Email parameters
 * @param {string} params.internEmail - Intern's email address
 * @param {string} params.internName - Intern's full name
 * @param {Object} params.changes - Object containing changed fields and their new values
 * @param {string} params.updatedBy - Name of the person who made the update (adviser/coordinator)
 */
const sendCredentialUpdateEmail = async ({ internEmail, internName, changes, updatedBy }) => {
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email credentials not configured for credential update notification');
      return false;
    }

    const transporter = createTransporter();

    // Verify transporter connection
    const verified = await transporter.verify();
    if (!verified) {
      console.error('❌ Email transporter verification failed');
      return false;
    }

    // Build the list of changed fields for the email
    const changedFieldsList = Object.entries(changes)
      .map(
        ([field, value]) =>
          `<li><strong>${formatFieldName(field)}:</strong> ${value || 'N/A'}</li>`
      )
      .join('');

    // Send email
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: internEmail,
      subject: '⚠️ Your PUP SINAG Account Credentials Have Been Updated',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Account Credentials Update Notification</h2>
          
          <p>Hello <strong>${internName}</strong>,</p>

          <p>An administrator has updated your account credentials in the <strong>PUP SINAG</strong> system.</p>

          <h3>Updated Fields:</h3>
          <ul style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #FF6B3B;">
            ${changedFieldsList}
          </ul>

          <p><strong>Updated By:</strong> ${updatedBy}</p>
          <p><strong>Date & Time:</strong> ${new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })}</p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

          <p>If you did not authorize this change or have any questions, please contact your adviser or the PUPSINAG support team immediately.</p>

          <p style="color: #666; font-size: 12px;">
            — <strong>PUP SINAG System</strong><br>
            System for Internship Navigation and Guidance
          </p>
        </div>
      `,
      text: `
Hello ${internName},

Your account credentials have been updated in the PUP SINAG system.

Updated Fields:
${Object.entries(changes)
  .map(([field, value]) => `- ${formatFieldName(field)}: ${value || 'N/A'}`)
  .join('\n')}

Updated By: ${updatedBy}
Date & Time: ${new Date().toLocaleString('en-US')}

If you did not authorize this change, please contact your adviser or support team immediately.

— PUP SINAG System
      `,
    });

    console.log(`✅ Credential update email sent successfully to ${internEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending credential update email:', error.message || error);
    return false;
  }
};

/**
 * Format field names for display in email
 * @param {string} field - Field name (e.g., 'firstName', 'email')
 * @returns {string} - Formatted field name
 */
function formatFieldName(field) {
  const fieldMap = {
    firstName: 'First Name',
    lastName: 'Last Name',
    mi: 'Middle Initial',
    email: 'Email Address',
    studentId: 'Student ID',
    program: 'Program',
  };
  return fieldMap[field] || field;
}

module.exports = sendCredentialUpdateEmail;
