const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ EMAIL_USER or EMAIL_PASSWORD not set in environment variables');
      return null;
    }
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
};

const sendTenantCredentials = async (tenantEmail, tenantName, password, bedInfo) => {
  try {
    const mailer = getTransporter();
    if (!mailer) {
      console.error('❌ Email transporter not configured. Check EMAIL_USER and EMAIL_PASSWORD env vars.');
      return false;
    }
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials-box { background: #f0f7ff; border-left: 4px solid #ff6b35; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .credential { margin: 10px 0; }
            .credential label { font-weight: bold; color: #ff6b35; }
            .credential value { font-family: 'Courier New', monospace; background: #fff; padding: 8px 12px; border-radius: 4px; display: inline-block; }
            .important { background: #ffe6e6; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .important strong { color: #d32f2f; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; background: #ff6b35; color: white; padding: 12px 30px; border-radius: 4px; text-decoration: none; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 Bajrang Hostels and PG Pvt Ltd</h1>
              <p>Welcome to Your New Home</p>
            </div>
            
            <div class="content">
              <p>Hello <strong>${tenantName}</strong>,</p>
              
              <p>Welcome to <strong>Bajrang Hostels and PG Pvt Ltd!</strong> We are thrilled to have you join our community. Your accommodation has been successfully registered.</p>
              
              <div class="credentials-box">
                <h3 style="margin-top: 0; color: #ff6b35;">Your Login Credentials</h3>
                <div class="credential">
                  <label>Email:</label><br/>
                  <value>${tenantEmail}</value>
                </div>
                <div class="credential" style="margin-top: 15px;">
                  <label>Password:</label><br/>
                  <value>${password}</value>
                </div>
              </div>
              
              <div class="important">
                <strong>⚠️ Important Information:</strong>
                <ul>
                  <li>Use the above credentials to login to your account</li>
                  <li>On your first login, you will be prompted to change your password for security</li>
                  <li>Keep your password safe and do not share it with anyone</li>
                  <li>Bed Information: <strong>${bedInfo}</strong></li>
                </ul>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Visit our portal and login with the credentials above</li>
                <li>Change your password on first login (email verification required)</li>
                <li>Update your profile information if needed</li>
                <li>Review your stay details and payment schedule</li>
              </ol>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
              
              <p>Best wishes for a comfortable stay!<br/>
              <strong>Bajrang Hostels and PG Pvt Ltd Team</strong></p>
            </div>
            
            <div class="footer">
              <p>&copy; 2024 Bajrang Hostels and PG Pvt Ltd. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: tenantEmail,
      subject: '🎉 Welcome to Bajrang Hostels and PG Pvt Ltd - Your Login Credentials',
      html: htmlContent,
    };

    await mailer.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${tenantEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return false;
  }
};

const sendThankYouEmail = async (tenantEmail, tenantName, bedInfo, stayDuration) => {
  try {
    const mailer = getTransporter();
    if (!mailer) {
      console.error('❌ Email transporter not configured. Check EMAIL_USER and EMAIL_PASSWORD env vars.');
      return false;
    }
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .thank-you-box { background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 4px; text-align: center; }
            .thank-you-box h2 { color: #2e7d32; margin: 0 0 10px 0; }
            .details-box { background: #f5f5f5; border-left: 4px solid #ff6b35; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .detail-item { margin: 10px 0; }
            .detail-label { font-weight: bold; color: #ff6b35; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 Bajrang Hostels and PG Pvt Ltd</h1>
              <p>Thank You For Your Stay</p>
            </div>
            
            <div class="content">
              <p>Hello <strong>${tenantName}</strong>,</p>
              
              <div class="thank-you-box">
                <h2>Thank You! 🙏</h2>
                <p>We truly appreciate your stay with us. It was a pleasure hosting you!</p>
              </div>
              
              <p>Your tenancy has come to an end, and we wanted to express our gratitude for choosing <strong>Bajrang Hostels and PG Pvt Ltd</strong> as your home.</p>
              
              <div class="details-box">
                <h3 style="margin-top: 0; color: #333;">Your Stay Details</h3>
                <div class="detail-item">
                  <span class="detail-label">Accommodation:</span> ${bedInfo}
                </div>
                <div class="detail-item">
                  <span class="detail-label">Duration:</span> ${stayDuration}
                </div>
              </div>
              
              <p><strong>Highlights of Your Stay:</strong></p>
              <ul>
                <li>We hope you had a comfortable and memorable experience</li>
                <li>Thank you for maintaining the property and facilities</li>
                <li>Your cooperation with our rules and regulations was appreciated</li>
                <li>We wish you all the best in your future endeavors</li>
              </ul>
              
              <p><strong>Feedback:</strong></p>
              <p>We would love to hear from you! If you have any feedback or suggestions to help us improve our services, please feel free to reach out to us.</p>
              
              <p>If you ever need accommodation in the future, we would be delighted to welcome you back!</p>
              
              <p>Best wishes for your future!<br/>
              <strong>Bajrang Hostels and PG Pvt Ltd Team</strong></p>
            </div>
            
            <div class="footer">
              <p>&copy; 2024 Bajrang Hostels and PG Pvt Ltd. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: tenantEmail,
      subject: '🙏 Thank You For Your Stay - Bajrang Hostels and PG Pvt Ltd',
      html: htmlContent,
    };

    await mailer.sendMail(mailOptions);
    console.log(`✅ Thank you email sent to ${tenantEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending thank you email:', error.message);
    return false;
  }
};

const sendPaymentReminder = async (tenantEmail, tenantName, rent, bedInfo, monthName) => {
  try {
    const mailer = getTransporter();
    if (!mailer) {
      console.error('❌ Email transporter not configured. Check EMAIL_USER and EMAIL_PASSWORD env vars.');
      return false;
    }
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .reminder-box { background: #fff3e0; border-left: 4px solid #ff6b35; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .amount { font-size: 24px; font-weight: bold; color: #ff6b35; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 Bajrang Hostels and PG Pvt Ltd</h1>
              <p>Payment Reminder</p>
            </div>
            <div class="content">
              <p>Hello <strong>${tenantName}</strong>,</p>
              <p>This is a friendly reminder that your rent payment for <strong>${monthName}</strong> is pending.</p>
              <div class="reminder-box">
                <h3 style="margin-top: 0; color: #ff6b35;">Payment Details</h3>
                <p><strong>Month:</strong> ${monthName}</p>
                <p><strong>Accommodation:</strong> ${bedInfo}</p>
                <p><strong>Amount Due:</strong> <span class="amount">₹${rent}</span></p>
              </div>
              <p>Please make the payment at the earliest to avoid any inconvenience.</p>
              <p>If you have already made the payment, please disregard this email.</p>
              <p>Best regards,<br/><strong>Bajrang Hostels and PG Pvt Ltd Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Bajrang Hostels and PG Pvt Ltd. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: tenantEmail,
      subject: `⚠️ Rent Payment Reminder for ${monthName} - Bajrang Hostels and PG Pvt Ltd`,
      html: htmlContent,
    };

    await mailer.sendMail(mailOptions);
    console.log(`✅ Payment reminder sent to ${tenantEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending payment reminder:', error.message);
    return false;
  }
};

module.exports = { sendTenantCredentials, sendThankYouEmail, sendPaymentReminder };
