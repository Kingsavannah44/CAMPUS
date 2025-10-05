const db = require('../models/index-new');

exports.createElection = async (req, res) => {
  try {
    const { title, description, startAt, endAt } = req.body;
    const election = new db.Election({ name: title, description, startDate: startAt, endDate: endAt });
    await election.save();
    res.status(201).json(election);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const elections = await db.Election.find().populate({
      path: 'positions',
      populate: {
        path: 'candidates'
      }
    });
    res.json(elections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const election = await db.Election.findById(req.params.id).populate({
      path: 'positions',
      populate: {
        path: 'candidates'
      }
    });
    if (!election) return res.status(404).json({ message: 'Not found' });
    res.json(election);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.activate = async (req, res) => {
  try {
    const election = await db.Election.findById(req.params.id);
    if (!election) return res.status(404).json({ message: 'Not found' });
    // Add isActive field if needed, or handle activation logic
    res.json(election);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deactivate = async (req, res) => {
  try {
    const election = await db.Election.findById(req.params.id);
    if (!election) return res.status(404).json({ message: 'Not found' });
    // Handle deactivation logic
    res.json(election);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
