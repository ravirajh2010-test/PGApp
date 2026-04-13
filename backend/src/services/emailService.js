const nodemailer = require('nodemailer');
const { Resend } = require('resend');

let transporter = null;
let resendClient = null;

// Determine which email provider to use
const getEmailProvider = () => {
  if (process.env.RESEND_API_KEY) {
    if (!resendClient) {
      resendClient = new Resend(process.env.RESEND_API_KEY);
      console.log('✅ Resend email client initialized');
    }
    return 'resend';
  }
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return 'smtp';
  }
  console.error('❌ No email provider configured. Set RESEND_API_KEY or EMAIL_USER/EMAIL_PASSWORD');
  return null;
};

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
      console.log(`✅ SMTP transporter initialized for: ${process.env.EMAIL_USER}`);
    } catch (error) {
      console.error('❌ Error creating SMTP transporter:', error.message);
      return null;
    }
  }
  return transporter;
};

// Unified send function: tries Resend first, falls back to SMTP
const sendEmail = async (to, subject, html) => {
  const provider = getEmailProvider();
  if (!provider) return false;

  if (provider === 'resend') {
    try {
      const fromAddress = process.env.RESEND_FROM_EMAIL || 'RoomiPilot <onboarding@resend.dev>';
      const { data, error } = await resendClient.emails.send({
        from: fromAddress,
        to: [to],
        subject,
        html,
      });
      if (error) {
        console.error('❌ Resend error:', error);
        return false;
      }
      console.log(`✅ Email sent via Resend to ${to} (id: ${data.id})`);
      return true;
    } catch (err) {
      console.error('❌ Resend exception:', err.message);
      return false;
    }
  }

  // SMTP fallback
  const mailer = getTransporter();
  if (!mailer) return false;
  try {
    await mailer.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
    console.log(`✅ Email sent via SMTP to ${to}`);
    return true;
  } catch (err) {
    console.error('❌ SMTP error:', err.message);
    return false;
  }
};

const sendTenantCredentials = async (tenantEmail, tenantName, password, bedInfo, orgName) => {
  try {
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
              <h1>ðŸ¢ ${orgName || 'RoomiPilot'}</h1>
              <p>Welcome to Your New Home</p>
            </div>
            
            <div class="content">
              <p>Hello <strong>${tenantName}</strong>,</p>
              
              <p>Welcome to <strong>${orgName || 'RoomiPilot'}!</strong> We are thrilled to have you join our community. Your accommodation has been successfully registered.</p>
              
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
              <strong>${orgName || 'RoomiPilot'} Team</strong></p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${orgName || 'RoomiPilot'}. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const subject = `ðŸŽ‰ Welcome to ${orgName || 'RoomiPilot'} - Your Login Credentials`;
    const result = await sendEmail(tenantEmail, subject, htmlContent);
    if (result) console.log(`✅ Tenant credentials email sent to ${tenantEmail}`);
    return result;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return false;
  }
};

const sendThankYouEmail = async (tenantEmail, tenantName, bedInfo, stayDuration, orgName) => {
  try {
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
              <h1>ðŸ¢ ${orgName || 'RoomiPilot'}</h1>
              <p>Thank You For Your Stay</p>
            </div>
            
            <div class="content">
              <p>Hello <strong>${tenantName}</strong>,</p>
              
              <div class="thank-you-box">
                <h2>Thank You! ðŸ™</h2>
                <p>We truly appreciate your stay with us. It was a pleasure hosting you!</p>
              </div>
              
              <p>Your tenancy has come to an end, and we wanted to express our gratitude for choosing <strong>${orgName || 'RoomiPilot'}</strong> as your home.</p>
              
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
              <strong>${orgName || 'RoomiPilot'} Team</strong></p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${orgName || 'RoomiPilot'}. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const subject = `ðŸ™ Thank You For Your Stay - ${orgName || 'RoomiPilot'}`;
    const result = await sendEmail(tenantEmail, subject, htmlContent);
    if (result) console.log(`✅ Thank you email sent to ${tenantEmail}`);
    return result;
  } catch (error) {
    console.error('❌ Error sending thank you email:', error.message);
    return false;
  }
};

