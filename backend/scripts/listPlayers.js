const { initDb, queryAll } = require('../models/database');

initDb().then(async () => {
  const players = await queryAll(
    'SELECT id, name, club, matches_played, goals, assists FROM players WHERE source_season = ? AND archived = 0 ORDER BY club, name',
    ['2025-2026']
  );
  const clubs = {};
  for (const p of players) {
    if (!clubs[p.club]) clubs[p.club] = [];
    clubs[p.club].push(p);
  }
  for (const [club, pls] of Object.entries(clubs).sort()) {
    console.log(`\n=== ${club} (${pls.length}) ===`);
    for (const p of pls) {
      console.log(`  #${p.id} ${p.name} | ${p.matches_played}M ${p.goals}G ${p.assists}A`);
    }
  }
  console.log(`\nTotal: ${players.length} joueurs actifs`);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
