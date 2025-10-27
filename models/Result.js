const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  score: Number,
  level: String,
  recommendation: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Result', resultSchema);
