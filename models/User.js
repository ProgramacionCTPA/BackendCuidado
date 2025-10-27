const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  birthdate: { type: Date, required: true },
  hasCompletedSurvey: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
