const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  voter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidateName: { type: String, required: true, trim: true },
  position: { type: String, required: true, trim: true },
  electionId: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure one vote per user per position
voteSchema.index({ voter: 1, position: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
