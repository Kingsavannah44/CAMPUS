// --- Required Modules ---
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const xss = require('xss');

// Import route modules
const voteRoutes = require('./Src/routes/votes');

// Load environment variables from .env file (for sensitive information like DB URL)
dotenv.config();

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 5000;

// Secure file upload configuration
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files allowed'), false);
        }
    }
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Input sanitization function
function sanitizeInput(input) {
    if (typeof input === 'string') {
        return xss(input.trim());
    }
    return input;
}

// IMPORTANT: Replace this placeholder with your actual MongoDB Atlas connection string!
// It should look like: mongodb+srv://<USER>:<PASS>@<CLUSTER_URL>/<DATABASE_NAME>?retryWrites=true&w=majority
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/CampusElectionsDB";

// --- Middleware ---
// Security headers
app.use(helmet());

// Rate limiting
app.use(limiter);

// Enable CORS for frontend applications to connect (essential for web apps)
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin, like mobile apps or curl requests
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return callback(null, true);
    return callback(null, true);
  },
  credentials: true
}));

// Parse incoming JSON requests (req.body will be available)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files securely
app.use('/uploads', express.static('uploads', {
    setHeaders: (res, path) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

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
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, role, institution } = req.body;

        // Input validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, and name are required'
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Sanitize inputs
        const sanitizedData = {
            email: sanitizeInput(email.toLowerCase()),
            name: sanitizeInput(name),
            role: sanitizeInput(role) || 'voter',
            institution: institution ? sanitizeInput(institution) : null
        };

        // Check if user exists
        const existingUser = await User.findOne({ email: sanitizedData.email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const userData = {
            email: sanitizedData.email,
            password: hashedPassword,
            name: sanitizedData.name,
            role: sanitizedData.role
        };
        
        // Add institution for voters
        if (sanitizedData.role === 'voter' && sanitizedData.institution) {
            userData.institution = sanitizedData.institution;
        }

        const user = new User(userData);
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
                    role: user.role,
                    institution: user.institution
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
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Find user
        const user = await User.findOne({ email: sanitizeInput(email.toLowerCase()) });
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
app.get('/api/auth/me', async (req, res) => {
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
app.post('/api/candidates', authenticateToken, requireAdmin, upload.single('photo'), async (req, res) => {
    try {
        // Input validation
        if (!req.body.name || !req.body.position) {
            return res.status(400).json({
                success: false,
                message: 'Name and position are required'
            });
        }

        const candidateData = {
            name: sanitizeInput(req.body.name),
            manifesto: sanitizeInput(req.body.manifesto),
            bio: sanitizeInput(req.body.bio),
            position: sanitizeInput(req.body.position),
            election: req.body.election,
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
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(electionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid election ID'
            });
        }
        
        const candidates = await Candidate.find({ election: electionId }).populate('position');

        res.status(200).json(candidates);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve candidates.',
            details: error.message
        });
    }
});

// --- Elections Routes ---
app.get('/api/elections', async (req, res) => {
    try {
        const elections = await Election.find({});
        res.json({ success: true, data: elections });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/elections', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Input validation
        if (!req.body.name || !req.body.startDate || !req.body.endDate) {
            return res.status(400).json({
                success: false,
                message: 'Name, start date, and end date are required'
            });
        }

        const electionData = {
            name: sanitizeInput(req.body.name),
            description: sanitizeInput(req.body.description),
            startDate: req.body.startDate,
            endDate: req.body.endDate
        };

        const election = new Election(electionData);
        await election.save();
        res.status(201).json({ success: true, data: election });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Error creating election' });
    }
});

app.get('/api/elections/:id', async (req, res) => {
    try {
        const election = await Election.findById(req.params.id);
        if (!election) {
            return res.status(404).json({ success: false, message: 'Election not found' });
        }
        res.json({ success: true, data: election });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/elections/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const election = await Election.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!election) {
            return res.status(404).json({ success: false, message: 'Election not found' });
        }
        res.json({ success: true, data: election });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/candidates/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const candidate = await Candidate.findByIdAndDelete(req.params.id);
        if (!candidate) {
            return res.status(404).json({ success: false, message: 'Candidate not found' });
        }
        res.json({ success: true, message: 'Candidate deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Vote Routes ---
app.use('/api/votes', voteRoutes);

// --- Contact Form Route ---
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, topic, message } = req.body;
        
        // Log the message (for now)
        console.log('Contact Form Message:');
        console.log(`Name: ${name}`);
        console.log(`Email: ${email}`);
        console.log(`Topic: ${topic}`);
        console.log(`Message: ${message}`);
        
        res.json({
            success: true,
            message: 'Message received successfully'
        });
    } catch (error) {
        console.error('Contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
});

// Import the main app from app.js
const mainApp = require('./Src/app');

// --- Start Server ---
mainApp.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Local URL: http://localhost:${PORT}`);
});
