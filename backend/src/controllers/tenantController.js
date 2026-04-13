const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Organization = require('../models/Organization');
const Razorpay = require('razorpay');

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
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

const createPaymentOrder = async (req, res) => {
  try {
    if (!razorpay) return res.status(503).json({ message: 'Payment gateway not configured for this plan' });
    const tenant = await Tenant.findByUserId(req.pool, req.user.id);
    const amount = tenant.rent * 100;
    const options = {
      amount,
      currency: 'GBP',
      receipt: `receipt_${tenant.id}`,
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const tenant = await Tenant.findByUserId(req.pool, req.user.id);
    const user = await require('../models/User').findById(req.pool, req.user.id);
    
    // Payment is for the previous month by default
    const now = new Date();
    let payMonth = now.getMonth() - 1;
    let payYear = now.getFullYear();
    if (payMonth < 0) { payMonth = 11; payYear -= 1; }
    
    // DB stores 1-based months (1=Jan, 2=Feb, ..., 12=Dec)
    const dbMonth = payMonth + 1;
    
    const payment = await Payment.create(req.pool, {
      tenantId: tenant.id,
      tenantName: user.name,
      email: tenant.email,
      phone: tenant.phone || null,
      amount: tenant.rent,
      status: 'completed',
      paymentMonth: dbMonth,
      paymentYear: payYear,
      razorpayPaymentId: razorpay_payment_id
    });
    res.json({ message: 'Payment verified', payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAdminContact = async (req, res) => {
  try {
    // Get admin user(s) from org database
    const adminResult = await req.pool.query(
      "SELECT name, email FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1"
    );
    const admin = adminResult.rows[0] || null;

    // Get org info (email, phone) from master DB
    const org = await Organization.findById(req.orgId);

    res.json({
      adminName: admin ? admin.name : 'N/A',
      adminEmail: admin ? admin.email : (org ? org.email : 'N/A'),
      orgPhone: org ? org.phone : 'N/A',
      orgName: org ? org.name : 'N/A',
    });
  } catch (error) {
    console.error('Error fetching admin contact:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getProfile, getStayDetails, getPayments, createPaymentOrder, verifyPayment, getAdminContact };