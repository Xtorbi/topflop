const { queryOne } = require('../models/database');

const MAX_VOTES_PER_DAY = 200;

async function checkIPLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

  const row = await queryOne(
    `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voted_at >= datetime('now', '-1 day')`,
    [ip]
  );
  const votesToday = row ? row.count : 0;

  if (votesToday >= MAX_VOTES_PER_DAY) {
    return res.status(429).json({
      error: 'Limite quotidienne atteinte',
    });
  }

  next();
}

module.exports = { checkIPLimit };
