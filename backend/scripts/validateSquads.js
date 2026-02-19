/**
 * validateSquads.js — Validation des effectifs L1
 *
 * Détecte les anomalies : tmId mismatch, clubs inconnus, effectifs suspects,
 * nationalités anglaises (bug Reading FC), doublons, votes orphelins, positions invalides.
 *
 * Usage: node -r dotenv/config scripts/validateSquads.js
 * Exit code: 0 si aucune ERROR, 1 sinon
 */

const path = require('path');
const { queryAll, queryOne } = require('../models/database');
const { L1_CLUBS } = require('../config/clubs');

// Frontend clubs.js is ESM — parse it manually
const fs = require('fs');
const frontendClubsPath = path.join(__dirname, '../../frontend/src/config/clubs.js');

function parseFrontendTmIds() {
  const src = fs.readFileSync(frontendClubsPath, 'utf-8');
  const ids = {};
  // Match lines like: { id: 'psg', name: 'Paris SG', tmId: 583, ...
  const regex = /id:\s*'(\w+)'.*?tmId:\s*(\d+)/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    ids[match[1]] = parseInt(match[2], 10);
  }
  return ids;
}

const VALID_POSITIONS = ['Gardien', 'Defenseur', 'Milieu', 'Attaquant'];
const ENGLISH_NATIONALITIES = ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Angleterre', 'Écosse', 'Pays de Galles'];
const ENGLISH_THRESHOLD = 0.6; // 60%
const MIN_SQUAD = 18;
const MAX_SQUAD = 40;

let errors = 0;
let warns = 0;
let infos = 0;

function logError(msg) { errors++; console.log(`[ERROR] ${msg}`); }
function logWarn(msg) { warns++; console.log(`[WARN]  ${msg}`); }
function logInfo(msg) { infos++; console.log(`[INFO]  ${msg}`); }
function logOk(msg) { console.log(`[OK]    ${msg}`); }

async function run() {
  console.log('=== VALIDATION EFFECTIFS ===\n');

  const validClubNames = L1_CLUBS.map(c => c.name);

  // 1. tmId sync frontend ↔ backend
  const frontendTmIds = parseFrontendTmIds();
  const backendTmIds = {};
  L1_CLUBS.forEach(c => { backendTmIds[c.id] = c.tmId; });

  let tmIdMismatches = 0;
  for (const club of L1_CLUBS) {
    const feTmId = frontendTmIds[club.id];
    if (feTmId === undefined) {
      logError(`tmId sync: club "${club.id}" absent du frontend`);
      tmIdMismatches++;
    } else if (feTmId !== club.tmId) {
      logError(`tmId sync: "${club.id}" backend=${club.tmId} frontend=${feTmId}`);
      tmIdMismatches++;
    }
  }
  // Check frontend clubs missing from backend
  for (const [id, tmId] of Object.entries(frontendTmIds)) {
    if (!backendTmIds[id]) {
      logError(`tmId sync: club "${id}" (tmId=${tmId}) present en frontend mais absent du backend`);
      tmIdMismatches++;
    }
  }
  if (tmIdMismatches === 0) {
    logOk(`tmId sync: ${L1_CLUBS.length}/${L1_CLUBS.length} clubs synchronisés`);
  }

  // 2. Clubs valides en BDD
  const dbClubs = await queryAll(
    `SELECT DISTINCT club, COUNT(*) as cnt FROM players WHERE archived = 0 AND source_season = '2025-2026' GROUP BY club`
  );
  let unknownClubs = 0;
  for (const row of dbClubs) {
    if (!validClubNames.includes(row.club)) {
      logError(`Club inconnu en BDD: "${row.club}" (${row.cnt} joueurs)`);
      unknownClubs++;
    }
  }
  if (unknownClubs === 0) {
    logOk(`Clubs BDD: ${dbClubs.length}/${L1_CLUBS.length} clubs reconnus`);
  }

  // 3. Effectif par club + 4. Nationalités suspectes
  for (const club of L1_CLUBS) {
    const players = await queryAll(
      `SELECT nationality FROM players WHERE club = ? AND archived = 0 AND source_season = '2025-2026'`,
      [club.name]
    );
    const count = players.length;

    if (count < MIN_SQUAD) {
      logWarn(`${club.shortName}: ${count} joueurs actifs (< ${MIN_SQUAD})`);
    } else if (count > MAX_SQUAD) {
      logWarn(`${club.shortName}: ${count} joueurs actifs (> ${MAX_SQUAD})`);
    }

    // Nationalités anglaises
    const englishCount = players.filter(p => ENGLISH_NATIONALITIES.includes(p.nationality)).length;
    if (count > 0) {
      const pct = englishCount / count;
      if (pct >= ENGLISH_THRESHOLD) {
        logWarn(`${club.shortName}: ${Math.round(pct * 100)}% nationalité anglaise/britannique — effectif suspect !`);
      }
    }
  }

  // 5. Joueurs sans match
  const noMatch = await queryAll(
    `SELECT club, COUNT(*) as cnt FROM players WHERE matches_played = 0 AND archived = 0 AND source_season = '2025-2026' GROUP BY club ORDER BY cnt DESC`
  );
  const totalNoMatch = noMatch.reduce((sum, r) => sum + r.cnt, 0);
  if (totalNoMatch > 0) {
    const clubShort = (name) => { const c = L1_CLUBS.find(x => x.name === name); return c ? c.shortName : name; };
    logInfo(`${totalNoMatch} joueurs avec 0 match joué (${noMatch.map(r => `${clubShort(r.club)}:${r.cnt}`).join(', ')})`);
  } else {
    logOk('Tous les joueurs ont au moins 1 match');
  }

  // 6. Doublons (même nom + même club)
  const dupes = await queryAll(
    `SELECT name, club, COUNT(*) as cnt FROM players WHERE archived = 0 AND source_season = '2025-2026' GROUP BY name, club HAVING cnt > 1`
  );
  if (dupes.length > 0) {
    for (const d of dupes) {
      logWarn(`Doublon: "${d.name}" × ${d.cnt} dans ${d.club}`);
    }
  } else {
    logOk('Pas de doublons détectés');
  }

  // 7. Votes orphelins
  const orphans = await queryOne(
    `SELECT COUNT(*) as cnt FROM votes v LEFT JOIN players p ON v.player_id = p.id WHERE p.id IS NULL`
  );
  if (orphans.cnt > 0) {
    logError(`${orphans.cnt} votes orphelins (player_id inexistant)`);
  } else {
    logOk('Pas de votes orphelins');
  }

  // 8. Positions valides
  const badPositions = await queryAll(
    `SELECT DISTINCT position, COUNT(*) as cnt FROM players WHERE archived = 0 AND source_season = '2025-2026' AND position NOT IN ('Gardien', 'Defenseur', 'Milieu', 'Attaquant') GROUP BY position`
  );
  if (badPositions.length > 0) {
    for (const p of badPositions) {
      logError(`Position invalide: "${p.position}" (${p.cnt} joueurs)`);
    }
  } else {
    logOk('Toutes les positions sont valides');
  }

  // Summary
  const totalActive = await queryOne(
    `SELECT COUNT(*) as cnt FROM players WHERE archived = 0 AND source_season = '2025-2026'`
  );
  console.log(`\n[INFO]  ${totalActive.cnt} joueurs actifs au total`);
  console.log(`\n=== ${errors} ERROR, ${warns} WARN, ${infos} INFO ===`);

  process.exit(errors > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
