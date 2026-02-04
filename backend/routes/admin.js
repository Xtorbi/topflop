const express = require('express');
const router = express.Router();
const { queryAll, runSql } = require('../models/database');
const { CURRENT_SEASON, L1_CLUBS } = require('../config/clubs');

// Clé secrète pour protéger la route (à définir dans les variables d'env)
const ADMIN_KEY = process.env.ADMIN_KEY || 'footvibes-admin-2026';

// Mapping des IDs SofaScore pour les clubs L1
const SOFASCORE_TEAM_IDS = {
  'Paris Saint-Germain': 2190,
  'Olympique de Marseille': 2673,
  'Olympique Lyonnais': 2685,
  'AS Monaco': 2686,
  'LOSC Lille': 2780,
  'OGC Nice': 2730,
  'RC Lens': 2807,
  'Stade Rennais': 2705,
  'Stade Brestois 29': 2956,
  'RC Strasbourg Alsace': 2682,
  'Toulouse FC': 2711,
  'FC Nantes': 2728,
  'Le Havre AC': 2751,
  'AJ Auxerre': 2688,
  'Angers SCO': 2749,
  'FC Lorient': 2781,
  'Paris FC': 2783,
  'FC Metz': 2690,
};

// ID de la Ligue 1 sur SofaScore (saison 2025-2026)
const SOFASCORE_TOURNAMENT_ID = 34;
const SOFASCORE_SEASON_ID = 77356;

/**
 * Route pour mettre à jour les dates de match des joueurs
 * Appelle l'API SofaScore pour récupérer les matchs récents
 */
router.get('/update-matches', async (req, res) => {
  const { key } = req.query;

  // Vérification de la clé
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Récupérer les matchs des dernières 24h
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Appel API SofaScore pour les événements récents
    const response = await fetch(
      `https://api.sofascore.com/api/v1/unique-tournament/${SOFASCORE_TOURNAMENT_ID}/season/${SOFASCORE_SEASON_ID}/events/last/0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SofaScore API error: ${response.status}`);
    }

    const data = await response.json();
    const events = data.events || [];

    // Filtrer les matchs terminés des dernières 24h
    const recentMatches = events.filter(event => {
      const matchTime = new Date(event.startTimestamp * 1000);
      return event.status?.type === 'finished' && matchTime >= yesterday;
    });

    const updatedClubs = [];

    for (const match of recentMatches) {
      const homeTeam = match.homeTeam?.name;
      const awayTeam = match.awayTeam?.name;
      const matchDate = new Date(match.startTimestamp * 1000).toISOString();

      // Mettre à jour les joueurs des deux équipes
      for (const teamName of [homeTeam, awayTeam]) {
        // Trouver le nom du club dans notre BDD
        const clubName = Object.keys(SOFASCORE_TEAM_IDS).find(name =>
          teamName?.toLowerCase().includes(name.toLowerCase().split(' ')[0]) ||
          name.toLowerCase().includes(teamName?.toLowerCase().split(' ')[0] || '')
        );

        if (clubName) {
          runSql(
            `UPDATE players SET last_match_date = ? WHERE club = ? AND source_season = ?`,
            [matchDate, clubName, CURRENT_SEASON]
          );
          updatedClubs.push({ club: clubName, matchDate });
        }
      }
    }

    res.json({
      success: true,
      matchesFound: recentMatches.length,
      updatedClubs,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Error updating matches:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Route de health check pour le cron
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
