const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    checkInLocation: { latitude: Number, longitude: Number },
    checkOutLocation: { latitude: Number, longitude: Number },
    date: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, enum: ['present', 'partial', 'absent'], default: 'absent' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
