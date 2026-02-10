const { queryAll, queryOne } = require('../models/database');
const { CURRENT_SEASON, CLUB_POPULARITY, L1_CLUBS } = require('../config/clubs');

const VALID_POSITIONS = ['Gardien', 'Defenseur', 'Milieu', 'Attaquant'];
const VALID_PERIODS = ['week', 'month'];
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 50;

function sanitizeInt(val, defaultVal, min = 0, max = MAX_LIMIT) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < min) return defaultVal;
  return Math.min(n, max);
}

async function getRandomPlayer(req, res) {
  const { context = 'ligue1', exclude = '' } = req.query;
  const excludeIds = exclude ? exclude.split(',').map(Number) : [];

  // Récupérer la journée actuelle
  const statusRow = await queryOne('SELECT current_matchday FROM league_status WHERE id = 1');
  const currentMatchday = statusRow ? statusRow.current_matchday : 1;

  let query = `
    SELECT * FROM players
    WHERE source_season = ?
      AND archived = 0
      AND matches_played > 0
  `;
  const params = [CURRENT_SEASON];

  if (context.startsWith('match:')) {
    // Mode match : "match:clubId1:clubId2"
    const parts = context.split(':');
    const club1 = L1_CLUBS.find(c => c.id === parts[1]);
    const club2 = L1_CLUBS.find(c => c.id === parts[2]);
    if (club1 && club2) {
      query += ' AND club IN (?, ?)';
      params.push(club1.name, club2.name);
    }
  } else if (context !== 'ligue1') {
    const club = L1_CLUBS.find(c => c.id === context);
    if (club) {
      query += ' AND club = ?';
      params.push(club.name);
    }
  }

  const allPlayers = (await queryAll(query, params)).filter(p => !excludeIds.includes(p.id));

  if (allPlayers.length === 0) {
    return res.status(404).json({ error: 'Aucun joueur disponible' });
  }

  // Répartir en buckets par récence du dernier match joué
  // Fenetres adaptées au calendrier L1 (matchs ven/sam/dim)
  // 50% → < 2 jours (48h) — matchs d'hier/avant-hier
  // 25% → 2-5 jours (48h-120h) — dimanche vu du jeudi
  // 15% → 5-8 jours (120h-192h) — journée précédente
  // 10% → reste (> 8 jours ou pas de match)
  // Fix : joueurs < 5 matchs → bucket "older" direct (bench warmers)
  const buckets = { fresh: [], recent: [], lastWeek: [], older: [] };
  const now = Date.now();

  for (const player of allPlayers) {
    // Bench warmers (< 5 matchs) → older, peu importe la date
    if ((player.matches_played || 0) < 5) {
      buckets.older.push(player);
      continue;
    }

    if (player.last_match_date) {
      const matchTime = new Date(player.last_match_date).getTime();
      const hoursAgo = (now - matchTime) / (1000 * 60 * 60);

      if (hoursAgo < 48) buckets.fresh.push(player);
      else if (hoursAgo < 120) buckets.recent.push(player);
      else if (hoursAgo < 192) buckets.lastWeek.push(player);
      else buckets.older.push(player);
    } else {
      buckets.older.push(player);
    }
  }

  // Sélection 50/25/15/10 avec fallback en cascade
  const roll = Math.random() * 100;
  let bucket;

  if (roll < 50 && buckets.fresh.length > 0) {
    bucket = buckets.fresh;
  } else if (roll < 75 && buckets.recent.length > 0) {
    bucket = buckets.recent;
  } else if (roll < 90 && buckets.lastWeek.length > 0) {
    bucket = buckets.lastWeek;
  } else if (buckets.older.length > 0) {
    bucket = buckets.older;
  } else {
    // Fallback en cascade : premier bucket non-vide
    bucket = buckets.fresh.length > 0 ? buckets.fresh
      : buckets.recent.length > 0 ? buckets.recent
      : buckets.lastWeek.length > 0 ? buckets.lastWeek
      : allPlayers;
  }

  // Sélection "club-first" : 1) tirer un club, 2) tirer un joueur dans ce club
  // Évite que les 30 joueurs PSG/OM écrasent les petits clubs

  // Étape 1 : grouper par club
  const clubGroups = {};
  for (const p of bucket) {
    if (!clubGroups[p.club]) clubGroups[p.club] = [];
    clubGroups[p.club].push(p);
  }

  // Étape 2 : tirer un club pondéré par sqrt(popularity) — compression du biais
  // PSG: sqrt(100)=10, OM: sqrt(80)=9, Auxerre: sqrt(10)=3 → ratio 3.3x (était 10x)
  const clubs = Object.keys(clubGroups);
  const clubWeights = clubs.map(club => Math.sqrt(CLUB_POPULARITY[club] || 10));
  const totalClubWeight = clubWeights.reduce((s, w) => s + w, 0);
  let clubRoll = Math.random() * totalClubWeight;
  let selectedClub = clubs[clubs.length - 1];
  for (let i = 0; i < clubs.length; i++) {
    clubRoll -= clubWeights[i];
    if (clubRoll <= 0) { selectedClub = clubs[i]; break; }
  }

  const clubPlayers = clubGroups[selectedClub];

  // Étape 3 : tirer un joueur dans le club choisi (pondéré par matchs/stats)
  const weights = clubPlayers.map(p => {
    const baseWeight = 50;

    // Bonus fraîcheur simplifié (dans le club, pas besoin de différencier finement)
    let freshnessBonus = 0;
    if (p.last_match_date) {
      const hoursAgo = (now - new Date(p.last_match_date).getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 48) freshnessBonus = 30;
      else if (hoursAgo < 120) freshnessBonus = 15;
    }

    // Bonus titulaire (0-40) : plus de matchs = plus visible
    const matchesBonus = Math.min(40, (p.matches_played || 0) * 2);

    // Bonus stats (0-20) : buts + passes décisives
    const statsBonus = Math.min(20, ((p.goals || 0) + (p.assists || 0)) * 2);

    // Légère pénalité si déjà beaucoup voté (pour varier)
    const votePenalty = Math.min(15, Math.log(p.total_votes + 1) * 3);

    return Math.max(1, baseWeight + freshnessBonus + matchesBonus + statsBonus - votePenalty);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < clubPlayers.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return res.json(clubPlayers[i]);
    }
  }

  res.json(clubPlayers[clubPlayers.length - 1]);
}

