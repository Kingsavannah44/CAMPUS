const mongoose = require('mongoose');

// Models
const User = require('./user');
const Election = require('./election');
const Position = require('./position');
const Candidate = require('./candidate');
const Vote = require('./vote');

const db = {
  User,
  Election,
  Position,
  Candidate,
  Vote,
  mongoose,
  connect: mongoose.connect
};

module.exports = db;
