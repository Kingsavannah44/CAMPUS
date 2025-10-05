require('dotenv').config();
const express = require('express');
const bodyParser = require('express').json;
const cors = require('cors');
const db = require('./models/index-new');
const config = require('./config/config');


const authRoutes = require('./routes/auth');
const electionRoutes = require('./routes/elections');
const positionRoutes = require('./routes/positions');
const candidateRoutes = require('./routes/candidates');
const voteRoutes = require('./routes/votes');


const app = express();

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus_election';
db.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost:3000')) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(bodyParser());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));


app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);


app.get('/', (req, res) => res.json({ ok: true, message: 'Campus election API' }));


// global error handler (simple)
app.use((err, req, res, next) => {
console.error(err);
res.status(500).json({ message: 'Internal server error' });
});


module.exports = app;