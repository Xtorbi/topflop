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

router.get('/matches/recent', getRecentMatches);
router.get('/players/random', getRandomPlayer);
router.get('/players', getPlayers);
router.get('/players/:id', getPlayerById);
router.get('/ranking', getRanking);
router.get('/contexts', getContexts);

module.exports = router;
