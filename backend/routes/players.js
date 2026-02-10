const express = require('express');
const router = express.Router();
const {
  getRandomPlayer,
  getPlayers,
  getPlayerById,
  getRanking,
  getContexts,
  getRecentMatches,
} = require('../controllers/playersController');

// Wrapper async : catch les rejections et les passe au error handler Express
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Cache middleware : s-maxage pour CDN, max-age pour navigateur
const cache = (seconds) => (req, res, next) => {
  res.set('Cache-Control', `public, max-age=${seconds}, s-maxage=${seconds}`);
  next();
};

router.get('/matches/recent', cache(300), asyncHandler(getRecentMatches));  // 5 min
router.get('/players/random', asyncHandler(getRandomPlayer));                // pas de cache (aleatoire)
router.get('/players', cache(60), asyncHandler(getPlayers));                 // 1 min
router.get('/players/:id', cache(60), asyncHandler(getPlayerById));          // 1 min
router.get('/ranking', cache(60), asyncHandler(getRanking));                 // 1 min
router.get('/contexts', cache(600), asyncHandler(getContexts));              // 10 min

module.exports = router;
