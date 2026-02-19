/**
 * Fix squad discrepancies found during February 2026 audit.
 *
 * 1. Paris FC: Delete 36 Reading FC players, insert real Paris FC squad
 * 2. OM: Add Dedic, Bennacer, Angel Gomes
 * 3. Rennes: Add Mandanda, Nordin, Junior Ake
 * 4. Brest: Add Amavi, Tavares
 * 5. Lens: Add Mamadou Camara
 * 6. Strasbourg: Add Paez, Dieme, Mamadou Sarr
 * 7. Toulouse: Add missing players
 * 8. Nantes: Add missing players + archive departures
 * 9. Metz: Add missing players
 * 10. Lorient: Add missing players
 *
 * Usage: node -r dotenv/config scripts/fixSquads.js
 */

const { initDb, runSql, queryAll, queryOne } = require('../models/database');

const CURRENT_SEASON = '2025-2026';

async function addPlayer({ firstName, lastName, club, position, nationality, age }) {
  // Check if player already exists (by name + club)
  const existing = await queryOne(
    `SELECT id FROM players WHERE last_name = ? AND club = ? AND archived = 0`,
    [lastName, club]
  );
  if (existing) {
    console.log(`  SKIP (exists): ${firstName} ${lastName} @ ${club}`);
    return false;
  }

  await runSql(`
    INSERT INTO players (first_name, last_name, name, club, position, nationality, age,
                         matches_played, goals, assists, source_season, archived)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 0)
  `, [firstName, lastName, `${firstName} ${lastName}`, club, position, nationality, age, CURRENT_SEASON]);

  console.log(`  ADD: ${firstName} ${lastName} @ ${club} (${position})`);
  return true;
}

async function archivePlayer(lastName, club) {
  const player = await queryOne(
    `SELECT id, first_name, last_name FROM players WHERE last_name = ? AND club = ? AND archived = 0`,
    [lastName, club]
  );
  if (!player) {
    console.log(`  SKIP (not found): ${lastName} @ ${club}`);
    return false;
  }
  await runSql(`UPDATE players SET archived = 1 WHERE id = ?`, [player.id]);
  console.log(`  ARCHIVE: ${player.first_name} ${player.last_name} (#${player.id}) @ ${club}`);
  return true;
}

