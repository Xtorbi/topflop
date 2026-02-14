/**
 * Purge voter IPs — conformite RGPD
 *
 * Anonymise les IPs hashees des votes anterieurs a une date donnee.
 * A executer manuellement en fin de saison ou via cron.
 *
 * Usage :
 *   node scripts/purgeVoterIps.js                    # purge votes > 1 an
 *   node scripts/purgeVoterIps.js 2025-06-01          # purge votes avant le 1er juin 2025
 */
require('dotenv').config();
const { runSql, queryOne } = require('../models/database');
const { initDb } = require('../models/database');

async function main() {
  await initDb();

  // Date limite : argument CLI ou 1 an en arriere par defaut
  const cutoffArg = process.argv[2];
  const cutoff = cutoffArg
    ? new Date(cutoffArg).toISOString()
    : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  console.log(`Purging voter_ip for votes before ${cutoff}...`);

  // Compter les votes concernes
  const countRow = await queryOne(
    'SELECT COUNT(*) as count FROM votes WHERE voter_ip IS NOT NULL AND voted_at < ?',
    [cutoff]
  );
  const count = countRow?.count || 0;

  if (count === 0) {
    console.log('No votes to purge.');
    return;
  }

  console.log(`Found ${count} votes with voter_ip to anonymize.`);

  // Anonymiser
  const result = await runSql(
    'UPDATE votes SET voter_ip = NULL WHERE voter_ip IS NOT NULL AND voted_at < ?',
    [cutoff]
  );

  console.log(`Done. ${result.rowsAffected || count} voter IPs set to NULL.`);
}

main().catch(err => {
  console.error('Purge failed:', err);
  process.exit(1);
});
