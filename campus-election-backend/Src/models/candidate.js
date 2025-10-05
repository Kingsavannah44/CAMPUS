const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  manifesto: { type: String },
  bio: { type: String },
  photo: { type: String },
  position: { type: mongoose.Schema.Types.ObjectId, ref: 'Position' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Candidate', candidateSchema);
