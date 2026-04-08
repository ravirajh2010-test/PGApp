const express = require('express');
const { 
  getTenants, createTenant, updateTenant, deleteTenant, processCheckouts,
  getOccupancy, getAvailableBeds, getFloorLayout, getFloorLayoutWithBeds,
  getBuildings, createBuilding, updateBuilding, deleteBuilding,
  getRooms, createRoom, updateRoom, deleteRoom,
  getBeds, createBed, updateBed, deleteBed,
  getPaymentInfo, sendPaymentReminderEmail, markOfflinePay,
  searchTenants, getTenantPaymentHistory, deactivateUser
} = require('../controllers/adminController');
const { checkTenantsDatabaseConsistency } = require('../controllers/debugController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { tenantIsolation, checkPlanLimits } = require('../middleware/tenantIsolation');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['admin']));
router.use(tenantIsolation);

// Tenants routes
router.get('/tenants', getTenants);
router.post('/tenants', checkPlanLimits('user'), createTenant);
router.put('/tenants/:id', updateTenant);
router.delete('/tenants/:id', deleteTenant);

router.post('/process-checkouts', processCheckouts);

router.get('/occupancy', getOccupancy);
router.get('/available-beds', getAvailableBeds);
router.get('/floor-layout', getFloorLayout);
router.get('/floor-layout-beds', getFloorLayoutWithBeds);

// Buildings routes
router.get('/buildings', getBuildings);
router.post('/buildings', checkPlanLimits('building'), createBuilding);
router.put('/buildings/:id', updateBuilding);
router.delete('/buildings/:id', deleteBuilding);

// Rooms routes
router.get('/rooms', getRooms);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

// Beds routes
router.get('/beds', getBeds);
router.post('/beds', checkPlanLimits('bed'), createBed);
router.put('/beds/:id', updateBed);
router.delete('/beds/:id', deleteBed);

// Payment info routes
router.get('/payment-info', getPaymentInfo);
router.post('/payment-reminder/:tenantId', sendPaymentReminderEmail);
router.post('/mark-offline-pay/:tenantId', markOfflinePay);
router.get('/search-tenants', searchTenants);
router.get('/tenant-payment-history/:tenantId', getTenantPaymentHistory);

// User management routes
router.post('/deactivate-user/:userId', deactivateUser);

// Debug/Verification routes
router.get('/debug/tenants-consistency', checkTenantsDatabaseConsistency);

module.exports = router;