// This file sets up a scheduled job to process tenant checkouts daily
// It checks for tenants whose end_date is today and automatically:
// 1. Sends them a thank you email
// 2. Removes them from the system
// 3. Marks their bed as vacant

const cron = require('node-cron');
const { processTenantCheckouts } = require('./tenantCheckoutService');
const dbManager = require('./DatabaseManager');

let checkoutJobScheduled = false;

const scheduleCheckoutJob = () => {
  if (checkoutJobScheduled) {
    console.log('[SCHEDULER] Checkout job already scheduled');
    return;
  }

  // Schedule job to run every day at 00:05 (5 minutes after midnight)
  const job = cron.schedule('5 0 * * *', async () => {
    console.log('[SCHEDULER] Running scheduled tenant checkout at', new Date().toISOString());
    try {
      const orgPools = await dbManager.getAllOrgPools();
      for (const { orgId, pool } of orgPools) {
        try {
          const result = await processTenantCheckouts(pool, orgId);
          if (result.checkouts > 0) {
            console.log(`[SCHEDULER] Org ${orgId}: ${result.message}`);
          }
        } catch (error) {
          console.error(`[SCHEDULER] Error processing org ${orgId}:`, error.message);
        }
      }
      console.log('[SCHEDULER] ✅ Checkout job completed');
    } catch (error) {
      console.error('[SCHEDULER] ❌ Critical error in checkout job:', error.message);
    }
  });

  checkoutJobScheduled = true;
  console.log('[SCHEDULER] ✅ Tenant checkout job scheduled to run daily at 00:05');
  
  return job;
};

module.exports = { scheduleCheckoutJob };
