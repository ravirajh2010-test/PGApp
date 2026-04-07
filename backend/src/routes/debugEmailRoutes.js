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
  const resendKeySet = !!process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'PG Stay <onboarding@resend.dev>';
  
  const provider = resendKeySet ? 'resend' : (emailUserSet && emailPasswordSet ? 'smtp' : 'none');
  
  res.json({
    status: provider !== 'none' ? '✅ OK' : '❌ INCOMPLETE',
    activeProvider: provider,
    resendConfigured: resendKeySet,
    resendFromEmail: resendKeySet ? resendFromEmail : 'N/A',
    emailUserConfigured: emailUserSet,
    emailPasswordConfigured: emailPasswordSet,
    emailUser: emailUserSet ? process.env.EMAIL_USER : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    message: provider === 'resend' 
      ? '✅ Using Resend HTTP API for emails'
      : provider === 'smtp'
      ? '✅ Using Gmail SMTP for emails (may not work on Railway)'
      : '⚠️ No email provider configured. Set RESEND_API_KEY or EMAIL_USER/EMAIL_PASSWORD.'
  });
});

// Verify SMTP connection (with timeout)
router.get('/verify-smtp', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return res.json({ success: false, error: 'EMAIL_USER or EMAIL_PASSWORD not set' });
    }

    const testTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: { rejectUnauthorized: false }
    });

    // Race between verify and a 12s timeout
    const verifyPromise = testTransporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SMTP connection timed out after 12s - port 587 may be blocked')), 12000)
    );

    await Promise.race([verifyPromise, timeoutPromise]);
    testTransporter.close();
    
    res.json({ success: true, message: '✅ SMTP connection to Gmail verified successfully' });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      hint: error.message.includes('timed out') 
        ? 'Railway may be blocking outbound SMTP. Consider using an email API service (SendGrid, Resend, etc.)' 
        : 'Check your EMAIL_PASSWORD (Gmail app password)'
    });
  }
});

module.exports = router;
