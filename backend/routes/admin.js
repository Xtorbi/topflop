const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { runSql } = require('../models/database');
const { CURRENT_SEASON } = require('../config/clubs');

// Clés secrètes
const ADMIN_KEY = process.env.ADMIN_KEY || 'topflop-admin-2026';
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || 'c3778e56a9194c8cb10b0ed617c86492';

// Mapping Football-Data.org -> nom en BDD
const FOOTBALLDATA_TO_DB = {
  'Paris Saint-Germain FC': 'Paris Saint-Germain',
  'Olympique de Marseille': 'Olympique de Marseille',
  'Olympique Lyonnais': 'Olympique Lyonnais',
  'AS Monaco FC': 'AS Monaco',
  'Lille OSC': 'LOSC Lille',
  'OGC Nice': 'OGC Nice',
  'RC Lens': 'RC Lens',
  'Racing Club de Lens': 'RC Lens',
  'Stade Rennais FC 1901': 'Stade Rennais',
  'Stade Brestois 29': 'Stade Brestois 29',
  'RC Strasbourg Alsace': 'RC Strasbourg Alsace',
  'Toulouse FC': 'Toulouse FC',
  'FC Nantes': 'FC Nantes',
  'Le Havre AC': 'Le Havre AC',
  'AJ Auxerre': 'AJ Auxerre',
  'Angers SCO': 'Angers SCO',
  'FC Lorient': 'FC Lorient',
  'Paris FC': 'Paris FC',
  'FC Metz': 'FC Metz',
  // Variantes possibles
  'Paris SG': 'Paris Saint-Germain',
  'Monaco': 'AS Monaco',
  'Lille': 'LOSC Lille',
  'Marseille': 'Olympique de Marseille',
  'Lyon': 'Olympique Lyonnais',
  'Rennes': 'Stade Rennais',
  'Brest': 'Stade Brestois 29',
  'Strasbourg': 'RC Strasbourg Alsace',
  'Nantes': 'FC Nantes',
  'Auxerre': 'AJ Auxerre',
  'Angers': 'Angers SCO',
  'Lorient': 'FC Lorient',
  'Metz': 'FC Metz',
};

// Mots-clés des villes pour fallback matching
const CITY_KEYWORDS = [
  'Paris', 'Marseille', 'Lyon', 'Monaco', 'Lille', 'Nice', 'Lens',
  'Rennes', 'Brest', 'Strasbourg', 'Toulouse', 'Nantes', 'Havre',
  'Auxerre', 'Angers', 'Lorient', 'Metz'
];

// Trouver le nom du club en BDD
function findClubName(apiName) {
  if (!apiName) return null;
  const apiLower = apiName.toLowerCase();

  // 1. Essai direct
  if (FOOTBALLDATA_TO_DB[apiName]) {
    return FOOTBALLDATA_TO_DB[apiName];
  }

  // 2. Recherche partielle (contains)
  for (const [key, value] of Object.entries(FOOTBALLDATA_TO_DB)) {
    if (apiLower.includes(key.toLowerCase()) ||
        key.toLowerCase().includes(apiLower)) {
      return value;
    }
  }

  // 3. Fallback: chercher un mot-clé ville dans le nom API
  for (const city of CITY_KEYWORDS) {
    if (apiLower.includes(city.toLowerCase())) {
      // Chercher un club avec cette ville dans les valeurs du mapping
      for (const [key, value] of Object.entries(FOOTBALLDATA_TO_DB)) {
        if (value.toLowerCase().includes(city.toLowerCase())) {
          console.log(`[MATCH FALLBACK] "${apiName}" -> "${value}" (via city: ${city})`);
          return value;
        }
      }
    }
  }

  return null;
}

/**
 * Route pour mettre à jour les dates de match des joueurs
 * Utilise Football-Data.org API (gratuit, 10 req/min)
 * Appelée par cron-job.org tous les jours à 00h, 17h, 20h, 23h
 */
