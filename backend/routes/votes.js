const express = require('express');
const router = express.Router();
const { handleVote } = require('../controllers/votesController');
const { voteLimiter } = require('../middleware/rateLimiter');
const { checkIPLimit } = require('../middleware/ipTracker');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/vote', voteLimiter, asyncHandler(checkIPLimit), asyncHandler(handleVote));

module.exports = router;
