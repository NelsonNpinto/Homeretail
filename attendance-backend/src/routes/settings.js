const router = require('express').Router();
const { getGeofence, updateGeofence } = require('../controllers/settingsController');
const protect = require('../middleware/auth');

router.use(protect);
router.get('/geofence', getGeofence);
router.put('/geofence', updateGeofence);

module.exports = router;
