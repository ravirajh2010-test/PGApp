const express = require('express');
const { getBuildings, getRooms, getVacancies, getOccupancy } = require('../controllers/guestController');
const pool = require('../config/database');

const router = express.Router();

// Guest routes need org context from slug in URL
const resolveOrgFromSlug = async (req, res, next) => {
  const { orgSlug } = req.params;
  if (!orgSlug) return res.status(400).json({ message: 'Organization slug required' });
  
  try {
    const result = await pool.query('SELECT id, status FROM organizations WHERE slug = $1', [orgSlug]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Organization not found' });
    if (result.rows[0].status !== 'active') return res.status(403).json({ message: 'Organization is not active' });
    req.orgId = result.rows[0].id;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/:orgSlug/buildings', resolveOrgFromSlug, getBuildings);
router.get('/:orgSlug/rooms/:buildingId', resolveOrgFromSlug, getRooms);
router.get('/:orgSlug/vacancies/:roomId', resolveOrgFromSlug, getVacancies);
router.get('/:orgSlug/occupancy', resolveOrgFromSlug, getOccupancy);

module.exports = router;