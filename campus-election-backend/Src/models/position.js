const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }] // Add this line
}, { timestamps: true });

module.exports = mongoose.model('Position', positionSchema);
