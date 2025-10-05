const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const Election = require('../models/election');

// Get all elections (accessible to all authenticated users)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const elections = await Election.find();
        res.json({
            success: true,
            data: elections
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching elections'
        });
    }
});

// Create election (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const election = new Election(req.body);
        await election.save();
        res.status(201).json({
            success: true,
            data: election,
            message: 'Election created successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error creating election: ' + error.message
        });
    }
});

// Get single election
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const election = await Election.findById(req.params.id);
        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }
        res.json({
            success: true,
            data: election
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching election'
        });
    }
});

// Update election (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const election = await Election.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }
        res.json({
            success: true,
            data: election,
            message: 'Election updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating election'
        });
    }
});

// Delete election (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const election = await Election.findByIdAndDelete(req.params.id);
        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }
        res.json({
            success: true,
            message: 'Election deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting election'
        });
    }
});

module.exports = router;
