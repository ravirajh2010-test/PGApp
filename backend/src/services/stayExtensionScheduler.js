// This file sets up a scheduled job to send stay extension reminders
// It runs daily at 5 PM IST (11:30 UTC) and checks for tenants
// whose end_date is 3 days from now, reminding them to contact
// the admin to extend their stay and avoid bed release.

const cron = require('node-cron');
const dbManager = require('./DatabaseManager');
const { sendStayExtensionReminder } = require('./emailService');

let reminderJobScheduled = false;

const scheduleStayExtensionReminder = () => {
  if (reminderJobScheduled) {
    console.log('[REMINDER] Stay extension reminder job already scheduled');
    return;
  }

  // Schedule job to run every day at 11:30 UTC = 5:00 PM IST
  const job = cron.schedule('30 11 * * *', async () => {
    console.log('[REMINDER] Running stay extension reminder at', new Date().toISOString());
    try {
      const orgPools = await dbManager.getAllOrgPools();
      const masterPool = dbManager.getMasterPool();

      for (const { orgId, pool } of orgPools) {
        try {
          await processStayExtensionReminders(pool, orgId, masterPool);
        } catch (error) {
          console.error(`[REMINDER] Error processing org ${orgId}:`, error.message);
        }
      }
      console.log('[REMINDER] ✅ Stay extension reminder job completed');
    } catch (error) {
      console.error('[REMINDER] ❌ Critical error in reminder job:', error.message);
    }
  });

  reminderJobScheduled = true;
  console.log('[REMINDER] ✅ Stay extension reminder scheduled to run daily at 5:00 PM IST (11:30 UTC)');

  return job;
};

const processStayExtensionReminders = async (orgPool, orgId, masterPool) => {
  // Get org name for branding
  let orgName = 'PG Stay';
  try {
    const orgResult = await masterPool.query(
      'SELECT name FROM organizations WHERE id = $1', [orgId]
    );
    if (orgResult.rows.length > 0) {
      orgName = orgResult.rows[0].name;
    }
  } catch (err) {
    console.error(`[REMINDER] Could not fetch org name for org ${orgId}:`, err.message);
  }

  // Find tenants whose end_date is exactly 3 days from now
  const query = `
    SELECT t.id, t.email, t.end_date, u.name,
           b.bed_identifier, r.room_number,
           bl.name as building_name
    FROM tenants t
    JOIN users u ON t.user_id = u.id
    JOIN beds b ON t.bed_id = b.id
    JOIN rooms r ON b.room_id = r.id
    JOIN buildings bl ON r.building_id = bl.id
    WHERE DATE(t.end_date) = CURRENT_DATE + INTERVAL '3 days'
    ORDER BY bl.name, r.room_number
  `;

  const result = await orgPool.query(query);
  const tenants = result.rows;

  if (tenants.length === 0) {
    return;
  }

  console.log(`[REMINDER] Org ${orgId} (${orgName}): Found ${tenants.length} tenant(s) ending in 3 days`);

  for (const tenant of tenants) {
    try {
      const bedInfo = `${tenant.building_name} - Room ${tenant.room_number}, Bed ${tenant.bed_identifier}`;
      await sendStayExtensionReminder(tenant.email, tenant.name, bedInfo, tenant.end_date, orgName);
    } catch (error) {
      console.error(`[REMINDER] Failed to send reminder to ${tenant.email}:`, error.message);
    }
  }
};

module.exports = { scheduleStayExtensionReminder };
