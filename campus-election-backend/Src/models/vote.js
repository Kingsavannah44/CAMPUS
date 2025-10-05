const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  voter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  position: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', required: true }
}, { timestamps: true });

// Ensure one vote per user per position per election
voteSchema.index({ voter: 1, position: 1, election: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
