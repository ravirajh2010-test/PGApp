const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
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
    const user = await require('../models/User').findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getStayDetails = async (req, res) => {
  try {
    const tenant = await Tenant.findByUserId(req.user.id);
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getPayments = async (req, res) => {
  try {
    const tenant = await Tenant.findByUserId(req.user.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    const payments = await Payment.findByTenantId(tenant.id);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createPaymentOrder = async (req, res) => {
  try {
    if (!razorpay) return res.status(503).json({ message: 'Payment gateway not configured for this plan' });
    const tenant = await Tenant.findByUserId(req.user.id);
    const amount = tenant.rent * 100;
    const options = {
      amount,
      currency: 'INR',
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
    const tenant = await Tenant.findByUserId(req.user.id);
    const payment = await Payment.create(tenant.id, tenant.rent, 'completed', razorpay_payment_id, req.orgId);
    res.json({ message: 'Payment verified', payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getProfile, getStayDetails, getPayments, createPaymentOrder, verifyPayment };