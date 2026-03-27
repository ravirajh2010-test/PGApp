const Building = require('../models/Building');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const pool = require('../config/database');

const getBuildings = async (req, res) => {
  try {
    const buildings = await Building.findAll();
    res.json(buildings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getRooms = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const rooms = await Room.findByBuilding(buildingId);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getVacancies = async (req, res) => {
  try {
    const { roomId } = req.params;
    const beds = await Bed.findVacantByRoom(roomId);
    res.json(beds);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getOccupancy = async (req, res) => {
  try {
    const query = 'SELECT COUNT(*) as occupied FROM beds WHERE status = $1';
    const result = await pool.query(query, ['occupied']);
    const totalQuery = 'SELECT COUNT(*) as total FROM beds';
    const totalResult = await pool.query(totalQuery);
    res.json({ occupied: result.rows[0].occupied, total: totalResult.rows[0].total });
  } catch (error) {
    console.error('Error fetching occupancy:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getBuildings, getRooms, getVacancies, getOccupancy };