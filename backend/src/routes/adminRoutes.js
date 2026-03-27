const express = require('express');
const { 
  getTenants, createTenant, updateTenant, deleteTenant, processCheckouts,
  getOccupancy, getAvailableBeds,
  getBuildings, createBuilding, updateBuilding, deleteBuilding,
  getRooms, createRoom, updateRoom, deleteRoom,
  getBeds, createBed, updateBed, deleteBed,
  getPaymentInfo, sendPaymentReminderEmail, markOfflinePay
} = require('../controllers/adminController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['admin']));

// Tenants routes
router.get('/tenants', getTenants);
router.post('/tenants', createTenant);
router.put('/tenants/:id', updateTenant);
router.delete('/tenants/:id', deleteTenant);

// Tenant checkout route
router.post('/process-checkouts', processCheckouts);

// Occupancy and availability
router.get('/occupancy', getOccupancy);
router.get('/available-beds', getAvailableBeds);

// Buildings routes
router.get('/buildings', getBuildings);
router.post('/buildings', createBuilding);
router.put('/buildings/:id', updateBuilding);
router.delete('/buildings/:id', deleteBuilding);

// Rooms routes
router.get('/rooms', getRooms);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

// Beds routes
router.get('/beds', getBeds);
router.post('/beds', createBed);
router.put('/beds/:id', updateBed);
router.delete('/beds/:id', deleteBed);

// Payment info routes
router.get('/payment-info', getPaymentInfo);
router.post('/payment-reminder/:tenantId', sendPaymentReminderEmail);
router.post('/mark-offline-pay/:tenantId', markOfflinePay);

module.exports = router;