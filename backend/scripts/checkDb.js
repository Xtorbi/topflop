const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { initDb, queryAll, queryOne } = require('../models/database');

async function check() {
  await initDb();

  // Total joueurs
  const totalRow = await queryOne('SELECT COUNT(*) as count FROM players');
  console.log('=== STATISTIQUES BASE DE DONNEES ===');
  console.log('');
  console.log('Total joueurs:', totalRow?.count || 0);

  // Par club
  console.log('');
  console.log('--- Joueurs par club ---');
  const byClub = await queryAll('SELECT club, COUNT(*) as count FROM players GROUP BY club ORDER BY count DESC');
  byClub.forEach(row => console.log(row.club + ': ' + row.count));

  // Par position
  console.log('');
  console.log('--- Joueurs par position ---');
  const byPos = await queryAll('SELECT position, COUNT(*) as count FROM players GROUP BY position ORDER BY count DESC');
  byPos.forEach(row => console.log(row.position + ': ' + row.count));

  // Avec matchs joués
  console.log('');
  console.log('--- Activite ---');
  const withMatches = await queryOne('SELECT COUNT(*) as count FROM players WHERE matches_played > 0');
  console.log('Joueurs avec au moins 1 match:', withMatches?.count || 0);

  // Top 5 joueurs (par buts)
  console.log('');
  console.log('--- Top 5 buteurs ---');
  const top = await queryAll('SELECT name, club, goals, matches_played FROM players WHERE goals > 0 ORDER BY goals DESC LIMIT 5');
  top.forEach(row => console.log(row.name + ' (' + row.club + '): ' + row.goals + ' buts en ' + row.matches_played + ' matchs'));

  // Votes
  console.log('');
  console.log('--- Votes ---');
  const votesRow = await queryOne('SELECT SUM(total_votes) as total, SUM(upvotes) as up, SUM(downvotes) as down FROM players');
  if (votesRow) {
    console.log('Total votes:', votesRow.total || 0);
    console.log('Upvotes:', votesRow.up || 0);
    console.log('Downvotes:', votesRow.down || 0);
  }

  // Sample de 5 joueurs
  console.log('');
  console.log('--- Exemple de joueurs ---');
  const sample = await queryAll('SELECT id, name, club, position, nationality, matches_played, goals, assists, photo_url FROM players LIMIT 5');
  sample.forEach(row => {
    console.log('ID ' + row.id + ': ' + row.name);
    console.log('   Club: ' + row.club + ' | Poste: ' + row.position + ' | Nat: ' + row.nationality);
    console.log('   Stats: ' + row.matches_played + ' matchs, ' + row.goals + ' buts, ' + row.assists + ' passes');
    console.log('   Photo: ' + (row.photo_url ? 'OK' : 'MANQUANTE'));
    console.log('');
  });

  // Saison
  console.log('--- Saison ---');
  const seasons = await queryAll('SELECT DISTINCT source_season FROM players');
  console.log('Saison(s):', seasons.map(r => r.source_season).join(', '));
}

check().catch(console.error);
