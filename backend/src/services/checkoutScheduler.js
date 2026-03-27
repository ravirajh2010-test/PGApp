// This file sets up a scheduled job to process tenant checkouts daily
// It checks for tenants whose end_date is today and automatically:
// 1. Sends them a thank you email
// 2. Removes them from the system
// 3. Marks their bed as vacant

const cron = require('node-cron');
const { processTenantCheckouts } = require('./tenantCheckoutService');

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
      const result = await processTenantCheckouts();
      if (result.success) {
        console.log('[SCHEDULER] ✅ Checkout job completed successfully');
        console.log('[SCHEDULER] Results:', result);
      } else {
        console.error('[SCHEDULER] ❌ Checkout job encountered errors');
        console.error('[SCHEDULER] Error:', result.error);
      }
    } catch (error) {
      console.error('[SCHEDULER] ❌ Critical error in checkout job:', error.message);
    }
  });

  checkoutJobScheduled = true;
  console.log('[SCHEDULER] ✅ Tenant checkout job scheduled to run daily at 00:05');
  
  // Also provide manual trigger function
  return job;
};

module.exports = { scheduleCheckoutJob };
