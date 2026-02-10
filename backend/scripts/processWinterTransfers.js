/**
 * Process Winter 2025-2026 Mercato Transfers
 *
 * - Archive players who left L1
 * - Update club for intra-L1 transfers
 * - Add notable new arrivals
 *
 * Usage:
 *   node scripts/processWinterTransfers.js --dry-run   (preview only)
 *   node scripts/processWinterTransfers.js              (execute for real)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { initDb, runSql, queryAll, queryOne } = require('../models/database');

const DRY_RUN = process.argv.includes('--dry-run');
const CURRENT_SEASON = '2025-2026';

// Normalize string for accent-insensitive comparison
function norm(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Find player by last name pattern in a specific club
async function findPlayerInClub(searchName, club) {
  const players = await queryAll(
    'SELECT * FROM players WHERE club = ? AND source_season = ? AND archived = 0',
    [club, CURRENT_SEASON]
  );
  const needle = norm(searchName);
  return players.filter(p => {
    const nameNorm = norm(p.name);
    return nameNorm.includes(needle);
  });
}

// Find player by name across all clubs
async function findPlayerAnywhere(searchName) {
  const players = await queryAll(
    'SELECT * FROM players WHERE source_season = ? AND archived = 0',
    [CURRENT_SEASON]
  );
  const needle = norm(searchName);
  return players.filter(p => norm(p.name).includes(needle));
}

// ============================================================
// 1. DEPARTURES — Players who left Ligue 1 (archive)
// ============================================================
const DEPARTURES = [
  // Marseille
  { search: 'Murillo', club: 'Olympique de Marseille', reason: 'Transfert Besiktas (5M€)' },
  { search: 'Bakola', club: 'Olympique de Marseille', reason: 'Transfert Sassuolo (10M€)' },
  // Monaco
  { search: 'Ilenikhena', club: 'AS Monaco', reason: 'Transfert Al-Ittihad (30M€)' },
  // Rennes
  { search: 'Seko Fofana', club: 'Stade Rennais', reason: 'Prêt FC Porto' },
  // Lens
  { search: 'Guilavogui', club: 'RC Lens', reason: 'Transfert Real Salt Lake (5M€)' },
  // Brest
  { search: 'Le Cardinal', club: 'Stade Brestois 29', reason: 'Transfert Saint-Etienne (1.5M€)' },
  // Nantes
  { search: 'Kwon', club: 'FC Nantes', reason: 'Transfert Karlsruher SC' },
  // Metz
  { search: 'Sabaly', club: 'FC Metz', reason: 'Transfert Vancouver Whitecaps (1M€)' },
  { search: 'Mbaye', club: 'FC Metz', reason: 'Transfert Zulte-Waregem' },
];

// ============================================================
// 2. INTRA-L1 TRANSFERS — Club update only
// ============================================================
const INTRA_L1 = [
  { search: 'Michal', fromClub: 'AS Monaco', toClub: 'FC Metz' },
  { search: 'Abdelli', fromClub: 'Angers SCO', toClub: 'Olympique de Marseille' },
  { search: 'Sylla', fromClub: 'RC Strasbourg Alsace', toClub: 'FC Nantes' },
  { search: 'Kamara', fromClub: 'Paris Saint-Germain', toClub: 'Olympique Lyonnais' },
  { search: 'Edjouma', fromClub: 'Toulouse FC', toClub: 'LOSC Lille' },
];

// ============================================================
// 3. NEW ARRIVALS — Notable signings from outside L1
// ============================================================
const NEW_ARRIVALS = [
  // === Gros noms ===
  {
    first_name: 'Endrick', last_name: 'Endrick', name: 'Endrick',
    club: 'Olympique Lyonnais', position: 'Attaquant', nationality: 'Brésil',
    age: 19, number: 9, photo_url: '',
  },
  {
    first_name: 'Ciro', last_name: 'Immobile', name: 'Ciro Immobile',
    club: 'Paris FC', position: 'Attaquant', nationality: 'Italie',
    age: 36, number: 17, photo_url: '',
  },
  {
    first_name: 'Allan', last_name: 'Saint-Maximin', name: 'Allan Saint-Maximin',
    club: 'RC Lens', position: 'Attaquant', nationality: 'France',
    age: 28, number: 10, photo_url: '',
  },
  {
    first_name: 'Elye', last_name: 'Wahi', name: 'Elye Wahi',
    club: 'OGC Nice', position: 'Attaquant', nationality: 'France',
    age: 22, number: 9, photo_url: '',
  },
  {
    first_name: 'Sebastian', last_name: 'Szymański', name: 'Sebastian Szymański',
    club: 'Stade Rennais', position: 'Milieu', nationality: 'Pologne',
    age: 26, number: 10, photo_url: '',
  },
  {
    first_name: 'Ethan', last_name: 'Nwaneri', name: 'Ethan Nwaneri',
    club: 'Olympique de Marseille', position: 'Milieu', nationality: 'Angleterre',
    age: 18, number: 0, photo_url: '',
  },
  {
    first_name: 'Amadou', last_name: 'Haidara', name: 'Amadou Haidara',
    club: 'RC Lens', position: 'Milieu', nationality: 'Mali',
    age: 28, number: 8, photo_url: '',
  },
  {
    first_name: 'Wout', last_name: 'Faes', name: 'Wout Faes',
    club: 'AS Monaco', position: 'Defenseur', nationality: 'Belgique',
    age: 27, number: 4, photo_url: '',
  },
  {
    first_name: 'Simon', last_name: 'Adingra', name: 'Simon Adingra',
    club: 'AS Monaco', position: 'Attaquant', nationality: 'Côte d\'Ivoire',
    age: 23, number: 0, photo_url: '',
  },
  {
    first_name: 'Dro', last_name: 'Fernández', name: 'Dro Fernández',
    club: 'Paris Saint-Germain', position: 'Milieu', nationality: 'Espagne',
    age: 18, number: 0, photo_url: '',
  },
  // === Transferts importants ===
  {
    first_name: 'Yassir', last_name: 'Zabiri', name: 'Yassir Zabiri',
    club: 'Stade Rennais', position: 'Attaquant', nationality: 'Maroc',
    age: 24, number: 0, photo_url: '',
  },
  {
    first_name: 'Roman', last_name: 'Yaremchuk', name: 'Roman Yaremchuk',
    club: 'Olympique Lyonnais', position: 'Attaquant', nationality: 'Ukraine',
    age: 30, number: 0, photo_url: '',
  },
  {
    first_name: 'Noah', last_name: 'Nartey', name: 'Noah Nartey',
    club: 'Olympique Lyonnais', position: 'Milieu', nationality: 'Danemark',
    age: 26, number: 0, photo_url: '',
  },
  {
    first_name: 'Romain', last_name: 'Faivre', name: 'Romain Faivre',
    club: 'AJ Auxerre', position: 'Milieu', nationality: 'France',
    age: 27, number: 0, photo_url: '',
  },
  {
    first_name: 'Sofiane', last_name: 'Boufal', name: 'Sofiane Boufal',
    club: 'Le Havre AC', position: 'Attaquant', nationality: 'Maroc',
    age: 32, number: 0, photo_url: '',
  },
  {
    first_name: 'Rémy', last_name: 'Cabella', name: 'Rémy Cabella',
    club: 'FC Nantes', position: 'Milieu', nationality: 'France',
    age: 35, number: 0, photo_url: '',
  },
  // === Paris FC (gros mercato) ===
  {
    first_name: 'Luca', last_name: 'Koleosho', name: 'Luca Koleosho',
    club: 'Paris FC', position: 'Attaquant', nationality: 'États-Unis',
    age: 21, number: 0, photo_url: '',
  },
  {
    first_name: 'Marshall', last_name: 'Munetsi', name: 'Marshall Munetsi',
    club: 'Paris FC', position: 'Milieu', nationality: 'Zimbabwe',
    age: 29, number: 0, photo_url: '',
  },
  {
    first_name: 'Diego', last_name: 'Coppola', name: 'Diego Coppola',
    club: 'Paris FC', position: 'Defenseur', nationality: 'Italie',
    age: 22, number: 0, photo_url: '',
  },
  // === Renforts divers ===
  {
    first_name: 'Quinten', last_name: 'Timber', name: 'Quinten Timber',
    club: 'Olympique de Marseille', position: 'Milieu', nationality: 'Pays-Bas',
    age: 24, number: 0, photo_url: '',
  },
  {
    first_name: 'Tochukwu', last_name: 'Nnadi', name: 'Tochukwu Nnadi',
    club: 'Olympique de Marseille', position: 'Attaquant', nationality: 'Nigeria',
    age: 22, number: 0, photo_url: '',
  },
  {
    first_name: 'David', last_name: 'Fofana', name: 'David Datro Fofana',
    club: 'RC Strasbourg Alsace', position: 'Attaquant', nationality: 'Côte d\'Ivoire',
    age: 23, number: 0, photo_url: '',
  },
  {
    first_name: 'Aarón', last_name: 'Anselmino', name: 'Aarón Anselmino',
    club: 'RC Strasbourg Alsace', position: 'Defenseur', nationality: 'Argentine',
    age: 20, number: 0, photo_url: '',
  },
  {
    first_name: 'Branco', last_name: 'van den Boomen', name: 'Branco van den Boomen',
    club: 'Angers SCO', position: 'Milieu', nationality: 'Pays-Bas',
    age: 30, number: 0, photo_url: '',
  },
  {
    first_name: 'Naouirou', last_name: 'Ahamada', name: 'Naouirou Ahamada',
    club: 'AJ Auxerre', position: 'Milieu', nationality: 'France',
    age: 23, number: 0, photo_url: '',
  },
  {
    first_name: 'Bryan', last_name: 'Okoh', name: 'Bryan Okoh',
    club: 'AJ Auxerre', position: 'Defenseur', nationality: 'Suisse',
    age: 22, number: 0, photo_url: '',
  },
  {
    first_name: 'Lucas', last_name: 'Gourna-Douath', name: 'Lucas Gourna-Douath',
    club: 'Le Havre AC', position: 'Milieu', nationality: 'France',
    age: 22, number: 0, photo_url: '',
  },
  {
    first_name: 'Timothée', last_name: 'Pembélé', name: 'Timothée Pembélé',
    club: 'Le Havre AC', position: 'Defenseur', nationality: 'France',
    age: 23, number: 0, photo_url: '',
  },
  {
    first_name: 'Frédéric', last_name: 'Guilbert', name: 'Frédéric Guilbert',
    club: 'FC Nantes', position: 'Defenseur', nationality: 'France',
    age: 31, number: 0, photo_url: '',
  },
  {
    first_name: 'Jacen', last_name: 'Russell-Rowe', name: 'Jacen Russell-Rowe',
    club: 'Toulouse FC', position: 'Attaquant', nationality: 'Canada',
    age: 23, number: 0, photo_url: '',
  },
  {
    first_name: 'Gessime', last_name: 'Yassine', name: 'Gessime Yassine',
    club: 'RC Strasbourg Alsace', position: 'Attaquant', nationality: 'France',
    age: 22, number: 0, photo_url: '',
  },
];

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('==============================================');
  console.log('  MERCATO HIVER 2025-2026 — Traitement');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (aucune modification)' : 'EXECUTION REELLE'}`);
  console.log('==============================================\n');

  await initDb();

  const stats = { archived: 0, clubUpdated: 0, inserted: 0, notFound: [], errors: [] };

  // ────────────────────────────────
  // 1. DEPARTURES
  // ────────────────────────────────
  console.log('━━━ 1. DEPARTS DE LIGUE 1 ━━━\n');

  for (const dep of DEPARTURES) {
    const matches = await findPlayerInClub(dep.search, dep.club);

    if (matches.length === 0) {
      console.log(`  ✗ NOT FOUND: "${dep.search}" at ${dep.club}`);
      stats.notFound.push(`DEPART: ${dep.search} (${dep.club})`);
      continue;
    }

    // If firstName hint provided, narrow down
    let player = matches[0];
    if (dep.firstName && matches.length > 1) {
      const hint = norm(dep.firstName);
      const refined = matches.find(p => norm(p.first_name || '').includes(hint));
      if (refined) player = refined;
    }

    if (matches.length > 1 && !dep.firstName) {
      console.log(`  ⚠ MULTIPLE (${matches.length}): "${dep.search}" at ${dep.club} → using #${player.id} ${player.name}`);
    }

    console.log(`  ✓ ARCHIVE: #${player.id} ${player.name} (${dep.club}) — ${dep.reason}`);

    if (!DRY_RUN) {
      await runSql(
        `UPDATE players SET archived = 1, archived_reason = ?, archived_at = datetime('now') WHERE id = ?`,
        [dep.reason, player.id]
      );
    }
    stats.archived++;
  }

  // ────────────────────────────────
  // 2. INTRA-L1 TRANSFERS
  // ────────────────────────────────
  console.log('\n━━━ 2. TRANSFERTS INTRA-L1 ━━━\n');

  for (const tr of INTRA_L1) {
    const matches = await findPlayerInClub(tr.search, tr.fromClub);

    if (matches.length === 0) {
      // Maybe already updated or different spelling
      console.log(`  ✗ NOT FOUND: "${tr.search}" at ${tr.fromClub}`);
      stats.notFound.push(`INTRA: ${tr.search} (${tr.fromClub} → ${tr.toClub})`);
      continue;
    }

    const player = matches[0];
    console.log(`  ✓ MOVE: #${player.id} ${player.name} : ${tr.fromClub} → ${tr.toClub}`);

    if (!DRY_RUN) {
      await runSql(
        `UPDATE players SET club = ? WHERE id = ?`,
        [tr.toClub, player.id]
      );
    }
    stats.clubUpdated++;
  }

  // ────────────────────────────────
  // 3. NEW ARRIVALS
  // ────────────────────────────────
  console.log('\n━━━ 3. NOUVELLES ARRIVEES ━━━\n');

  for (const arr of NEW_ARRIVALS) {
    // Check if player already exists (maybe under a different club)
    const existing = await findPlayerAnywhere(arr.last_name);
    const exactMatch = existing.find(p =>
      norm(p.first_name || '').includes(norm(arr.first_name)) ||
      norm(arr.first_name).includes(norm(p.first_name || ''))
    );

    if (exactMatch) {
      if (exactMatch.club === arr.club) {
        console.log(`  ○ SKIP (already at ${arr.club}): #${exactMatch.id} ${exactMatch.name}`);
        continue;
      }
      // Player exists but at wrong club → update club
      console.log(`  ✓ MOVE (existing): #${exactMatch.id} ${exactMatch.name} : ${exactMatch.club} → ${arr.club}`);
      if (!DRY_RUN) {
        await runSql(`UPDATE players SET club = ? WHERE id = ?`, [arr.club, exactMatch.id]);
      }
      stats.clubUpdated++;
      continue;
    }

    // Insert new player
    console.log(`  ✓ INSERT: ${arr.name} → ${arr.club} (${arr.position}, ${arr.nationality}, ${arr.age} ans)`);

    if (!DRY_RUN) {
      try {
        await runSql(`
          INSERT INTO players (
            first_name, last_name, name, club, position, nationality,
            photo_url, age, number,
            matches_played, goals, assists,
            source_season
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)
        `, [
          arr.first_name, arr.last_name, arr.name, arr.club, arr.position, arr.nationality,
          arr.photo_url, arr.age, arr.number,
          CURRENT_SEASON,
        ]);
        stats.inserted++;
      } catch (err) {
        console.log(`    ✗ ERROR: ${err.message}`);
        stats.errors.push(`INSERT ${arr.name}: ${err.message}`);
      }
    } else {
      stats.inserted++;
    }
  }

  // ────────────────────────────────
  // SUMMARY
  // ────────────────────────────────
  console.log('\n==============================================');
  console.log('  RESUME');
  console.log('==============================================');
  console.log(`  Joueurs archivés    : ${stats.archived}`);
  console.log(`  Clubs mis à jour    : ${stats.clubUpdated}`);
  console.log(`  Nouveaux insérés    : ${stats.inserted}`);

  if (stats.notFound.length > 0) {
    console.log(`\n  Non trouvés (${stats.notFound.length}) :`);
    stats.notFound.forEach(s => console.log(`    - ${s}`));
  }

  if (stats.errors.length > 0) {
    console.log(`\n  Erreurs (${stats.errors.length}) :`);
    stats.errors.forEach(s => console.log(`    - ${s}`));
  }

  // Show player count per club
  console.log('\n  Effectifs par club (actifs) :');
  const counts = await queryAll(`
    SELECT club, COUNT(*) as count
    FROM players
    WHERE source_season = ? AND archived = 0
    GROUP BY club
    ORDER BY count DESC
  `, [CURRENT_SEASON]);
  counts.forEach(r => console.log(`    ${r.club}: ${r.count}`));

  console.log(`\n${DRY_RUN ? '⚠ DRY RUN — relancer sans --dry-run pour exécuter' : '✓ Terminé !'}`);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