async function getPlayers(req, res) {
  const { position, club, search, limit: rawLimit = '50', offset: rawOffset = '0' } = req.query;
  const limit = sanitizeInt(rawLimit, 50);
  const offset = sanitizeInt(rawOffset, 0, 0, 10000);

  let query = `SELECT * FROM players WHERE source_season = ? AND archived = 0`;
  let countQuery = `SELECT COUNT(*) as total FROM players WHERE source_season = ? AND archived = 0`;
  const params = [CURRENT_SEASON];
  const countParams = [CURRENT_SEASON];

  if (position && VALID_POSITIONS.includes(position)) {
    query += ' AND position = ?';
    countQuery += ' AND position = ?';
    params.push(position);
    countParams.push(position);
  }

  if (club) {
    query += ' AND club = ?';
    countQuery += ' AND club = ?';
    params.push(club);
    countParams.push(club);
  }

  if (search) {
    const cleanSearch = search.slice(0, MAX_SEARCH_LENGTH);
    query += ' AND name LIKE ?';
    countQuery += ' AND name LIKE ?';
    params.push(`%${cleanSearch}%`);
    countParams.push(`%${cleanSearch}%`);
  }

  query += ' ORDER BY score DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const players = await queryAll(query, params);
  const row = await queryOne(countQuery, countParams);
  const total = row ? row.total : 0;

  res.json({ players, total });
}

