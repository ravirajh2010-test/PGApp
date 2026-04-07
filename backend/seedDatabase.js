const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://pgstay_user:GeciW9JMFkveJIGIGFQk9co0vVOeXwXx@dpg-d79uc295pdvs73bpn5t0-a/pgstay_prod_7iuu'
});

(async () => {
  try {
    console.log('🌱 Seeding database...');

    // 1. Create super admin user
    const hashedPassword = await bcrypt.hash('superadmin123', 10);
    
    const userResult = await pool.query(`
      INSERT INTO users (email, password, name, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
      RETURNING id, email, name, role;
    `, ['superadmin@pgstay.com', hashedPassword, 'Super Admin', 'super_admin', 'active']);

    console.log('✅ Super admin user:', userResult.rows[0]);

    // 2. Create default organization
    const orgResult = await pool.query(`
      INSERT INTO organizations (name, slug, email, phone, status, plan, max_properties, max_beds, max_users, database_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, slug;
    `, [
      'Default Organization',
      'default-org',
      'admin@org.com',
      '+91-9999999999',
      'active',
      'pro',
      999,
      9999,
      99,
      'pgstay_prod'
    ]);

    console.log('✅ Organization created:', orgResult.rows[0]);

    // 3. Map user to organization
    await pool.query(`
      INSERT INTO user_org_map (user_id, org_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING;
    `, [userResult.rows[0].id, orgResult.rows[0].id, 'super_admin']);

    console.log('✅ User mapped to organization');

    console.log('\n✅ Database seeded successfully!');
    console.log(`   - Email: superadmin@pgstay.com`);
    console.log(`   - Password: superadmin123`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    pool.end();
  }
})();
