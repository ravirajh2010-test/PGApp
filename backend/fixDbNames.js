require('dotenv').config();
const pool = require('./src/config/database');

async function fix() {
  const fixes = [
    [1, 'pg_stay_org_1'],
    [3, 'pg_stay_org_3'],
    [4, 'pg_stay_org_4'],
    [5, 'pg_stay_org_5'],
    [6, 'pg_stay_org_6'],
    [7, 'pg_stay_org_7'],
    [8, 'pg_stay_sunshine_hostels'],
    [9, 'pg_stay_applestay'],
  ];

  for (const [id, dbName] of fixes) {
    await pool.query('UPDATE organizations SET database_name = $1 WHERE id = $2', [dbName, id]);
  }

  const r = await pool.query('SELECT id, name, database_name FROM organizations ORDER BY id');
  console.log(r.rows);
  process.exit(0);
}

fix();
