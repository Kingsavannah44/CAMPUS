const db = require('../models/index-new');

// Cast a vote: ensures one vote per user per position per election
exports.cast = async (req, res) => {
  try {
    const { candidateId, positionId, electionId } = req.body;
    const userId = req.user.id;

    // Check if user has already voted for this position
    const existingVote = await db.Vote.findOne({ user: userId, position: positionId });
    if (existingVote) {
      return res.status(409).json({ message: 'You have already voted for this position' });
    }

    // Check if candidate exists and belongs to the position
    const candidate = await db.Candidate.findById(candidateId);
    if (!candidate || candidate.position.toString() !== positionId) {
      return res.status(400).json({ message: 'Invalid candidate for position' });
    }

    const vote = new db.Vote({
      user: userId,
      candidate: candidateId,
      position: positionId
    });

    await vote.save();
    res.status(201).json(vote);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.results = async (req, res) => {
  try {
    const { electionId } = req.params;

    // Get all positions for the election
    const positions = await db.Position.find({ election: electionId });

    // Get vote counts for each candidate
    const results = [];
    for (const position of positions) {
      const candidates = await db.Candidate.find({ position: position._id });

      for (const candidate of candidates) {
        const voteCount = await db.Vote.countDocuments({ candidate: candidate._id });
        results.push({
          candidateId: candidate._id,
          candidateName: candidate.name,
          positionId: position._id,
          positionTitle: position.title,
          votes: voteCount
        });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
