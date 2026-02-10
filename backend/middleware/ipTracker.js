const crypto = require('crypto');
const { queryOne } = require('../models/database');

const MAX_VOTES_PER_DAY = 500;
const IP_HASH_SECRET = process.env.IP_HASH_SECRET;
if (!IP_HASH_SECRET && process.env.RENDER_EXTERNAL_URL) {
  console.error('[FATAL] IP_HASH_SECRET env var is required in production');
  process.exit(1);
}
const HASH_SECRET = IP_HASH_SECRET || 'dev-only-secret';

function hashIp(ip) {
  return crypto.createHmac('sha256', HASH_SECRET).update(ip).digest('hex');
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
