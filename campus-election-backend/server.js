// --- Required Modules ---
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');

// Import route modules
const voteRoutes = require('./Src/routes/votes');

// Load environment variables from .env file (for sensitive information like DB URL)
dotenv.config();

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 5000;
const upload = multer({ dest: 'uploads/' });

// IMPORTANT: Replace this placeholder with your actual MongoDB Atlas connection string!
// It should look like: mongodb+srv://<USER>:<PASS>@<CLUSTER_URL>/<DATABASE_NAME>?retryWrites=true&w=majority
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/CampusElectionsDB";

// --- Middleware ---
// Enable CORS for frontend applications to connect (essential for web apps)
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin, like mobile apps or curl requests
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost:')) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
// Parse incoming JSON requests (req.body will be available)
app.use(express.json());

// --- Import Models ---
const User = require('./Src/models/user');
const Candidate = require('./Src/models/candidate');
const Election = require('./Src/models/election');

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log(' MongoDB connected successfully!');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        // Exit process with failure
        process.exit(1);
    }
};

// Call the connection function immediately
connectDB();

// --- Middleware Functions ---
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

// --- Auth Routes ---

// Register
app.post('/auth/register', async (req, res) => {
    try {
        console.log('Register request body:', req.body);
        const { email, password, name, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            email,
            password: hashedPassword,
            name,
            role: role || 'voter'
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                token
            },
            message: 'User registered successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error registering user: ' + error.message
        });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                token
            },
            message: 'Login successful'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error logging in'
        });
    }
});

// Get current user
app.get('/auth/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// --- API Routes ---

// Base route test
app.get('/', (req, res) => {
    res.status(200).send('Election API is running and connected to MongoDB!');
});

// POST route: /api/candidates
// Creates a new candidate document in the database
app.post('/api/candidates', upload.single('photo'), async (req, res) => {
    try {
        const candidateData = {
            name: req.body.name,
            manifesto: req.body.manifesto,
            bio: req.body.bio,
            position: req.body.positionId,
            user: req.body.userId,
            photo: req.file ? req.file.filename : null
        };

        // Create a new Candidate instance using data from the request body
        const newCandidate = new Candidate(candidateData);

        // Save the instance to the database
        await newCandidate.save();

        // Send a success response
        res.status(201).json({
            success: true,
            data: newCandidate,
            message: 'Candidate created successfully'
        });

    } catch (error) {
        // Handle validation or other database errors
        res.status(400).json({
            success: false,
            message: 'Error creating candidate: ' + error.message
        });
    }
});

// GET route: /api/candidates
// Retrieves all candidates from the database
app.get('/api/candidates', async (req, res) => {
    try {
        // Use the Model's find() method to get all documents
        const candidates = await Candidate.find({}).populate('position').populate('user');

        // Send the list of candidates as a JSON response
        res.status(200).json({
            success: true,
            data: candidates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching candidates'
        });
    }
});

// GET route: /api/candidates/election/:electionId
// Retrieves candidates for a specific election
app.get('/api/candidates/election/:electionId', async (req, res) => {
    try {
        const { electionId } = req.params;
        const candidates = await Candidate.find({ election: electionId }).populate('position');

        res.status(200).json(candidates);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve candidates.',
            details: error.message
        });
    }
});

// --- Elections Routes are handled by Src/routes/elections.js ---

// --- Vote Routes ---
app.use('/api/votes', voteRoutes);

// Import the main app from app.js
const mainApp = require('./Src/app');

// --- Start Server ---
mainApp.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Local URL: http://localhost:${PORT}`);
});
