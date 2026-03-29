const Building = require('../models/Building');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const pool = require('../config/database');

const getBuildings = async (req, res) => {
  try {
    const buildings = await Building.findAll(req.orgId);
    res.json(buildings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getRooms = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const rooms = await Room.findByBuilding(buildingId, req.orgId);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getVacancies = async (req, res) => {
  try {
    const { roomId } = req.params;
    const beds = await Bed.findVacantByRoom(roomId, req.orgId);
    res.json(beds);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getOccupancy = async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) as occupied FROM beds WHERE status = 'occupied' AND org_id = $1", [req.orgId]);
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM beds WHERE org_id = $1', [req.orgId]);
    res.json({ occupied: result.rows[0].occupied, total: totalResult.rows[0].total });
  } catch (error) {
    console.error('Error fetching occupancy:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getBuildings, getRooms, getVacancies, getOccupancy };