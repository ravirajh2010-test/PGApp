const express = require('express');
const { getBuildings, getRooms, getVacancies, getOccupancy } = require('../controllers/guestController');

const router = express.Router();

router.get('/buildings', getBuildings);
router.get('/rooms/:buildingId', getRooms);
router.get('/vacancies/:roomId', getVacancies);
router.get('/occupancy', getOccupancy);

module.exports = router;