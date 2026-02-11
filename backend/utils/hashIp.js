const crypto = require('crypto');

const IP_HASH_SECRET = process.env.IP_HASH_SECRET;
if (!IP_HASH_SECRET && process.env.RENDER_EXTERNAL_URL) {
  console.error('[FATAL] IP_HASH_SECRET env var is required in production');
  process.exit(1);
}
const HASH_SECRET = IP_HASH_SECRET || 'dev-only-secret';

function hashIp(ip) {
  return crypto.createHmac('sha256', HASH_SECRET).update(ip).digest('hex');
}

module.exports = { hashIp };
