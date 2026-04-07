const nodemailer = require('nodemailer');

let transporter = null;
let transporterVerified = false;

const getTransporter = () => {
  if (!transporter) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ EMAIL_USER or EMAIL_PASSWORD not set in environment variables');
      return null;
    }
    try {
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        pool: false,
        tls: {
          rejectUnauthorized: false
        }
      });
      console.log(`✅ Email transporter initialized for: ${process.env.EMAIL_USER}`);
    } catch (error) {
      console.error('❌ Error creating email transporter:', error.message);
      return null;
    }
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

const sendRentReceipt = async (tenantEmail, tenantName, rent, bedInfo, monthName, paymentDate) => {
  try {
    const mailer = getTransporter();
    if (!mailer) {
      console.error('❌ Email transporter not configured. Check EMAIL_USER and EMAIL_PASSWORD env vars.');
      return false;
    }
    
    // Format payment date
    const formattedDate = new Date(paymentDate).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
    
    // Generate receipt number using timestamp
    const receiptNumber = `RCP-${Math.floor(Date.now() / 1000)}`;
    
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 5px 0 0 0; font-size: 14px; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .receipt-number { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .receipt-number strong { color: #2e7d32; }
            .receipt-box { background: #f5f5f5; border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .receipt-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            .receipt-row:last-child { border-bottom: none; }
            .receipt-label { font-weight: bold; color: #666; }
            .receipt-value { color: #333; }
            .amount-box { background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 4px; text-align: center; }
            .amount-label { font-size: 14px; color: #666; }
            .amount { font-size: 32px; font-weight: bold; color: #2e7d32; margin: 10px 0; }
            .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 13px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
            .verified { color: #4caf50; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Rent Payment Receipt</h1>
              <p>Bajrang Hostels and PG Pvt Ltd</p>
            </div>
            
            <div class="content">
              <p>Hello <strong>${tenantName}</strong>,</p>
              <p>Your rent payment has been successfully recorded. Please find your receipt details below:</p>
              
              <div class="receipt-number">
                <strong>✓ Receipt Number:</strong> ${receiptNumber}
              </div>
              
              <div class="receipt-box">
                <div class="receipt-row">
                  <span class="receipt-label">Tenant Name:</span>
                  <span class="receipt-value">${tenantName}</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Accommodation:</span>
                  <span class="receipt-value">${bedInfo}</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Payment For:</span>
                  <span class="receipt-value">${monthName}</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Payment Date:</span>
                  <span class="receipt-value">${formattedDate}</span>
                </div>
              </div>
              
              <div class="amount-box">
                <div class="amount-label">Amount Paid</div>
                <div class="amount">₹${rent}</div>
                <div class="verified">✓ Payment Verified</div>
              </div>
              
              <div class="info-box">
                <strong>📌 Information:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This receipt serves as proof of your rent payment for ${monthName}</li>
                  <li>Please keep this receipt for your records</li>
                  <li>If you have any questions about this transaction, please contact us immediately</li>
                </ul>
              </div>
              
              <p>Thank you for your timely payment. We appreciate your cooperation!</p>
              
              <p>Best regards,<br/>
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
      subject: `💰 Rent Receipt - ${monthName} - Bajrang Hostels and PG Pvt Ltd`,
      html: htmlContent,
    };

    await mailer.sendMail(mailOptions);
    console.log(`✅ Rent receipt sent to ${tenantEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending rent receipt:', error.message);
    return false;
  }
};

const sendOrgWelcomeEmail = async (orgEmail, orgName, adminName, adminEmail, plan) => {
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
            .welcome-box { background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 4px; text-align: center; }
            .welcome-box h2 { color: #2e7d32; margin: 0 0 10px 0; }
            .details-box { background: #f0f7ff; border-left: 4px solid #ff6b35; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .detail-item { margin: 10px 0; }
            .detail-label { font-weight: bold; color: #ff6b35; }
            .plan-badge { display: inline-block; background: #ff6b35; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; text-transform: capitalize; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 PG Stay</h1>
              <p>Welcome to PG Stay Platform</p>
            </div>
            
            <div class="content">
              <p>Hello <strong>${adminName}</strong>,</p>
              
              <div class="welcome-box">
                <h2>🎉 Congratulations!</h2>
                <p>Your PG <strong>${orgName}</strong> has been successfully registered on PG Stay!</p>
              </div>
              
              <p>We are excited to have you onboard. Your organization is now set up and ready to manage your PG operations seamlessly.</p>
              
              <div class="details-box">
                <h3 style="margin-top: 0; color: #ff6b35;">Registration Details</h3>
                <div class="detail-item">
                  <span class="detail-label">Organization Name:</span> ${orgName}
                </div>
                <div class="detail-item">
                  <span class="detail-label">Business Email:</span> ${orgEmail}
                </div>
                <div class="detail-item">
                  <span class="detail-label">Admin Email:</span> ${adminEmail}
                </div>
                <div class="detail-item">
                  <span class="detail-label">Plan:</span> <span class="plan-badge">${plan}</span>
                </div>
              </div>
              
              <p><strong>What's Next?</strong></p>
              <ol>
                <li>Log in to your admin dashboard using your admin credentials</li>
                <li>Set up your buildings, rooms, and beds</li>
                <li>Start adding your tenants</li>
                <li>Manage payments and track occupancy</li>
              </ol>
              
              <p>If you need any help getting started, feel free to reach out to our support team.</p>
              
              <p>Welcome aboard!<br/>
              <strong>PG Stay Team</strong></p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} PG Stay. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: orgEmail,
      subject: '🎉 Welcome to PG Stay - Your PG is Registered!',
      html: htmlContent,
    };

    await mailer.sendMail(mailOptions);
    console.log(`✅ Organization welcome email sent to ${orgEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending organization welcome email:', error.message);
    return false;
  }
};

module.exports = { sendTenantCredentials, sendThankYouEmail, sendPaymentReminder, sendRentReceipt, sendOrgWelcomeEmail };
