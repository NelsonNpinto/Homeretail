const Attendance = require('../models/Attendance');

const today = () => new Date().toISOString().split('T')[0];

exports.checkIn = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const date = today();

    let record = await Attendance.findOne({ user: req.user._id, date });
    if (record?.checkIn) return res.status(400).json({ message: 'Already checked in today' });

    if (!record) record = new Attendance({ user: req.user._id, date });
    record.checkIn = new Date();
    record.checkInLocation = { latitude, longitude };
    record.status = 'present';
    await record.save();

    res.json({ message: 'Checked in', record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const date = today();

    const record = await Attendance.findOne({ user: req.user._id, date });
    if (!record?.checkIn) return res.status(400).json({ message: 'No check-in found for today' });
    if (record.checkOut) return res.status(400).json({ message: 'Already checked out today' });

    record.checkOut = new Date();
    record.checkOutLocation = { latitude, longitude };
    record.status = 'partial';
    await record.save();

    res.json({ message: 'Checked out', record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.status = async (req, res) => {
  try {
    const record = await Attendance.findOne({ user: req.user._id, date: today() });
    res.json({ record: record || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.history = async (req, res) => {
  try {
    const records = await Attendance.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(30);
    res.json({ records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
