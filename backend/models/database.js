const { createClient } = require('@libsql/client');
const path = require('path');

let client;

function getClient() {
  if (client) return client;

  if (process.env.TURSO_DATABASE_URL) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  } else {
    // Fallback local dev : fichier SQLite
    const dbPath = path.join(__dirname, '../database/ligue1.db');
    client = createClient({
      url: `file:${dbPath}`,
    });
  }

  return client;
}

async function initDb() {
  const db = getClient();

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

  // Migration: ajouter les nouvelles colonnes si elles n'existent pas
  const columns = await db.execute("PRAGMA table_info(players)");
  const columnNames = columns.rows.map(row => row.name);

  if (!columnNames.includes('last_matchday_played')) {
    await db.execute(`ALTER TABLE players ADD COLUMN last_matchday_played INTEGER DEFAULT 0`);
  }
  if (!columnNames.includes('last_match_date')) {
    await db.execute(`ALTER TABLE players ADD COLUMN last_match_date TEXT`);
  }

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_last_matchday ON players(last_matchday_played)`);

  // Table pour tracker la journee actuelle de la ligue
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
      FOREIGN KEY (player_id) REFERENCES players(id)
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_player ON votes(player_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_context ON votes(context)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_date ON votes(voted_at)`);

  // Migration: ajouter colonne voter_ip si elle n'existe pas
  const votesColumns = await db.execute("PRAGMA table_info(votes)");
  const votesColumnNames = votesColumns.rows.map(row => row.name);
  if (!votesColumnNames.includes('voter_ip')) {
    await db.execute(`ALTER TABLE votes ADD COLUMN voter_ip TEXT`);
  }
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_ip ON votes(player_id, voter_ip)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_votes_ip_date ON votes(player_id, voter_ip, voted_at)`);

  // Table matches : stocke les resultats de matchs recuperes par le cron
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

// Helper: run a SELECT and return all rows as array of objects
async function queryAll(sql, params = []) {
  const db = getClient();
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

// Helper: run a SELECT and return first row as object (or null)
async function queryOne(sql, params = []) {
  const db = getClient();
  const result = await db.execute({ sql, args: params });
  return result.rows[0] || null;
}

// Helper: run INSERT/UPDATE/DELETE
async function runSql(sql, params = []) {
  const db = getClient();
  await db.execute({ sql, args: params });
}

module.exports = { initDb, queryAll, queryOne, runSql };
