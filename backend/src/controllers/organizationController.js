const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const getMyOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    
    const stats = await Organization.getStats(req.orgId);
    const subscription = await Subscription.findByOrgId(req.orgId);
    const limits = await Organization.getPlanLimits(org.plan);
    
    res.json({ ...org, stats, subscription, limits });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateMyOrganization = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const org = await Organization.update(req.orgId, { name, email, phone, address });
    res.json(org);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByOrgId(req.orgId);
    const org = await Organization.findById(req.orgId);
    const limits = await Organization.getPlanLimits(org.plan);
    const allPlans = await Organization.getAllPlanLimits();
    
    res.json({ subscription, currentPlan: org.plan, limits, availablePlans: allPlans });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findByOrgId(req.orgId);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.findAll(req.pool);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyUsers = async (req, res) => {
  try {
    const users = await User.findAll(req.pool);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getMyOrganization, updateMyOrganization, getMySubscription, getMyInvoices, getMyAuditLogs, getMyUsers };
