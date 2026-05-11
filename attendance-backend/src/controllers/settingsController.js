const User = require('../models/User');

exports.getGeofence = (req, res) => {
  res.json({ geofence: req.user.geofence });
};

exports.updateGeofence = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.body;
    if (!latitude || !longitude)
      return res.status(400).json({ message: 'Latitude and longitude required' });
    if (radius && (radius < 50 || radius > 5000))
      return res.status(400).json({ message: 'Radius must be 50–5000 meters' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { geofence: { latitude, longitude, radius: radius || 100 } },
      { new: true }
    ).select('-password');

    res.json({ geofence: user.geofence });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
