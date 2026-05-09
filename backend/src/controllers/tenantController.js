const crypto = require('crypto');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Organization = require('../models/Organization');
const Razorpay = require('razorpay');
const { logRequestAudit } = require('../services/auditService');

const RENT_MODES = ['offline_only', 'online_only', 'both'];

function getOrgRazorpayCredentials(org) {
  const keyId = (org.razorpay_key_id && String(org.razorpay_key_id).trim()) || process.env.RAZORPAY_KEY_ID;
  const keySecret =
    (org.razorpay_key_secret && String(org.razorpay_key_secret).trim()) || process.env.RAZORPAY_KEY_SECRET;
  return { keyId, keySecret };
}

function createRazorpayInstance(org) {
  const { keyId, keySecret } = getOrgRazorpayCredentials(org);
  if (!keyId || !keySecret) return null;
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function rentPaymentMode(org) {
  const mode = org.rent_payment_mode || 'both';
  return RENT_MODES.includes(mode) ? mode : 'both';
}

/** Online rent payment allowed by org policy + credentials present */
function rentOnlineConfigured(org) {
  const mode = rentPaymentMode(org);
  if (mode === 'offline_only') return false;
  const { keyId, keySecret } = getOrgRazorpayCredentials(org);
  return !!(keyId && keySecret);
}

function rentOfflineShown(org) {
  const mode = rentPaymentMode(org);
  if (mode === 'online_only') return false;
  return true;
}

function verifyRazorpaySignature(orderId, paymentId, signature, keySecret) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
  return expected === signature;
}

const getProfile = async (req, res) => {
  try {
    const user = await require('../models/User').findById(req.pool, req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getStayDetails = async (req, res) => {
  try {
    const tenant = await Tenant.findByUserId(req.pool, req.user.id);
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getPayments = async (req, res) => {
  try {
    const tenant = await Tenant.findByUserId(req.pool, req.user.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    const payments = await Payment.findByTenantId(req.pool, tenant.id);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * What tenants see for rent: mode + whether online checkout can open (org keys + policy).
 */
const getRentPaymentSettings = async (req, res) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const mode = rentPaymentMode(org);
    const onlineConfigured = rentOnlineConfigured(org);
    const offlineShown = rentOfflineShown(org);

    let onlinePaymentAvailable = false;
    if (mode === 'online_only' || mode === 'both') {
      onlinePaymentAvailable = onlineConfigured;
    }

    let offlinePaymentAvailable = false;
    if (mode === 'offline_only' || mode === 'both') {
      offlinePaymentAvailable = offlineShown;
    }

    const { keyId } = getOrgRazorpayCredentials(org);

    res.json({
      rentPaymentMode: mode,
      onlinePaymentAvailable,
      offlinePaymentAvailable,
      razorpayKeyId: onlinePaymentAvailable ? keyId : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createPaymentOrder = async (req, res) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    if (!rentOnlineConfigured(org)) {
      return res.status(503).json({
        message:
          'Online rent payment is not available. Your organization may require offline payment only, or Razorpay is not configured yet.',
      });
    }

    const rp = createRazorpayInstance(org);
    if (!rp) {
      return res.status(503).json({ message: 'Payment gateway credentials are not configured.' });
    }

    const tenant = await Tenant.findByUserId(req.pool, req.user.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const amountPaise = Math.round(Number(tenant.rent) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      return res.status(400).json({ message: 'Invalid rent amount.' });
    }

    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `rent_${tenant.id}_${Date.now()}`,
    };

    const order = await rp.orders.create(options);
    const { keyId } = getOrgRazorpayCredentials(org);

    res.json({
      ...order,
      key_id: keyId,
    });
  } catch (error) {
    console.error('[tenant/pay]', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification fields.' });
    }

    const org = await Organization.findById(req.orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const { keySecret } = getOrgRazorpayCredentials(org);
    if (!keySecret) {
      return res.status(503).json({ message: 'Payment gateway not configured.' });
    }

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret)) {
      return res.status(400).json({ message: 'Invalid payment signature.' });
    }

    const tenant = await Tenant.findByUserId(req.pool, req.user.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const user = await require('../models/User').findById(req.pool, req.user.id);

    const now = new Date();
    let payMonth = now.getMonth() - 1;
    let payYear = now.getFullYear();
    if (payMonth < 0) {
      payMonth = 11;
      payYear -= 1;
    }

    const dbMonth = payMonth + 1;

    const existing = await Payment.findExisting(req.pool, tenant.id, dbMonth, payYear);
    if (existing) {
      return res.status(409).json({ message: 'Rent for this period is already recorded.' });
    }

    const payment = await Payment.create(req.pool, {
      tenantId: tenant.id,
      tenantName: user.name,
      email: tenant.email,
      phone: tenant.phone || null,
      amount: tenant.rent,
      status: 'completed',
      paymentMonth: dbMonth,
      paymentYear: payYear,
      razorpayPaymentId: razorpay_payment_id,
    });

    await logRequestAudit(req, {
      action: 'PAYMENT_COMPLETED',
      entityType: 'payment',
      entityId: payment.id,
      details: {
        amount: tenant.rent,
        paymentMonth: dbMonth,
        paymentYear: payYear,
        reference: razorpay_payment_id,
      },
    });
    res.json({ message: 'Payment verified', payment });
  } catch (error) {
    console.error('[tenant/verify-payment]', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Rent for this period is already recorded.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await req.pool.query(
      `SELECT al.*, u.name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.user_id = $1
       ORDER BY al.created_at DESC
       LIMIT 30`,
      [req.user.id]
    );
    res.json(logs.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAdminContact = async (req, res) => {
  try {
    const adminResult = await req.pool.query(
      "SELECT name, email FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1"
    );
    const admin = adminResult.rows[0] || null;

    const org = await Organization.findById(req.orgId);

    res.json({
      adminName: admin ? admin.name : 'N/A',
      adminEmail: admin ? admin.email : org ? org.email : 'N/A',
      orgPhone: org ? org.phone : 'N/A',
      orgName: org ? org.name : 'N/A',
    });
  } catch (error) {
    console.error('Error fetching admin contact:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  getStayDetails,
  getPayments,
  getRentPaymentSettings,
  createPaymentOrder,
  verifyPayment,
  getAdminContact,
  getAuditLogs,
};
