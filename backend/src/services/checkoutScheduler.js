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

  // Schedule job to run every day at 14:30 UTC = 8:00 PM IST
  const job = cron.schedule('30 14 * * *', async () => {
    console.log('[SCHEDULER] Running scheduled tenant checkout at', new Date().toISOString());
    try {
      const orgPools = await dbManager.getAllOrgPools();
      const masterPool = dbManager.getMasterPool();
      for (const { orgId, pool } of orgPools) {
        try {
          // Fetch org name for email branding
          let orgName = 'PG Stay';
          try {
            const orgResult = await masterPool.query(
              'SELECT name FROM organizations WHERE id = $1', [orgId]
            );
            if (orgResult.rows.length > 0) {
              orgName = orgResult.rows[0].name;
            }
          } catch (err) {
            console.error(`[SCHEDULER] Could not fetch org name for org ${orgId}:`, err.message);
          }

          const result = await processTenantCheckouts(pool, orgId, orgName);
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
  console.log('[SCHEDULER] ✅ Tenant checkout job scheduled to run daily at 8:00 PM IST (14:30 UTC)');
  
  return job;
};

module.exports = { scheduleCheckoutJob };
