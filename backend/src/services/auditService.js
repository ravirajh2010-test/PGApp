const AuditLog = require('../models/AuditLog');
const dbManager = require('./DatabaseManager');

const getRequestIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

const logAudit = async (pool, {
  userId,
  action,
  entityType,
  entityId = null,
  details = null,
  ipAddress = null,
}) => {
  if (!pool || !userId || !action) return;

  try {
    await AuditLog.create(pool, userId, action, entityType, entityId, details, ipAddress);
  } catch (error) {
    console.error('[AUDIT] Failed to write audit log:', error.message);
  }
};

const logRequestAudit = async (req, payload) => logAudit(req.pool, {
  ...payload,
  userId: payload.userId || req.user?.id,
  ipAddress: payload.ipAddress || getRequestIp(req),
});

const logAuditByOrgId = async (orgId, payload) => {
  if (!orgId) return;
  try {
    const orgPool = await dbManager.getOrgPool(orgId);
    await logAudit(orgPool, payload);
  } catch (error) {
    console.error(`[AUDIT] Failed to resolve org pool ${orgId}:`, error.message);
  }
};

module.exports = {
  getRequestIp,
  logAudit,
  logRequestAudit,
  logAuditByOrgId,
};