const sendPaymentReminder = async (tenantEmail, tenantName, rent, bedInfo, monthName, orgName) => {
  try {
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
              <h1>ðŸ¢ ${orgName || 'RoomiPilot'}</h1>
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
              <p>Best regards,<br/><strong>${orgName || 'RoomiPilot'} Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${orgName || 'RoomiPilot'}. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const subject = `⚠️ Rent Payment Reminder for ${monthName} - ${orgName || 'RoomiPilot'}`;
    const result = await sendEmail(tenantEmail, subject, htmlContent);
    if (result) console.log(`✅ Payment reminder sent to ${tenantEmail}`);
    return result;
  } catch (error) {
    console.error('❌ Error sending payment reminder:', error.message);
    return false;
  }
};

const sendRentReceipt = async (tenantEmail, tenantName, rent, bedInfo, monthName, paymentDate, orgName) => {
  try {
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
              <h1>ðŸ’° Rent Payment Receipt</h1>
              <p>${orgName || 'RoomiPilot'}</p>
            </div>
            
            <div class="content">
              <p>Hello <strong>${tenantName}</strong>,</p>
              <p>Your rent payment has been successfully recorded. Please find your receipt details below:</p>
              
              <div class="receipt-number">
                <strong>✔ Receipt Number:</strong> ${receiptNumber}
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
                <div class="verified">âœ“ Payment Verified</div>
              </div>
              
              <div class="info-box">
                <strong>ðŸ“Œ Information:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This receipt serves as proof of your rent payment for ${monthName}</li>
                  <li>Please keep this receipt for your records</li>
                  <li>If you have any questions about this transaction, please contact us immediately</li>
                </ul>
              </div>
              
              <p>Thank you for your timely payment. We appreciate your cooperation!</p>
              
              <p>Best regards,<br/>
              <strong>${orgName || 'RoomiPilot'} Team</strong></p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${orgName || 'RoomiPilot'}. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const subject = `ðŸ’° Rent Receipt - ${monthName} - ${orgName || 'RoomiPilot'}`;
    const result = await sendEmail(tenantEmail, subject, htmlContent);
    if (result) console.log(`âœ… Rent receipt sent to ${tenantEmail}`);
    return result;
  } catch (error) {
    console.error('âŒ Error sending rent receipt:', error.message);
    return false;
  }
};

const sendOrgWelcomeEmail = async (orgEmail, orgName, adminName, adminEmail, plan) => {
  try {
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
              <h1>ðŸ¢ RoomiPilot</h1>
              <p>Welcome to RoomiPilot Platform</p>
            </div>
            
            <div class="content">
              <p>Hello <strong>${adminName}</strong>,</p>
              
              <div class="welcome-box">
                <h2>ðŸŽ‰ Congratulations!</h2>
                <p>Your PG <strong>${orgName}</strong> has been successfully registered on RoomiPilot!</p>
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
              <strong>RoomiPilot Team</strong></p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} RoomiPilot. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const subject = 'ðŸŽ‰ Welcome to RoomiPilot - Your PG is Registered!';
    const result = await sendEmail(orgEmail, subject, htmlContent);
    if (result) console.log(`âœ… Organization welcome email sent to ${orgEmail}`);
    return result;
  } catch (error) {
    console.error('âŒ Error sending organization welcome email:', error.message);
    return false;
  }
};

