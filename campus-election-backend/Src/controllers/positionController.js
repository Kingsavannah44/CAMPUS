const db = require('../models/index-new');

exports.create = async (req, res) => {
  const { title, description, electionId } = req.body;
  try {
    const position = new db.Position({ title, election: electionId });
    await position.save();
    res.status(201).json(position);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const positions = await db.Position.find().populate('election').populate('candidates');
    const positionsWithCandidateCount = positions.map(position => ({
      ...position.toObject(),
      candidateCount: position.candidates.length
    }));
    res.json(positionsWithCandidateCount);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const position = await db.Position.findById(req.params.id).populate('candidates');
    if (!position) return res.status(404).json({ message: 'Not found' });
    res.json(position);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
