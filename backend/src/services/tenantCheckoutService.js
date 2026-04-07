const Tenant = require('../models/Tenant');
const Bed = require('../models/Bed');
const { sendThankYouEmail } = require('./emailService');

const processTenantCheckouts = async (orgPool, orgId) => {
  try {
    console.log(`[CHECKOUT] Processing tenant checkouts for org ${orgId || 'unknown'}...`);
    
    // Find all tenants whose end_date is today
    const today = new Date().toISOString().split('T')[0]; // Get date in YYYY-MM-DD format
    
    const query = `
      SELECT t.id, t.email, t.bed_id, u.name, 
             b.bed_identifier, r.room_number, r.building_id, 
             bl.name as building_name, t.start_date, t.end_date
      FROM tenants t 
      JOIN users u ON t.user_id = u.id 
      JOIN beds b ON t.bed_id = b.id 
      JOIN rooms r ON b.room_id = r.id 
      JOIN buildings bl ON r.building_id = bl.id
      WHERE DATE(t.end_date) = $1
      ORDER BY bl.name, r.room_number
    `;
    
    const result = await orgPool.query(query, [today]);
    const tenantsToCheckout = result.rows;
    
    if (tenantsToCheckout.length === 0) {
      console.log('[CHECKOUT] ℹ️  No tenants to checkout today');
      return { success: true, checkouts: 0, message: 'No tenants to checkout today' };
    }
    
    console.log(`[CHECKOUT] Found ${tenantsToCheckout.length} tenant(s) to checkout`);
    
    let successCount = 0;
    let failureCount = 0;
    const results = [];
    
    for (const tenant of tenantsToCheckout) {
      try {
        console.log(`[CHECKOUT] Processing checkout for ${tenant.name} (${tenant.email})...`);
        
        // Calculate stay duration
        const startDate = new Date(tenant.start_date);
        const endDate = new Date(tenant.end_date);
        const durationMs = endDate - startDate;
        const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
        const stayDuration = `${durationDays} days (${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()})`;
        
        // Prepare bed info
        const bedInfo = `${tenant.building_name} - Room ${tenant.room_number}, Bed ${tenant.bed_identifier}`;
        
        // Step 1: Send thank you email in background (don't block checkout)
        console.log(`[CHECKOUT] Sending thank you email to ${tenant.email}...`);
        sendThankYouEmail(tenant.email, tenant.name, bedInfo, stayDuration)
          .then(sent => console.log(sent ? `[CHECKOUT] ✅ Email sent to ${tenant.email}` : `[CHECKOUT] ⚠️ Email failed for ${tenant.email}`))
          .catch(err => console.error(`[CHECKOUT] ❌ Email error:`, err.message));
        
        // Step 2: Update bed status to vacant
        console.log(`[CHECKOUT] Updating bed ${tenant.bed_identifier} to vacant...`);
        await Bed.updateStatus(orgPool, tenant.bed_id, 'vacant');
        
        // Step 3: Delete payments and tenant
        console.log(`[CHECKOUT] Deleting tenant record for ${tenant.name}...`);
        await orgPool.query('DELETE FROM payments WHERE tenant_id = $1', [tenant.id]);
        await Tenant.delete(orgPool, tenant.id);
        
        console.log(`[CHECKOUT] ✅ Successfully checked out ${tenant.name}`);
        successCount++;
        
        results.push({
          tenantName: tenant.name,
          email: tenant.email,
          bedInfo: bedInfo,
          status: 'success'
        });
        
      } catch (error) {
        console.error(`[CHECKOUT] ❌ Error processing checkout for ${tenant.name}:`, error.message);
        failureCount++;
        
        results.push({
          tenantName: tenant.name,
          email: tenant.email,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    console.log(`[CHECKOUT] Checkout complete: ${successCount} successful, ${failureCount} failed`);
    
    return {
      success: failureCount === 0,
      checkouts: successCount,
      failures: failureCount,
      message: `${successCount} tenant(s) checked out successfully`,
      results
    };
    
  } catch (error) {
    console.error('[CHECKOUT] Critical error in processTenantCheckouts:', error.message);
    return {
      success: false,
      checkouts: 0,
      error: error.message
    };
  }
};

module.exports = { processTenantCheckouts };