const sendDeactivationEmail = async (tenantEmail, tenantName, bedInfo, orgName) => {
  try {
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
            .details-box { background: #f0f7ff; border-left: 4px solid #ff6b35; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .review-box { background: #fff8e1; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ðŸ¢ ${orgName || 'RoomiPilot'}</h1>
              <p>Thank You For Your Stay</p>
            </div>
            <div class="content">
              <p>Dear <strong>${tenantName}</strong>,</p>

              <div class="thank-you-box">
                <h2>ðŸ™ Thank You!</h2>
                <p>We sincerely appreciate your stay with us. It was a pleasure having you as part of our community!</p>
              </div>

              <div class="details-box">
                <h3 style="margin-top: 0; color: #ff6b35;">Stay Details</h3>
                <p><strong>Accommodation:</strong> ${bedInfo}</p>
                <p>Your account has been deactivated and the bed has been released.</p>
              </div>

              <div class="review-box">
                <h3 style="margin-top: 0; color: #f57c00;">â­ We'd Love Your Feedback!</h3>
                <p>Your feedback means the world to us. If you had a good experience, we'd really appreciate it if you could leave us a review on <strong>Google Reviews</strong>. It helps other tenants find a great place to stay!</p>
              </div>

              <p>We wish you all the very best for your future endeavors. If you ever need accommodation again, our doors are always open for you!</p>

              <p>Warm regards,<br/>
              <strong>${orgName || 'RoomiPilot'} Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${orgName || 'RoomiPilot'}. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const subject = `ðŸ™ Thank You For Your Stay - ${orgName || 'RoomiPilot'}`;
    const result = await sendEmail(tenantEmail, subject, htmlContent);
    if (result) console.log(`âœ… Deactivation email sent to ${tenantEmail}`);
    return result;
  } catch (error) {
    console.error('âŒ Error sending deactivation email:', error.message);
    return false;
  }
};

// â”€â”€ Stay Extension Reminder (3 days before end_date) â”€â”€â”€â”€â”€â”€â”€
const sendStayExtensionReminder = async (tenantEmail, tenantName, bedInfo, endDate, orgName) => {
  try {
    const formattedEndDate = new Date(endDate).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #ff9800 0%, #ff6d00 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .alert-box { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .detail-box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .detail-item { margin: 8px 0; }
            .detail-label { font-weight: bold; color: #555; }
            .cta-box { background: #e8f5e9; border: 2px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
            .cta-box h3 { color: #2e7d32; margin: 0 0 10px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>â° Stay Ending Soon</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${tenantName}</strong>,</p>
              
              <div class="alert-box">
                <strong>âš ï¸ Your stay is ending in 3 days!</strong>
                <p style="margin: 5px 0 0 0;">Your current stay at <strong>${orgName || 'RoomiPilot'}</strong> is scheduled to end on <strong>${formattedEndDate}</strong>.</p>
              </div>

              <div class="detail-box">
                <div class="detail-item">
                  <span class="detail-label">ðŸ  Bed:</span> ${bedInfo}
                </div>
                <div class="detail-item">
                  <span class="detail-label">ðŸ“… End Date:</span> ${formattedEndDate}
                </div>
              </div>

              <div class="cta-box">
                <h3>ðŸ”„ Want to Continue Your Stay?</h3>
                <p>Please contact your admin <strong>before ${formattedEndDate}</strong> to extend your stay and avoid release of your bed.</p>
                <p style="margin-top: 10px; font-size: 14px; color: #555;">
                  Early confirmation helps us ensure your bed is reserved for you.
                </p>
              </div>

              <p><strong>ðŸ“Œ What happens if you don't respond?</strong></p>
              <ul>
                <li>Your bed will be released on ${formattedEndDate}</li>
                <li>Your account will be deactivated</li>
                <li>The bed may be assigned to a new tenant</li>
              </ul>

              <p>If you have already spoken with the admin, you can ignore this email.</p>

              <p>Warm regards,<br/>
              <strong>${orgName || 'RoomiPilot'} Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${orgName || 'RoomiPilot'}. All rights reserved.</p>
              <p>This is an automated reminder. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const subject = `â° Stay Ending Soon - Action Required - ${orgName || 'RoomiPilot'}`;
    const result = await sendEmail(tenantEmail, subject, htmlContent);
    if (result) console.log(`âœ… Stay extension reminder sent to ${tenantEmail}`);
    return result;
  } catch (error) {
    console.error('âŒ Error sending stay extension reminder:', error.message);
    return false;
  }
};

module.exports = { sendEmail, sendTenantCredentials, sendThankYouEmail, sendPaymentReminder, sendRentReceipt, sendOrgWelcomeEmail, sendDeactivationEmail, sendStayExtensionReminder };
