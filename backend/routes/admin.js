const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { runSql } = require('../models/database');
const { CURRENT_SEASON } = require('../config/clubs');

// Clé secrète pour protéger la route (à définir dans les variables d'env)
const ADMIN_KEY = process.env.ADMIN_KEY || 'footvibes-admin-2026';

// Mapping SofaScore -> nom en BDD (plus robuste)
const SOFASCORE_TO_DB = {
  'Paris Saint-Germain': 'Paris Saint-Germain',
  'PSG': 'Paris Saint-Germain',
  'Marseille': 'Olympique de Marseille',
  'Olympique Marseille': 'Olympique de Marseille',
  'Lyon': 'Olympique Lyonnais',
  'Olympique Lyon': 'Olympique Lyonnais',
  'Olympique Lyonnais': 'Olympique Lyonnais',
  'Monaco': 'AS Monaco',
  'AS Monaco': 'AS Monaco',
  'Lille': 'LOSC Lille',
  'LOSC': 'LOSC Lille',
  'LOSC Lille': 'LOSC Lille',
  'Nice': 'OGC Nice',
  'OGC Nice': 'OGC Nice',
  'Lens': 'RC Lens',
  'RC Lens': 'RC Lens',
  'Rennes': 'Stade Rennais',
  'Stade Rennais': 'Stade Rennais',
  'Brest': 'Stade Brestois 29',
  'Stade Brestois': 'Stade Brestois 29',
  'Strasbourg': 'RC Strasbourg Alsace',
  'RC Strasbourg': 'RC Strasbourg Alsace',
  'Toulouse': 'Toulouse FC',
  'Toulouse FC': 'Toulouse FC',
  'Nantes': 'FC Nantes',
  'FC Nantes': 'FC Nantes',
  'Le Havre': 'Le Havre AC',
  'Le Havre AC': 'Le Havre AC',
  'Auxerre': 'AJ Auxerre',
  'AJ Auxerre': 'AJ Auxerre',
  'Angers': 'Angers SCO',
  'Angers SCO': 'Angers SCO',
  'Lorient': 'FC Lorient',
  'FC Lorient': 'FC Lorient',
  'Paris FC': 'Paris FC',
  'Metz': 'FC Metz',
  'FC Metz': 'FC Metz',
};

// ID de la Ligue 1 sur SofaScore (saison 2025-2026)
const SOFASCORE_TOURNAMENT_ID = 34;
const SOFASCORE_SEASON_ID = 77356;

// Trouver le nom du club en BDD depuis le nom SofaScore
function findClubName(sofascoreName) {
  if (!sofascoreName) return null;

  // Essai direct
  if (SOFASCORE_TO_DB[sofascoreName]) {
    return SOFASCORE_TO_DB[sofascoreName];
  }

  // Essai partiel (premier mot)
  const firstWord = sofascoreName.split(' ')[0];
  if (SOFASCORE_TO_DB[firstWord]) {
    return SOFASCORE_TO_DB[firstWord];
  }

  // Recherche dans les clés
  for (const [key, value] of Object.entries(SOFASCORE_TO_DB)) {
    if (sofascoreName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(sofascoreName.toLowerCase())) {
      return value;
    }
  }

  return null;
}

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

  const now = new Date();
  const logs = [];

  try {
    logs.push(`Starting update at ${now.toISOString()}`);

    // Récupérer les matchs des dernières 48h (pour couvrir le weekend)
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Appel API SofaScore pour les événements récents
    const url = `https://api.sofascore.com/api/v1/unique-tournament/${SOFASCORE_TOURNAMENT_ID}/season/${SOFASCORE_SEASON_ID}/events/last/0`;
    logs.push(`Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    logs.push(`Response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      logs.push(`Error body: ${text.substring(0, 200)}`);
      throw new Error(`SofaScore API error: ${response.status}`);
    }

    const data = await response.json();
    const events = data.events || [];
    logs.push(`Events found: ${events.length}`);

    // Filtrer les matchs terminés des dernières 48h
    const recentMatches = events.filter(event => {
      const matchTime = new Date(event.startTimestamp * 1000);
      const isFinished = event.status?.type === 'finished';
      const isRecent = matchTime >= cutoff;
      return isFinished && isRecent;
    });

    logs.push(`Recent finished matches: ${recentMatches.length}`);

    const updatedClubs = [];
    const unmatchedTeams = [];

    for (const match of recentMatches) {
      const homeTeam = match.homeTeam?.name;
      const awayTeam = match.awayTeam?.name;
      const matchDate = new Date(match.startTimestamp * 1000).toISOString();

      logs.push(`Match: ${homeTeam} vs ${awayTeam} at ${matchDate}`);

      // Mettre à jour les joueurs des deux équipes
      for (const teamName of [homeTeam, awayTeam]) {
        const clubName = findClubName(teamName);

        if (clubName) {
          runSql(
            `UPDATE players SET last_match_date = ? WHERE club = ? AND source_season = ?`,
            [matchDate, clubName, CURRENT_SEASON]
          );
          updatedClubs.push({ club: clubName, matchDate, sofascoreName: teamName });
        } else if (teamName) {
          unmatchedTeams.push(teamName);
        }
      }
    }

    res.json({
      success: true,
      matchesFound: recentMatches.length,
      updatedClubs,
      unmatchedTeams: [...new Set(unmatchedTeams)],
      timestamp: now.toISOString(),
      logs,
    });
  } catch (error) {
    console.error('Error updating matches:', error);
    logs.push(`Error: ${error.message}`);
    res.status(500).json({
      error: error.message,
      logs,
      timestamp: now.toISOString(),
    });
  }
});

/**
 * Route de health check pour le cron
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
