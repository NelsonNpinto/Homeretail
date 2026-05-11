const router = require('express').Router();
const { checkIn, checkOut, status, history } = require('../controllers/attendanceController');
const protect = require('../middleware/auth');

router.use(protect);
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/status', status);
router.get('/history', history);

module.exports = router;
