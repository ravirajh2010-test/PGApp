const express = require('express');
const router = express.Router();
const { sendTenantCredentials, sendOrgWelcomeEmail, sendPaymentReminder } = require('../services/emailService');

// Test tenant credentials email
router.post('/test-tenant-email', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ 
        message: 'Email, name, and password are required',
        receivedData: { email, name, password }
      });
    }

    console.log(`\n📧 Testing tenant email to: ${email}`);
    console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '***SET***' : '❌ NOT SET'}`);
    
    const bedInfo = 'Building A - Room 101';
    const result = await sendTenantCredentials(email, name, password, bedInfo);

    res.json({
      success: result,
      message: result 
        ? `✅ Test email sent successfully to ${email}`
        : `❌ Failed to send email to ${email}. Check server logs.`,
      emailSystemStatus: {
        emailUserConfigured: !!process.env.EMAIL_USER,
        emailPasswordConfigured: !!process.env.EMAIL_PASSWORD,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('❌ Error in test-tenant-email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message,
      emailSystemStatus: {
        emailUserConfigured: !!process.env.EMAIL_USER,
        emailPasswordConfigured: !!process.env.EMAIL_PASSWORD,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
});

// Test organization welcome email
router.post('/test-org-email', async (req, res) => {
  try {
    const { orgEmail, orgName, adminName, adminEmail, plan } = req.body;
    
    if (!orgEmail || !orgName || !adminName || !adminEmail) {
      return res.status(400).json({ 
        message: 'orgEmail, orgName, adminName, and adminEmail are required'
      });
    }

    console.log(`\n📧 Testing organization email to: ${orgEmail}`);
    console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '***SET***' : '❌ NOT SET'}`);
    
    const result = await sendOrgWelcomeEmail(orgEmail, orgName, adminName, adminEmail, plan || 'free');

    res.json({
      success: result,
      message: result 
        ? `✅ Test org email sent successfully to ${orgEmail}`
        : `❌ Failed to send org email. Check server logs.`,
      emailSystemStatus: {
        emailUserConfigured: !!process.env.EMAIL_USER,
        emailPasswordConfigured: !!process.env.EMAIL_PASSWORD,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('❌ Error in test-org-email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test organization email',
      error: error.message,
      emailSystemStatus: {
        emailUserConfigured: !!process.env.EMAIL_USER,
        emailPasswordConfigured: !!process.env.EMAIL_PASSWORD,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
});

// Check email configuration
router.get('/email-config-status', (req, res) => {
  const emailUserSet = !!process.env.EMAIL_USER;
  const emailPasswordSet = !!process.env.EMAIL_PASSWORD;
  
  res.json({
    status: emailUserSet && emailPasswordSet ? '✅ OK' : '❌ INCOMPLETE',
    emailUserConfigured: emailUserSet,
    emailPasswordConfigured: emailPasswordSet,
    emailUser: emailUserSet ? process.env.EMAIL_USER : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    message: !emailUserSet || !emailPasswordSet 
      ? '⚠️ Email environment variables are not configured. Please set EMAIL_USER and EMAIL_PASSWORD.'
      : '✅ Email configuration looks good'
  });
});

module.exports = router;
