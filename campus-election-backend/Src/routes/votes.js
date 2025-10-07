const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireVoter } = require('../middlewares/auth');
const Vote = require('../models/vote');
const Candidate = require('../models/candidate');
const mongoose = require('mongoose');
const validator = require('validator');
const xss = require('xss');

// Input sanitization function
function sanitizeInput(input) {
    if (typeof input === 'string') {
        return xss(input.trim());
    }
    return input;
}

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
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { candidateName, position, electionId } = req.body;

        // Input validation
        if (!candidateName || !position) {
            return res.status(400).json({
                success: false,
                message: 'Candidate name and position are required'
            });
        }

        // Sanitize inputs
        const sanitizedCandidateName = sanitizeInput(candidateName);
        const sanitizedPosition = sanitizeInput(position);

        // Find the candidate
        const candidateDoc = await Candidate.findOne({ 
            name: sanitizedCandidateName,
            position: sanitizedPosition
        });
        if (!candidateDoc) {
            return res.status(404).json({
                success: false,
                message: 'Candidate not found'
            });
        }

        // Check if user has already voted for this position in this election
        const existingVote = await Vote.findOne({
            voter: req.user.id,
            candidateName: sanitizedCandidateName,
            position: sanitizedPosition
        });

        if (existingVote) {
            return res.status(400).json({
                success: false,
                message: 'You have already voted for this position'
            });
        }

        const vote = new Vote({
            voter: req.user.id,
            candidateName: sanitizedCandidateName,
            position: sanitizedPosition,
            electionId: electionId || 'default'
        });

        await vote.save();

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
        const votes = await Vote.find({ electionId: req.params.electionId });
            
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
router.get('/candidate/:candidateName', authenticateToken, async (req, res) => {
    try {
        const sanitizedName = sanitizeInput(req.params.candidateName);
        const votes = await Vote.find({ candidateName: sanitizedName });
            
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
        const { electionId } = req.query;
        if (!electionId) {
            return res.status(400).json({
                success: false,
                message: 'Election ID is required'
            });
        }

        const votes = await Vote.find({ voter: req.user.id, electionId: sanitizeInput(electionId) });
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
        const votes = await Vote.find({ voter: req.user.id });

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
            { $match: { electionId: req.params.electionId } },
            {
                $group: {
                    _id: {
                        candidateName: '$candidateName',
                        position: '$position'
                    },
                    votes: { $sum: 1 }
                }
            },
            {
                $project: {
                    candidateName: '$_id.candidateName',
                    positionName: '$_id.position',
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