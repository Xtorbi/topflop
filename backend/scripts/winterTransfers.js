/**
 * Mercato hiver 2025-2026 — Mise a jour BDD
 * Archive les joueurs partis hors L1, met a jour les clubs pour transferts intra-L1
 */
const { initDb, runSql, queryOne } = require('../models/database');

const ARCHIVES = [
  { id: 580, name: 'George Ilenikhena', reason: 'Transfert Monaco → Al-Ittihad (Arabie Saoudite) 33M EUR' },
  { id: 519, name: 'Darryl Bakola', reason: 'Transfert OM → Sassuolo 12M EUR' },
  { id: 509, name: 'Ulisses Garcia', reason: 'Pret OM → Sassuolo' },
  { id: 515, name: 'Matt O\'Riley', reason: 'Fin de pret OM → Brighton' },
  { id: 518, name: 'Angel Gomes', reason: 'Pret OM → Wolverhampton' },
  { id: 886, name: 'Joel Mvuka', reason: 'Pret Lorient → Celtic Glasgow' },
  { id: 659, name: 'Morgan Guilavogui', reason: 'Transfert Lens → Real Salt Lake (MLS)' },
  { id: 675, name: 'Seko Fofana', reason: 'Pret Rennes → FC Porto' },
  { id: 551, name: 'Enzo Molebe', reason: 'Pret Lyon → Montpellier (L2)' },
  { id: 552, name: 'Alejandro Gomes Rodriguez', reason: 'Pret Lyon → FC Annecy (L2)' },
  { id: 946, name: 'Cheikh Sabaly', reason: 'Transfert Metz → Vancouver Whitecaps (MLS)' },
  { id: 951, name: 'Malick Mbaye', reason: 'Transfert Metz → Zulte Waregem (Belgique)' },
  { id: 953, name: 'Ibou Sane', reason: 'Pret Metz → Amiens (L2)' },
  { id: 712, name: 'Mamadou Sarr', reason: 'Transfert Strasbourg → Chelsea 20M EUR' },
  { id: 691, name: 'Julien Le Cardinal', reason: 'Transfert Brest → Saint-Etienne (L2)' },
  { id: 758, name: 'Said Hamulic', reason: 'Fin de pret Toulouse → Volos (Grece)' },
];

const CLUB_UPDATES = [
  { id: 481, name: 'Noham Kamara', from: 'Paris Saint-Germain', to: 'Olympique Lyonnais' },
  { id: 864, name: 'Himad Abdelli', from: 'Angers SCO', to: 'Olympique de Marseille' },
  { id: 753, name: 'Noah Edjouma', from: 'Toulouse FC', to: 'LOSC Lille' },
  { id: 575, name: 'Lucas Michal', from: 'AS Monaco', to: 'FC Metz' },
  { id: 717, name: 'Abakar Sylla', from: 'RC Strasbourg Alsace', to: 'FC Nantes' },
  { id: 774, name: 'Junior Mwanga', from: 'FC Nantes', to: 'RC Strasbourg Alsace' },
];

async function main() {
  await initDb();

  console.log('=== ARCHIVES (departs hors L1) ===\n');
  for (const p of ARCHIVES) {
    const player = await queryOne('SELECT id, name, club FROM players WHERE id = ?', [p.id]);
    if (!player) {
      console.log(`  SKIP #${p.id} ${p.name} — introuvable`);
      continue;
    }
    await runSql(
      "UPDATE players SET archived = 1, archived_reason = ?, archived_at = datetime('now') WHERE id = ?",
      [p.reason, p.id]
    );
    console.log(`  ARCHIVED #${p.id} ${player.name} (${player.club}) — ${p.reason}`);
  }

  console.log('\n=== MISES A JOUR CLUB (transferts intra-L1) ===\n');
  for (const t of CLUB_UPDATES) {
    const player = await queryOne('SELECT id, name, club FROM players WHERE id = ?', [t.id]);
    if (!player) {
      console.log(`  SKIP #${t.id} ${t.name} — introuvable`);
      continue;
    }
    if (player.club !== t.from) {
      console.log(`  WARN #${t.id} ${player.name} — club actuel "${player.club}" != attendu "${t.from}"`);
    }
    await runSql('UPDATE players SET club = ? WHERE id = ?', [t.to, t.id]);
    console.log(`  UPDATED #${t.id} ${player.name}: ${t.from} → ${t.to}`);
  }

  // Verification
  const archived = await queryOne('SELECT COUNT(*) as count FROM players WHERE archived = 1');
  const active = await queryOne('SELECT COUNT(*) as count FROM players WHERE archived = 0 AND source_season = ?', ['2025-2026']);
  console.log(`\n=== BILAN ===`);
  console.log(`Joueurs archives: ${archived.count}`);
  console.log(`Joueurs actifs: ${active.count}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
