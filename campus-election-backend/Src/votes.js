const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/voteController');
const { authenticate } = require('../middlewares/auth');


router.post('/', authenticate, ctrl.cast);
router.get('/results/:electionId', ctrl.results);


module.exports = router;