async function main() {
  await initDb();
  console.log('DB connected.\n');

  let added = 0;
  let archived = 0;
  let deleted = 0;

  // ===== 1. PARIS FC: Delete all Reading FC players =====
  console.log('=== PARIS FC: Suppression des joueurs de Reading FC ===');
  const parisFcPlayers = await queryAll(
    `SELECT id, first_name, last_name FROM players WHERE club = 'Paris FC'`
  );
  console.log(`  ${parisFcPlayers.length} joueurs Paris FC (Reading) à supprimer`);

  // Delete votes on these fake players first (FK constraint)
  const votesDeleted = await runSql(
    `DELETE FROM votes WHERE player_id IN (SELECT id FROM players WHERE club = 'Paris FC')`
  );
  console.log(`  Votes supprimés sur faux joueurs`);

  // Now delete the players
  await runSql(`DELETE FROM players WHERE club = 'Paris FC'`);
  deleted = parisFcPlayers.length;
  console.log(`  ${deleted} joueurs Reading FC supprimés\n`);

  // Insert real Paris FC squad
  console.log('=== PARIS FC: Insertion du vrai effectif ===');
  const parisFcSquad = [
    { firstName: 'Rémy', lastName: 'Riou', position: 'Gardien', nationality: 'France', age: 38 },
    { firstName: 'Obed', lastName: 'Nkambadio', position: 'Gardien', nationality: 'France', age: 24 },
    { firstName: 'Kevin', lastName: 'Trapp', position: 'Gardien', nationality: 'Allemagne', age: 35 },
    { firstName: 'Tuomas', lastName: 'Ollila', position: 'Defenseur', nationality: 'Finlande', age: 24 },
    { firstName: 'Mamadou', lastName: 'Mbow', position: 'Defenseur', nationality: 'Sénégal', age: 23 },
    { firstName: 'Otávio', lastName: 'Otávio', position: 'Defenseur', nationality: 'Brésil', age: 30 },
    { firstName: 'Hamari', lastName: 'Traoré', position: 'Defenseur', nationality: 'Mali', age: 32 },
    { firstName: 'Timothée', lastName: 'Kolodziejczak', position: 'Defenseur', nationality: 'France', age: 33 },
    { firstName: 'Nhoa', lastName: 'Sangui', position: 'Defenseur', nationality: 'France', age: 20 },
    { firstName: 'Sofiane', lastName: 'Alakouch', position: 'Defenseur', nationality: 'France', age: 27 },
    { firstName: 'Thibault', lastName: 'De Smet', position: 'Defenseur', nationality: 'Belgique', age: 25 },
    { firstName: 'Samir', lastName: 'Chergui', position: 'Defenseur', nationality: 'Algérie', age: 23 },
    { firstName: 'Diego', lastName: 'Coppola', position: 'Defenseur', nationality: 'Italie', age: 21 },
    { firstName: 'Vincent', lastName: 'Marchetti', position: 'Milieu', nationality: 'France', age: 32 },
    { firstName: 'Ilan', lastName: 'Kebbal', position: 'Milieu', nationality: 'Algérie', age: 28 },
    { firstName: 'Adama', lastName: 'Camara', position: 'Milieu', nationality: 'Guinée', age: 27 },
    { firstName: 'Marshall', lastName: 'Munetsi', position: 'Milieu', nationality: 'Zimbabwe', age: 28 },
    { firstName: 'Julien', lastName: 'Lopez', position: 'Milieu', nationality: 'France', age: 31 },
    { firstName: 'Maxime', lastName: 'Lopez', position: 'Milieu', nationality: 'France', age: 27 },
    { firstName: 'Lamine', lastName: 'Gueye', position: 'Milieu', nationality: 'Sénégal', age: 24 },
    { firstName: 'Pierre-Yves', lastName: 'Hamel', position: 'Milieu', nationality: 'France', age: 32 },
    { firstName: 'Pierre', lastName: 'Lees-Melou', position: 'Milieu', nationality: 'France', age: 30 },
    { firstName: 'Rudy', lastName: 'Matondo', position: 'Milieu', nationality: 'France', age: 22 },
    { firstName: 'Alimami', lastName: 'Gory', position: 'Attaquant', nationality: 'Guinée', age: 24 },
    { firstName: 'Willem', lastName: 'Geubbels', position: 'Attaquant', nationality: 'France', age: 23 },
    { firstName: 'Jean-Philippe', lastName: 'Krasso', position: 'Attaquant', nationality: "Côte d'Ivoire", age: 28 },
    { firstName: 'Mathieu', lastName: 'Cafaro', position: 'Attaquant', nationality: 'France', age: 28 },
    { firstName: 'Luca', lastName: 'Koleosho', position: 'Attaquant', nationality: 'Italie', age: 20 },
    { firstName: 'Moses', lastName: 'Simon', position: 'Attaquant', nationality: 'Nigeria', age: 29 },
    { firstName: 'Ciro', lastName: 'Immobile', position: 'Attaquant', nationality: 'Italie', age: 36 },
    { firstName: 'Jonathan', lastName: 'Ikoné', position: 'Attaquant', nationality: 'France', age: 27 },
  ];
  for (const p of parisFcSquad) {
    const ok = await addPlayer({ ...p, club: 'Paris FC' });
    if (ok) added++;
  }

  // ===== 2. OM: Add missing players =====
  console.log('\n=== OM: Ajouts ===');
  const omPlayers = [
    { firstName: 'Amar', lastName: 'Dedic', position: 'Defenseur', nationality: 'Bosnie-Herzégovine', age: 22 },
    { firstName: 'Ismaël', lastName: 'Bennacer', position: 'Milieu', nationality: 'Algérie', age: 27 },
    { firstName: 'Angel', lastName: 'Gomes', position: 'Milieu', nationality: 'Angleterre', age: 25 },
  ];
  for (const p of omPlayers) {
    const ok = await addPlayer({ ...p, club: 'Olympique de Marseille' });
    if (ok) added++;
  }

  // ===== 3. RENNES: Add missing players =====
  console.log('\n=== RENNES: Ajouts ===');
  const rennesPlayers = [
    { firstName: 'Steve', lastName: 'Mandanda', position: 'Gardien', nationality: 'France', age: 39 },
    { firstName: 'Arnaud', lastName: 'Nordin', position: 'Attaquant', nationality: 'France', age: 27 },
    { firstName: 'Junior', lastName: 'Ake', position: 'Defenseur', nationality: 'France', age: 22 },
  ];
  for (const p of rennesPlayers) {
    const ok = await addPlayer({ ...p, club: 'Stade Rennais' });
    if (ok) added++;
  }

  // ===== 4. BREST: Add missing players =====
  console.log('\n=== BREST: Ajouts ===');
  const brestPlayers = [
    { firstName: 'Jordan', lastName: 'Amavi', position: 'Defenseur', nationality: 'France', age: 31 },
    { firstName: 'Heriberto', lastName: 'Tavares', position: 'Attaquant', nationality: 'Portugal', age: 29 },
  ];
  for (const p of brestPlayers) {
    const ok = await addPlayer({ ...p, club: 'Stade Brestois 29' });
    if (ok) added++;
  }

  // ===== 5. LENS: Add missing players =====
  console.log('\n=== LENS: Ajouts ===');
  const lensPlayers = [
    { firstName: 'Mamadou', lastName: 'Camara', position: 'Milieu', nationality: 'Mali', age: 24 },
  ];
  for (const p of lensPlayers) {
    const ok = await addPlayer({ ...p, club: 'RC Lens' });
    if (ok) added++;
  }

  // ===== 6. STRASBOURG: Add missing players =====
  console.log('\n=== STRASBOURG: Ajouts ===');
  const strasbourgPlayers = [
    { firstName: 'Kendry', lastName: 'Paez', position: 'Milieu', nationality: 'Équateur', age: 17 },
    { firstName: 'Yaya', lastName: 'Dieme', position: 'Attaquant', nationality: 'Sénégal', age: 22 },
    { firstName: 'Mamadou', lastName: 'Sarr', position: 'Defenseur', nationality: 'France', age: 20 },
  ];
  for (const p of strasbourgPlayers) {
    const ok = await addPlayer({ ...p, club: 'RC Strasbourg Alsace' });
    if (ok) added++;
  }

  // ===== 7. TOULOUSE: Add missing players =====
  console.log('\n=== TOULOUSE: Ajouts ===');
  const toulousePlayers = [
    { firstName: 'Niklas', lastName: 'Schmidt', position: 'Milieu', nationality: 'Allemagne', age: 27 },
    { firstName: 'Darris', lastName: 'Zema', position: 'Milieu', nationality: 'France', age: 22 },
    { firstName: 'Frédéric', lastName: 'Efuele', position: 'Milieu', nationality: 'France', age: 20 },
    { firstName: 'Noah', lastName: 'Lahmadi', position: 'Milieu', nationality: 'Maroc', age: 19 },
    { firstName: 'Ilyas', lastName: 'Azizi', position: 'Attaquant', nationality: 'Maroc', age: 20 },
    { firstName: 'Naïme Saïd', lastName: 'Mchindra', position: 'Gardien', nationality: 'Comores', age: 24 },
    { firstName: 'Gaëtan', lastName: 'Bakhouche', position: 'Defenseur', nationality: 'Algérie', age: 22 },
    { firstName: 'Nicolas', lastName: 'Wasbauer', position: 'Defenseur', nationality: 'France', age: 21 },
    { firstName: 'Mathis', lastName: 'Saka', position: 'Milieu', nationality: 'France', age: 20 },
  ];
  for (const p of toulousePlayers) {
    const ok = await addPlayer({ ...p, club: 'Toulouse FC' });
    if (ok) added++;
  }

  // ===== 8. NANTES: Add missing + archive departures =====
  console.log('\n=== NANTES: Archives ===');
  const nantesArchive = ['Ganago', 'Carlgren', 'Cabella'];
  for (const name of nantesArchive) {
    const ok = await archivePlayer(name, 'FC Nantes');
    if (ok) archived++;
  }

  console.log('\n=== NANTES: Ajouts ===');
  const nantesPlayers = [
    { firstName: 'Tino', lastName: 'Kadewere', position: 'Attaquant', nationality: 'Zimbabwe', age: 29 },
    { firstName: 'Mayckel', lastName: 'Lahdo', position: 'Attaquant', nationality: 'Suède', age: 22 },
    { firstName: 'Plamedi', lastName: 'Nsingi', position: 'Attaquant', nationality: 'RD Congo', age: 22 },
    { firstName: 'Nicolas', lastName: 'Pallois', position: 'Defenseur', nationality: 'France', age: 38 },
    { firstName: 'Jean-Kévin', lastName: 'Duverne', position: 'Defenseur', nationality: 'France', age: 28 },
    { firstName: 'Florent', lastName: 'Mollet', position: 'Milieu', nationality: 'France', age: 34 },
    { firstName: 'Hyun-Seok', lastName: 'Hong', position: 'Milieu', nationality: 'Corée du Sud', age: 25 },
    { firstName: 'Al-Musrati', lastName: 'Al-Musrati', position: 'Milieu', nationality: 'Libye', age: 28 },
    { firstName: 'Armel', lastName: 'Bella-Kotchap', position: 'Defenseur', nationality: 'Allemagne', age: 23 },
    { firstName: 'Sorba', lastName: 'Thomas', position: 'Defenseur', nationality: 'Pays de Galles', age: 25 },
  ];
  for (const p of nantesPlayers) {
    const ok = await addPlayer({ ...p, club: 'FC Nantes' });
    if (ok) added++;
  }

  // ===== 9. METZ: Add missing players =====
  console.log('\n=== METZ: Ajouts ===');
  const metzPlayers = [
    { firstName: 'Farid', lastName: 'Boulaya', position: 'Milieu', nationality: 'Algérie', age: 32 },
    { firstName: 'Kevin', lastName: 'Van Den Kerkhof', position: 'Milieu', nationality: 'France', age: 29 },
    { firstName: 'Ablie', lastName: 'Jallow', position: 'Attaquant', nationality: 'Gambie', age: 26 },
    { firstName: 'Ismaël', lastName: 'Traoré', position: 'Defenseur', nationality: "Côte d'Ivoire", age: 39 },
    { firstName: 'Bouna', lastName: 'Sarr', position: 'Defenseur', nationality: 'Sénégal', age: 32 },
  ];
  for (const p of metzPlayers) {
    const ok = await addPlayer({ ...p, club: 'FC Metz' });
    if (ok) added++;
  }

  // ===== 10. LORIENT: Add missing players =====
  console.log('\n=== LORIENT: Ajouts ===');
  const lorientPlayers = [
    { firstName: 'Dani', lastName: 'Semedo', position: 'Defenseur', nationality: 'Portugal', age: 28 },
    { firstName: 'Adil', lastName: 'Aouchiche', position: 'Milieu', nationality: 'France', age: 22 },
    { firstName: 'Stéphane', lastName: 'Diarra', position: 'Milieu', nationality: 'Mali', age: 26 },
  ];
  for (const p of lorientPlayers) {
    const ok = await addPlayer({ ...p, club: 'FC Lorient' });
    if (ok) added++;
  }

  // ===== SUMMARY =====
  console.log('\n===========================================');
  console.log('  CORRECTIONS TERMINÉES');
  console.log('===========================================');
  console.log(`  Joueurs ajoutés: ${added}`);
  console.log(`  Joueurs archivés: ${archived}`);
  console.log(`  Joueurs supprimés (Reading FC): ${deleted}`);

  // Final count
  const total = await queryOne(`SELECT COUNT(*) as count FROM players WHERE archived = 0`);
  console.log(`\n  Total joueurs actifs: ${total.count}`);

  const byClub = await queryAll(
    `SELECT club, COUNT(*) as count FROM players WHERE archived = 0 GROUP BY club ORDER BY club`
  );
  console.log('\n  Par club:');
  byClub.forEach(row => console.log(`    ${row.club}: ${row.count}`));
}

main().catch(err => {
  console.error('ERREUR:', err);
  process.exit(1);
});
