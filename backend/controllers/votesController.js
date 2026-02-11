const { queryOne, runSql } = require('../models/database');
const { CURRENT_SEASON } = require('../config/clubs');
const { hashIp } = require('../utils/hashIp');

async function handleVote(req, res) {
  const { player_id, vote, context = 'ligue1' } = req.body;

  // Récupérer l'IP du votant puis la hasher (RGPD)
  const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown';
  const voterIp = hashIp(rawIp);

  // Validation
  if (!player_id || !['up', 'neutral', 'down'].includes(vote)) {
    return res.status(400).json({ error: 'Parametres invalides' });
  }

  const player = await queryOne(
    'SELECT * FROM players WHERE id = ? AND source_season = ? AND archived = 0',
    [player_id, CURRENT_SEASON]
  );

  if (!player) {
    return res.status(404).json({ error: 'Joueur non trouve' });
  }

  // Anti-spam : 1 vote par joueur par IP toutes les 24h
  const existing = await queryOne(
    `SELECT id FROM votes WHERE player_id = ? AND voter_ip = ? AND voted_at > datetime('now', '-24 hours')`,
    [player_id, voterIp]
  );
  if (existing) {
    return res.status(429).json({ error: 'already_voted', message: 'Tu as déjà voté pour ce joueur aujourd\'hui' });
  }

  // Get old rank
  const oldRankRow = await queryOne(`
    SELECT COUNT(*) + 1 as rank FROM players
    WHERE score > ? AND source_season = ? AND archived = 0
  `, [player.score, CURRENT_SEASON]);
  const oldRank = oldRankRow ? oldRankRow.rank : 1;

  // Record vote
  await runSql('INSERT INTO votes (player_id, vote_type, context, voter_ip) VALUES (?, ?, ?, ?)',
    [player_id, vote, context, voterIp]);

  // Update player scores (requetes distinctes, pas d'interpolation)
  if (vote === 'up') {
    await runSql(`UPDATE players SET upvotes = upvotes + 1, total_votes = total_votes + 1, score = score + 1, updated_at = datetime('now') WHERE id = ?`, [player_id]);
  } else if (vote === 'down') {
    await runSql(`UPDATE players SET downvotes = downvotes + 1, total_votes = total_votes + 1, score = score - 1, updated_at = datetime('now') WHERE id = ?`, [player_id]);
  } else {
    await runSql(`UPDATE players SET neutral_votes = neutral_votes + 1, total_votes = total_votes + 1, updated_at = datetime('now') WHERE id = ?`, [player_id]);
  }

  // Get updated player and new rank
  const updated = await queryOne('SELECT * FROM players WHERE id = ?', [player_id]);
  const newRankRow = await queryOne(`
    SELECT COUNT(*) + 1 as rank FROM players
    WHERE score > ? AND source_season = ? AND archived = 0
  `, [updated.score, CURRENT_SEASON]);
  const newRank = newRankRow ? newRankRow.rank : 1;

  // Build feedback message
  let message;
  const rankChange = oldRank - newRank;
  if (rankChange > 0) {
    message = `${player.name} est passe de #${oldRank} a #${newRank} !`;
  } else if (rankChange < 0) {
    message = `${player.name} : #${oldRank} -> #${newRank}`;
  } else {
    message = `Ton vote compte ! ${player.name} reste #${newRank}`;
  }

  res.json({
    success: true,
    player: {
      new_score: updated.score,
      old_rank: oldRank,
      new_rank: newRank,
      rank_change: rankChange,
    },
    message,
  });
}

module.exports = { handleVote };
