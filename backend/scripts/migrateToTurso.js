/**
 * Migration script : local SQLite → Turso cloud
 *
 * Usage :
 *   1. Remplir TURSO_DATABASE_URL et TURSO_AUTH_TOKEN dans backend/.env
 *   2. node scripts/migrateToTurso.js
 *
 * Le script :
 *   - Lit la BDD locale (database/ligue1.db)
 *   - Cree les tables sur Turso (initDb)
 *   - Copie players, votes, matches, league_status par batch
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@libsql/client');
const path = require('path');

const BATCH_SIZE = 50;

async function migrate() {
  // Verify env vars
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env');
    process.exit(1);
  }

  console.log('Connecting to local DB...');
  const local = createClient({
    url: `file:${path.join(__dirname, '../database/ligue1.db')}`,
  });

  console.log('Connecting to Turso:', process.env.TURSO_DATABASE_URL);
  const remote = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Test connection
  try {
    await remote.execute('SELECT 1');
    console.log('Turso connection OK');
  } catch (err) {
    console.error('Cannot connect to Turso:', err.message);
    process.exit(1);
  }

  // Create tables (same as initDb but on remote)
  console.log('\n--- Creating tables on Turso ---');
  await createTables(remote);
  console.log('Tables created');

  // Disable FK checks during migration
  await remote.execute('PRAGMA foreign_keys = OFF');

  // Migrate each table
  await migrateTable(local, remote, 'players', [
    'id', 'first_name', 'last_name', 'name', 'club', 'position', 'nationality',
    'photo_url', 'age', 'number', 'matches_played', 'goals', 'assists',
    'clean_sheets', 'saves', 'last_matchday_played', 'last_match_date',
    'upvotes', 'downvotes', 'neutral_votes', 'total_votes', 'score',
    'source_season', 'archived', 'archived_reason', 'archived_at',
    'api_id', 'created_at', 'updated_at'
  ]);

  await migrateTable(local, remote, 'votes', [
    'id', 'player_id', 'vote_type', 'context', 'voted_at', 'voter_ip'
  ]);

  await migrateTable(local, remote, 'matches', [
    'id', 'football_data_id', 'home_club', 'away_club', 'home_score',
    'away_score', 'match_date', 'matchday', 'status', 'season', 'created_at'
  ]);

  await migrateTable(local, remote, 'league_status', [
    'id', 'current_matchday', 'season', 'last_updated'
  ]);

  // Re-enable FK checks
  await remote.execute('PRAGMA foreign_keys = ON');

  console.log('\n=== Migration complete! ===');
}

async function createTables(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      name TEXT NOT NULL,
      club TEXT NOT NULL,
      position TEXT NOT NULL CHECK(position IN ('Gardien', 'Defenseur', 'Milieu', 'Attaquant')),
      nationality TEXT,
      photo_url TEXT,
      age INTEGER,
      number INTEGER,
      matches_played INTEGER DEFAULT 0,
      goals INTEGER DEFAULT 0,
      assists INTEGER DEFAULT 0,
      clean_sheets INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      last_matchday_played INTEGER DEFAULT 0,
      last_match_date TEXT,
      upvotes INTEGER DEFAULT 0,
      downvotes INTEGER DEFAULT 0,
      neutral_votes INTEGER DEFAULT 0,
      total_votes INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      source_season TEXT NOT NULL,
      archived INTEGER DEFAULT 0,
      archived_reason TEXT,
      archived_at TEXT,
      api_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_club ON players(club)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_position ON players(position)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_score ON players(score DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_total_votes ON players(total_votes DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_season ON players(source_season)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_active ON players(source_season, archived)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_last_matchday ON players(last_matchday_played)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS league_status (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      current_matchday INTEGER NOT NULL DEFAULT 1,
      season TEXT NOT NULL,
      last_updated TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      vote_type TEXT NOT NULL CHECK(vote_type IN ('up', 'neutral', 'down')),
      context TEXT DEFAULT 'ligue1',
      voted_at TEXT DEFAULT (datetime('now')),
      voter_ip TEXT,
      FOREIGN KEY (player_id) REFERENCES players(id)
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_player ON votes(player_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_context ON votes(context)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_date ON votes(voted_at)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_ip ON votes(player_id, voter_ip)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_ip_date ON votes(player_id, voter_ip, voted_at)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      football_data_id INTEGER UNIQUE,
      home_club TEXT NOT NULL,
      away_club TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      match_date TEXT NOT NULL,
      matchday INTEGER,
      status TEXT DEFAULT 'FINISHED',
      season TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season)`);
}

async function migrateTable(local, remote, tableName, columns) {
  console.log(`\n--- Migrating ${tableName} ---`);

  // Check if already has data
  const existing = await remote.execute(`SELECT COUNT(*) as cnt FROM ${tableName}`);
  if (existing.rows[0].cnt > 0) {
    console.log(`  ${tableName} already has ${existing.rows[0].cnt} rows, skipping`);
    return;
  }

  const rows = await local.execute(`SELECT * FROM ${tableName}`);
  const total = rows.rows.length;
  console.log(`  ${total} rows to migrate`);

  if (total === 0) return;

  const placeholders = columns.map(() => '?').join(', ');
  const colList = columns.join(', ');
  const sql = `INSERT INTO ${tableName} (${colList}) VALUES (${placeholders})`;

  let migrated = 0;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = rows.rows.slice(i, i + BATCH_SIZE);
    const stmts = batch.map(row => ({
      sql,
      args: columns.map(col => row[col] ?? null),
    }));
    await remote.batch(stmts);
    migrated += batch.length;
    console.log(`  ${migrated}/${total}`);
  }

  console.log(`  ${tableName}: ${migrated} rows migrated`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
