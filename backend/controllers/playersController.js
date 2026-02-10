const { queryAll, queryOne } = require('../models/database');
const { CURRENT_SEASON, CLUB_POPULARITY, L1_CLUBS } = require('../config/clubs');

const VALID_POSITIONS = ['Gardien', 'Défenseur', 'Milieu', 'Attaquant'];
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

  // Répartir en buckets par récence du dernier match joué (last_match_date)
  // 80% → Joueurs ayant joué dans les 24h
  // 15% → Joueurs ayant joué entre 24h et 48h
  // 4%  → Joueurs ayant joué entre 48h et 72h
  // 1%  → Reste (pas de match récent)
  const buckets = { current: [], jMinus1: [], jMinus2: [], older: [] };
  const now = Date.now();

  for (const player of allPlayers) {
    if (player.last_match_date) {
      const matchTime = new Date(player.last_match_date).getTime();
      const hoursAgo = (now - matchTime) / (1000 * 60 * 60);

      if (hoursAgo < 24) buckets.current.push(player);
      else if (hoursAgo < 48) buckets.jMinus1.push(player);
      else if (hoursAgo < 72) buckets.jMinus2.push(player);
      else buckets.older.push(player);
    } else {
      buckets.older.push(player);
    }
  }

  // Sélection 80/15/4/1 avec fallback
  const roll = Math.random() * 100;
  let bucket;

  if (roll < 80 && buckets.current.length > 0) {
    bucket = buckets.current;
  } else if (roll < 95 && buckets.jMinus1.length > 0) {
    bucket = buckets.jMinus1;
  } else if (roll < 99 && buckets.jMinus2.length > 0) {
    bucket = buckets.jMinus2;
  } else if (buckets.older.length > 0) {
    bucket = buckets.older;
  } else {
    // Fallback: combiner tous les buckets disponibles
    bucket = buckets.current.concat(buckets.jMinus1, buckets.jMinus2);
    if (bucket.length === 0) bucket = allPlayers;
  }

  // Sélection aléatoire pondérée dans le bucket
  // Favorise : joueurs du dernier match, grands clubs, titulaires, performants
  const weights = bucket.map(p => {
    const baseWeight = 50;

    // Bonus fraîcheur match (0-100) : boost énorme si match récent
    let freshnessBonus = 0;
    if (p.last_match_date) {
      const matchTime = new Date(p.last_match_date).getTime();
      const hoursAgo = (now - matchTime) / (1000 * 60 * 60);
      if (hoursAgo < 6) freshnessBonus = 100;        // Match vient de finir !
      else if (hoursAgo < 24) freshnessBonus = 60;   // Hier soir
      else if (hoursAgo < 48) freshnessBonus = 30;   // Avant-hier
      else if (hoursAgo < 72) freshnessBonus = 15;   // Dans les 3 jours
    }

    // Bonus club (0-50) : PSG=50, OM=40, Lyon=30...
    const clubBonus = (CLUB_POPULARITY[p.club] || 10) * 0.5;

    // Bonus titulaire (0-30) : plus de matchs = plus visible
    const matchesBonus = Math.min(30, (p.matches_played || 0) * 1.5);

    // Bonus stats (0-20) : buts + passes décisives
    const statsBonus = Math.min(20, ((p.goals || 0) + (p.assists || 0)) * 2);

    // Légère pénalité si déjà beaucoup voté (pour varier, mais réduite)
    const votePenalty = Math.min(15, Math.log(p.total_votes + 1) * 3);

    return Math.max(1, baseWeight + freshnessBonus + clubBonus + matchesBonus + statsBonus - votePenalty);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < bucket.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return res.json(bucket[i]);
    }
  }

  res.json(bucket[bucket.length - 1]);
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

  // Calcul de la date de début selon la période
  let dateFilter = null;
  if (period === 'week') {
    dateFilter = "datetime('now', '-7 days')";
  } else if (period === 'month') {
    dateFilter = "datetime('now', '-30 days')";
  }
  // 'season' ou undefined = pas de filtre date (tout depuis le début)

  let query, countQuery;
  const params = [];
  const countParams = [];

  if (dateFilter) {
    // Score calculé dynamiquement sur la période
    query = `
      SELECT p.*,
        COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0) as period_score,
        COUNT(v.id) as period_votes,
        COUNT(DISTINCT v.voter_ip) as unique_voters,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0) DESC) as rank
      FROM players p
      LEFT JOIN votes v ON p.id = v.player_id AND v.voted_at >= ${dateFilter}
      WHERE p.source_season = ?
        AND p.archived = 0
    `;
    countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM players p
      LEFT JOIN votes v ON p.id = v.player_id AND v.voted_at >= ${dateFilter}
      WHERE p.source_season = ? AND p.archived = 0
    `;
    params.push(CURRENT_SEASON);
    countParams.push(CURRENT_SEASON);
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
  const col = dateFilter ? 'p.' : '';

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

  if (dateFilter) {
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
  let totalUniqueVotersQuery;
  if (dateFilter) {
    totalUniqueVotersQuery = `SELECT COUNT(DISTINCT voter_ip) as count FROM votes WHERE voted_at >= ${dateFilter}`;
  } else {
    totalUniqueVotersQuery = `SELECT COUNT(DISTINCT voter_ip) as count FROM votes`;
  }
  const uniqueVotersRow = await queryOne(totalUniqueVotersQuery);
  const totalUniqueVoters = uniqueVotersRow ? uniqueVotersRow.count : 0;

  // Pour les résultats avec période, utiliser period_score comme score
  const result = dateFilter
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
