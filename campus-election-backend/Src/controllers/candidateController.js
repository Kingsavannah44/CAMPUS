const Candidate = require('../models/candidate');
const Position = require('../models/position');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

exports.upload = upload.single('photo');

exports.create = async (req, res) => {
  const { name, manifesto, positionId, electionId, userId } = req.body;
  const photo = req.file ? req.file.filename : null;

  try {
    let position = null;

    // If positionId is provided, handle it
    if (positionId && positionId.trim() !== '') {
      // Check if positionId is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(positionId)) {
        // It's an ObjectId, use it directly
        position = positionId;
      } else {
        // It's a string (position title), find or create the position
        let existingPosition = await Position.findOne({
          title: positionId.trim(),
          election: electionId
        });

        if (!existingPosition && electionId) {
          // Create new position for this election
          existingPosition = new Position({
            title: positionId.trim(),
            election: electionId
          });
          await existingPosition.save();
        }

        if (existingPosition) {
          position = existingPosition._id;
        }
      }
    }

    const candidate = new Candidate({
      name,
      manifesto,
      photo,
      position: position,
      user: userId
    });

    await candidate.save();
    await candidate.populate({ path: 'position', populate: { path: 'election' } });

    res.status(201).json({
      success: true,
      data: candidate,
      message: 'Candidate created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating candidate: ' + error.message
    });
  }
};

exports.list = async (req, res) => {
  try {
    const candidates = await Candidate.find().populate({ path: 'position', populate: { path: 'election' } });
    res.json({
      success: true,
      data: candidates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching candidates'
    });
  }
};
