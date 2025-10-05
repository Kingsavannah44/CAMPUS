const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireVoter } = require('../middlewares/auth');
const Vote = require('../models/vote');
const Candidate = require('../models/candidate');

// Get all votes (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const votes = await Vote.find()
            .populate('voter')
            .populate('candidate')
            .populate('election')
            .populate('position');
            
        res.json({
            success: true,
            data: votes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching votes: ' + error.message
        });
    }
});

// Cast a vote (voter only)
router.post('/', authenticateToken, requireVoter, async (req, res) => {
    try {
        const { candidate, election } = req.body;

        // Find the candidate to get the position
        const candidateDoc = await Candidate.findById(candidate);
        if (!candidateDoc) {
            return res.status(404).json({
                success: false,
                message: 'Candidate not found'
            });
        }

        const candidateId = candidate;
        const electionId = election;
        const positionId = candidateDoc.position;

        // Check if user has already voted for this position in this election
        const existingVote = await Vote.findOne({
            voter: req.user.id,
            election: electionId,
            position: positionId
        });

        if (existingVote) {
            return res.status(400).json({
                success: false,
                message: 'You have already voted for this position in this election'
            });
        }

        const vote = new Vote({
            voter: req.user.id,
            candidate: candidateId,
            election: electionId,
            position: positionId
        });

        await vote.save();
        await vote.populate('candidate');
        await vote.populate('election');
        await vote.populate('position');

        res.status(201).json({
            success: true,
            data: vote,
            message: 'Vote cast successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error casting vote: ' + error.message
        });
    }
});

// Get votes for a specific election
router.get('/election/:electionId', authenticateToken, async (req, res) => {
    try {
        const votes = await Vote.find({ election: req.params.electionId })
            .populate('voter')
            .populate('candidate')
            .populate('position');
            
        res.json({
            success: true,
            data: votes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching votes for election'
        });
    }
});

// Get votes for a specific candidate
router.get('/candidate/:candidateId', authenticateToken, async (req, res) => {
    try {
        const votes = await Vote.find({ candidate: req.params.candidateId })
            .populate('voter')
            .populate('election');
            
        res.json({
            success: true,
            data: votes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching votes for candidate'
        });
    }
});

// Check vote status for an election
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const { election } = req.query;
        if (!election) {
            return res.status(400).json({
                success: false,
                message: 'Election ID is required'
            });
        }

        const votes = await Vote.find({ voter: req.user.id, election });
        const hasVoted = votes.length > 0;

        res.json({
            success: true,
            hasVoted
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking vote status'
        });
    }
});

// Get user's votes
router.get('/my-votes', authenticateToken, async (req, res) => {
    try {
        const votes = await Vote.find({ voter: req.user.id })
            .populate('candidate')
            .populate('election')
            .populate('position');

        res.json({
            success: true,
            data: votes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching your votes'
        });
    }
});

// Get election results
router.get('/results/:electionId', authenticateToken, async (req, res) => {
    try {
        const results = await Vote.aggregate([
            { $match: { election: req.params.electionId } },
            {
                $group: {
                    _id: '$candidate',
                    votes: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'candidates',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'candidate'
                }
            },
            { $unwind: '$candidate' },
            {
                $lookup: {
                    from: 'positions',
                    localField: 'candidate.position',
                    foreignField: '_id',
                    as: 'position'
                }
            },
            { $unwind: '$position' },
            {
                $project: {
                    candidateName: '$candidate.name',
                    positionName: '$position.name',
                    votes: 1
                }
            },
            { $sort: { votes: -1 } }
        ]);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching election results'
        });
    }
});

module.exports = router;