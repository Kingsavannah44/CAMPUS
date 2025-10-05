const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const candidateController = require('../controllers/candidateController');
const Candidate = require('../models/candidate');
const Position = require('../models/position');

// Get all candidates
router.get('/', authenticateToken, candidateController.list);

// Create candidate (admin only)
router.post('/', authenticateToken, requireAdmin, candidateController.upload, candidateController.create);

// Get single candidate
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id)
            .populate({ path: 'position', populate: { path: 'election' } });
            
        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate not found'
            });
        }
        
        res.json({
            success: true,
            data: candidate
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching candidate'
        });
    }
});

// Update candidate (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const candidate = await Candidate.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate({ path: 'position', populate: { path: 'election' } });
        
        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate not found'
            });
        }
        
        res.json({
            success: true,
            data: candidate,
            message: 'Candidate updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating candidate'
        });
    }
});

// Delete candidate (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const candidate = await Candidate.findByIdAndDelete(req.params.id);
        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Candidate deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting candidate'
        });
    }
});

// Get candidates by election
router.get('/election/:electionId', authenticateToken, async (req, res) => {
    try {
        const positions = await Position.find({ election: req.params.electionId });
        const positionIds = positions.map(p => p._id);
        const candidates = await Candidate.find({ position: { $in: positionIds } })
            .populate({ path: 'position', populate: { path: 'election' } });
            
        res.json({
            success: true,
            data: candidates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching candidates for election'
        });
    }
});

// Get candidates by position
router.get('/position/:positionId', authenticateToken, async (req, res) => {
    try {
        const candidates = await Candidate.find({ position: req.params.positionId })
            .populate({ path: 'position', populate: { path: 'election' } });
            
        res.json({
            success: true,
            data: candidates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching candidates for position'
        });
    }
});

module.exports = router;