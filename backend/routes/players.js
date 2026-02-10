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

// Cache middleware : s-maxage pour CDN, max-age pour navigateur
const cache = (seconds) => (req, res, next) => {
  res.set('Cache-Control', `public, max-age=${seconds}, s-maxage=${seconds}`);
  next();
};

router.get('/matches/recent', cache(300), getRecentMatches);  // 5 min
router.get('/players/random', getRandomPlayer);                // pas de cache (aleatoire)
router.get('/players', cache(60), getPlayers);                 // 1 min
router.get('/players/:id', cache(60), getPlayerById);          // 1 min
router.get('/ranking', cache(60), getRanking);                 // 1 min
router.get('/contexts', cache(600), getContexts);              // 10 min

module.exports = router;
