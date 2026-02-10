const crypto = require('crypto');
const { queryOne } = require('../models/database');

const MAX_VOTES_PER_DAY = 200;
const IP_HASH_SECRET = process.env.IP_HASH_SECRET || 'topflop-default-salt-change-me';

function hashIp(ip) {
  return crypto.createHmac('sha256', IP_HASH_SECRET).update(ip).digest('hex');
}

async function checkIPLimit(req, res, next) {
  const ip = hashIp(req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip);

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
