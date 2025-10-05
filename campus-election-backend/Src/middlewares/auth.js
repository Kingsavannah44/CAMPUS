const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

const requireCandidate = (req, res, next) => {
    if (!req.user || req.user.role !== 'candidate') {
        return res.status(403).json({
            success: false,
            message: 'Candidate access required'
        });
    }
    next();
};

const requireVoter = (req, res, next) => {
    if (!req.user || req.user.role !== 'voter') {
        return res.status(403).json({
            success: false,
            message: 'Voter access required'
        });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireCandidate,
    requireVoter
};