async function getPlayerById(req, res) {
  const { id } = req.params;

  const player = await queryOne('SELECT * FROM players WHERE id = ?', [parseInt(id, 10)]);
  if (!player) {
    return res.status(404).json({ error: 'Joueur non trouve' });
  }

  const rankRow = await queryOne(`
    SELECT COUNT(*) + 1 as rank FROM players
    WHERE score > ? AND source_season = ? AND archived = 0
  `, [player.score, CURRENT_SEASON]);

  res.json({ ...player, rank: rankRow ? rankRow.rank : 1 });
}

async function getRanking(req, res) {
  const { context, position, club, search, period, nationality, limit: rawLimit = '50', offset: rawOffset = '0' } = req.query;
  const limit = sanitizeInt(rawLimit, 50);
  const offset = sanitizeInt(rawOffset, 0, 0, 10000);

  // Calcul de la date de début selon la période (en JS, pas en SQL)
  let dateFrom = null;
  if (period === 'week') {
    dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (period === 'month') {
    dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  // 'season' ou undefined = pas de filtre date (tout depuis le début)

  let query, countQuery;
  const params = [];
  const countParams = [];

  if (dateFrom) {
    // Score calculé dynamiquement sur la période
    query = `
      SELECT p.*,
        COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0) as period_score,
        COUNT(v.id) as period_votes,
        COUNT(DISTINCT v.voter_ip) as unique_voters,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0) DESC) as rank
      FROM players p
      LEFT JOIN votes v ON p.id = v.player_id AND v.voted_at >= ?
      WHERE p.source_season = ?
        AND p.archived = 0
    `;
    countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM players p
      LEFT JOIN votes v ON p.id = v.player_id AND v.voted_at >= ?
      WHERE p.source_season = ? AND p.archived = 0
    `;
    params.push(dateFrom, CURRENT_SEASON);
    countParams.push(dateFrom, CURRENT_SEASON);
  } else {
    // Score total (comportement actuel)
    query = `
      SELECT *,
        ROW_NUMBER() OVER (ORDER BY score DESC) as rank,
        (SELECT COUNT(DISTINCT voter_ip) FROM votes WHERE player_id = players.id) as unique_voters
      FROM players
      WHERE source_season = ?
        AND archived = 0
        AND total_votes >= 1
    `;
    countQuery = `
      SELECT COUNT(*) as total FROM players
      WHERE source_season = ? AND archived = 0 AND total_votes >= 1
    `;
    params.push(CURRENT_SEASON);
    countParams.push(CURRENT_SEASON);
  }

  // Préfixe pour les colonnes (p. si période, rien sinon)
  const col = dateFrom ? 'p.' : '';

  if (context && context !== 'ligue1') {
    const clubData = L1_CLUBS.find(c => c.id === context);
    if (clubData) {
      query += ` AND ${col}club = ?`;
      countQuery += ` AND ${col}club = ?`;
      params.push(clubData.name);
      countParams.push(clubData.name);
    }
  }

  if (position && VALID_POSITIONS.includes(position)) {
    query += ` AND ${col}position = ?`;
    countQuery += ` AND ${col}position = ?`;
    params.push(position);
    countParams.push(position);
  }

  if (club) {
    query += ` AND ${col}club = ?`;
    countQuery += ` AND ${col}club = ?`;
    params.push(club);
    countParams.push(club);
  }

  if (search) {
    const cleanSearch = search.slice(0, MAX_SEARCH_LENGTH);
    query += ` AND ${col}name LIKE ?`;
    countQuery += ` AND ${col}name LIKE ?`;
    params.push(`%${cleanSearch}%`);
    countParams.push(`%${cleanSearch}%`);
  }

  if (nationality) {
    query += ` AND ${col}nationality = ?`;
    countQuery += ` AND ${col}nationality = ?`;
    params.push(nationality);
    countParams.push(nationality);
  }

  if (dateFrom) {
    // GROUP BY et filtre sur joueurs ayant des votes dans la période
    query += ' GROUP BY p.id HAVING period_votes >= 1 ORDER BY period_score DESC LIMIT ? OFFSET ?';
  } else {
    query += ' ORDER BY score DESC LIMIT ? OFFSET ?';
  }
  params.push(limit, offset);

  const players = await queryAll(query, params);
  const row = await queryOne(countQuery, countParams);
  const total = row ? row.total : 0;

  // Compter le total de votants uniques pour la période
  let uniqueVotersRow;
  if (dateFrom) {
    uniqueVotersRow = await queryOne(`SELECT COUNT(DISTINCT voter_ip) as count FROM votes WHERE voted_at >= ?`, [dateFrom]);
  } else {
    uniqueVotersRow = await queryOne(`SELECT COUNT(DISTINCT voter_ip) as count FROM votes`);
  }
  const totalUniqueVoters = uniqueVotersRow ? uniqueVotersRow.count : 0;

  // Pour les résultats avec période, utiliser period_score comme score
  const result = dateFrom
    ? players.map(p => ({ ...p, score: p.period_score, total_votes: p.period_votes }))
    : players;

  res.json({ players: result, total, total_unique_voters: totalUniqueVoters });
}

async function getContexts(req, res) {
  const totalRow = await queryOne(`
    SELECT COUNT(*) as count FROM players
    WHERE source_season = ? AND archived = 0
  `, [CURRENT_SEASON]);

  const contexts = [
    { id: 'ligue1', name: 'Ligue 1 complete', player_count: totalRow ? totalRow.count : 0 },
  ];

  for (const club of L1_CLUBS) {
    const row = await queryOne(`
      SELECT COUNT(*) as count FROM players
      WHERE club = ? AND source_season = ? AND archived = 0
    `, [club.name, CURRENT_SEASON]);

    contexts.push({ id: club.id, name: club.shortName, player_count: row ? row.count : 0 });
  }

  res.json({ contexts });
}

async function getRecentMatches(req, res) {
  // Trouver la dernière journée avec au moins un match FINISHED
  const latest = await queryOne(
    `SELECT MAX(matchday) as md FROM matches WHERE status = 'FINISHED' AND season = ?`,
    [CURRENT_SEASON]
  );
  const currentMd = latest?.md || 1;

  const now = new Date();
  const dow = now.getDay(); // 0=Dim, 1=Lun, ..., 6=Sam

  // Vérifier si le dernier match terminé date de plus de 2 jours
  const latestMatch = await queryOne(
    `SELECT match_date FROM matches WHERE status = 'FINISHED' AND season = ? ORDER BY match_date DESC LIMIT 1`,
    [CURRENT_SEASON]
  );
  const daysSinceLastMatch = latestMatch
    ? (now - new Date(latestMatch.match_date)) / (1000 * 60 * 60 * 24)
    : 999;

  let displayMd = currentMd;

  // À partir de mercredi, si pas de match récent, afficher la prochaine journée
  if (daysSinceLastMatch > 2 && dow >= 3) {
    const nextMdExists = await queryOne(
      `SELECT id FROM matches WHERE matchday = ? AND season = ?`,
      [currentMd + 1, CURRENT_SEASON]
    );
    if (nextMdExists) {
      displayMd = currentMd + 1;
    }
  }

  // Récupérer tous les matchs de la journée affichée
  const matches = await queryAll(
    `SELECT * FROM matches WHERE matchday = ? AND season = ? ORDER BY match_date`,
    [displayMd, CURRENT_SEASON]
  );

  // Tri intelligent selon la progression dans la journée
  if (matches.length > 0) {
    const firstMatchDate = new Date(matches[0].match_date);
    firstMatchDate.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const calendarDays = Math.floor((todayStart - firstMatchDate) / (1000 * 60 * 60 * 24));

    if (calendarDays >= 2) {
      // Dimanche+ : reverse chrono (récap, matchs les plus récents d'abord)
      matches.sort((a, b) => new Date(b.match_date) - new Date(a.match_date));
    }
    // Sinon : garder l'ordre chrono de la requête SQL (ORDER BY match_date ASC)
  }

  res.json({ matches, matchday: displayMd });
}

module.exports = { getRandomPlayer, getPlayers, getPlayerById, getRanking, getContexts, getRecentMatches };