router.get('/update-matches', async (req, res) => {
  const { key } = req.query;

  // Vérification de la clé admin
  if (key !== ADMIN_KEY) {
    console.warn(`[CRON] Unauthorized attempt at ${new Date().toISOString()}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const logs = [];

  try {
    logs.push(`Starting update at ${now.toISOString()}`);

    // Récupérer les matchs des 7 derniers jours (marge large pour ne rien rater)
    const dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateFromStr = dateFrom.toISOString().split('T')[0];
    const dateToStr = now.toISOString().split('T')[0];

    // Appel API Football-Data.org - Ligue 1 (FL1)
    const url = `https://api.football-data.org/v4/competitions/FL1/matches?dateFrom=${dateFromStr}&dateTo=${dateToStr}&status=FINISHED`;
    logs.push(`Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': FOOTBALL_DATA_API_KEY,
      },
    });

    logs.push(`Response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      logs.push(`Error body: ${text.substring(0, 500)}`);
      throw new Error(`Football-Data API error: ${response.status}`);
    }

    const data = await response.json();
    const matches = data.matches || [];
    logs.push(`Matches found: ${matches.length}`);

    const updatedClubs = [];
    const unmatchedTeams = [];

    for (const match of matches) {
      const homeTeam = match.homeTeam?.name;
      const awayTeam = match.awayTeam?.name;
      const matchDate = match.utcDate; // ISO format

      logs.push(`Match: ${homeTeam} vs ${awayTeam} at ${matchDate}`);

      // Mettre à jour les joueurs des deux équipes
      for (const teamName of [homeTeam, awayTeam]) {
        const clubName = findClubName(teamName);

        if (clubName) {
          runSql(
            `UPDATE players SET last_match_date = ? WHERE club = ? AND source_season = ?`,
            [matchDate, clubName, CURRENT_SEASON]
          );
          updatedClubs.push({ club: clubName, matchDate, apiName: teamName });
        } else if (teamName) {
          unmatchedTeams.push(teamName);
        }
      }
    }

    const summary = {
      success: true,
      matchesFound: matches.length,
      clubsUpdated: updatedClubs.length,
      updatedClubs,
      unmatchedTeams: [...new Set(unmatchedTeams)],
      timestamp: now.toISOString(),
      logs,
    };

    lastCronResult = { ...summary, executedAt: now.toISOString() };
    console.log(`[CRON] OK - ${matches.length} matchs, ${updatedClubs.length} clubs mis à jour`);
    res.json(summary);
  } catch (error) {
    lastCronResult = { success: false, error: error.message, executedAt: now.toISOString() };
    console.error(`[CRON] ERREUR at ${now.toISOString()}:`, error.message);
    logs.push(`Error: ${error.message}`);
    res.status(500).json({
      error: error.message,
      logs,
      timestamp: now.toISOString(),
    });
  }
});

// Stocker le dernier résultat du cron pour monitoring
let lastCronResult = null;

/**
 * Route de health check pour le cron
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Status du cron : dernier résultat + état des last_match_date en BDD
 */
router.get('/cron-status', (req, res) => {
  const { key } = req.query;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { queryAll, queryOne } = require('../models/database');

  // Combien de joueurs ont un last_match_date ?
  const withDate = queryOne(
    `SELECT COUNT(*) as count FROM players WHERE last_match_date IS NOT NULL AND source_season = ?`,
    [CURRENT_SEASON]
  );
  const withoutDate = queryOne(
    `SELECT COUNT(*) as count FROM players WHERE last_match_date IS NULL AND source_season = ?`,
    [CURRENT_SEASON]
  );

  // Clubs avec le match le plus récent
  const recentClubs = queryAll(
    `SELECT club, MAX(last_match_date) as last_match
     FROM players WHERE source_season = ? AND last_match_date IS NOT NULL
     GROUP BY club ORDER BY last_match DESC`,
    [CURRENT_SEASON]
  );

  res.json({
    lastCronResult: lastCronResult || 'Aucun cron exécuté depuis le redémarrage',
    playersWithMatchDate: withDate?.count || 0,
    playersWithoutMatchDate: withoutDate?.count || 0,
    recentClubMatches: recentClubs,
    serverTime: new Date().toISOString(),
  });
});

module.exports = router;
