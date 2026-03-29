const pool = require('../config/database');

const checkTenantsDatabaseConsistency = async (req, res) => {
  try {
    const orgId = req.orgId;

    // All tenants (without relationship filters)
    const allTenants = await pool.query(
      'SELECT id, user_id, email, rent, bed_id, org_id FROM tenants WHERE org_id = $1 ORDER BY id',
      [orgId]
    );

    // Tenants with complete data (for UI display)
    const displayTenants = await pool.query(`
      SELECT t.id, t.user_id, t.email, t.rent, t.bed_id, t.org_id,
             u.name, b.bed_identifier, r.room_number, bl.name as building_name
      FROM tenants t 
      JOIN users u ON t.user_id = u.id 
      JOIN beds b ON t.bed_id = b.id 
      JOIN rooms r ON b.room_id = r.id 
      JOIN buildings bl ON r.building_id = bl.id 
      WHERE t.org_id = $1 
      ORDER BY t.id
    `, [orgId]);

    // Find orphaned tenants
    const orphaned = await pool.query(`
      SELECT t.id, t.email, t.user_id, t.bed_id,
             CASE WHEN u.id IS NULL THEN 'NO_USER' ELSE 'OK' END as user_status,
             CASE WHEN b.id IS NULL THEN 'NO_BED' ELSE 'OK' END as bed_status,
             CASE WHEN r.id IS NULL THEN 'NO_ROOM' ELSE 'OK' END as room_status,
             CASE WHEN bl.id IS NULL THEN 'NO_BUILDING' ELSE 'OK' END as building_status
      FROM tenants t 
      LEFT JOIN users u ON t.user_id = u.id 
      LEFT JOIN beds b ON t.bed_id = b.id 
      LEFT JOIN rooms r ON b.room_id = r.id 
      LEFT JOIN buildings bl ON r.building_id = bl.id 
      WHERE t.org_id = $1 AND (u.id IS NULL OR b.id IS NULL OR r.id IS NULL OR bl.id IS NULL)
      ORDER BY t.id
    `, [orgId]);

    res.json({
      organization: orgId,
      summary: {
        totalTenants: allTenants.rows.length,
        displayableTenants: displayTenants.rows.length,
        orphanedTenants: orphaned.rows.length,
        isConsistent: allTenants.rows.length === displayTenants.rows.length
      },
      allTenants: allTenants.rows,
      displayTenants: displayTenants.rows,
      orphanedTenants: orphaned.rows.length > 0 ? orphaned.rows : []
    });
  } catch (error) {
    console.error('Error checking consistency:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { checkTenantsDatabaseConsistency };
