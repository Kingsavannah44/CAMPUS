const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const Position = require('../models/position');

// Get all positions
router.get('/', authenticateToken, async (req, res) => {
    try {
        const positions = await Position.find().populate('candidates');
        res.json({
            success: true,
            data: positions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching positions'
        });
    }
});

// Create position (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const position = new Position(req.body);
        await position.save();
        res.status(201).json({
            success: true,
            data: position,
            message: 'Position created successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error creating position: ' + error.message
        });
    }
});

// Get single position
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const position = await Position.findById(req.params.id).populate('candidates');
        if (!position) {
            return res.status(404).json({
                success: false,
                message: 'Position not found'
            });
        }
        res.json({
            success: true,
            data: position
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching position'
        });
    }
});

// Update position (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const position = await Position.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!position) {
            return res.status(404).json({
                success: false,
                message: 'Position not found'
            });
        }
        res.json({
            success: true,
            data: position,
            message: 'Position updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating position'
        });
    }
});

// Delete position (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const position = await Position.findByIdAndDelete(req.params.id);
        if (!position) {
            return res.status(404).json({
                success: false,
                message: 'Position not found'
            });
        }
        res.json({
            success: true,
            message: 'Position deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting position'
        });
    }
});

module.exports = router;