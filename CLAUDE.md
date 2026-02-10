# CLAUDE.md - Topflop

**Derniere mise a jour** : 10 fevrier 2026 (nuit)

---

## Etat general du projet

**Statut** : MVP DEPLOYE EN PRODUCTION

**Topflop** (anciennement Foot Vibes) est le barometre communautaire des joueurs de Ligue 1. Les utilisateurs votent sur des joueurs (pouce haut / neutre / pouce bas) pour creer un classement base sur le ressenti des fans.

### URLs de production

- **Frontend** : https://www.topflop.fr (alias: frontend-xtorbis-projects.vercel.app)
- **Backend API** : https://foot-vibes-api.onrender.com
- **GitHub** : https://github.com/Xtorbi/topflop

### Session du 10 fevrier 2026 (nuit 2) - AdSense RGPD + Perf + Fix joueurs 0 match + Analytics

**Vercel Analytics** :
- Package `@vercel/analytics` installe + `<Analytics />` dans App.jsx
- Tracking automatique des pages vues et Web Vitals
- Dashboard : https://vercel.com → projet → Analytics
- Fichier : `frontend/src/App.jsx`

**Bouton neutre smiley meh** :
- Remplace le pouce horizontal par un smiley neutre (visage + bouche droite)
- SVG inline : cercle + 2 yeux + ligne droite
- Fichier : `frontend/src/components/VoteButtons.jsx`

**Limite votes quotidiens : 200 → 500** :
- 440 joueurs actifs, 200/jour ne permettait pas de tous les voter
- Fichier : `backend/middleware/ipTracker.js`

**Fix joueurs 0 match proposes au vote** :
- Bug : 41 joueurs avec `matches_played = 0` apparaissaient dans la selection aleatoire
- Cause : le cron met `last_match_date` sur **tous les joueurs du club** quand le club joue, meme les remplacants qui n'ont jamais joue → ils atterrissaient dans le bucket "match recent" (80%)
- Fix : ajout `AND matches_played > 0` dans la requete de `getRandomPlayer`
- Exemple : Amadou Cisse (RC Strasbourg, 19 ans, 0 match) ne sera plus propose
- Fichier : `backend/controllers/playersController.js`

**3 quick wins perf/RGPD** :

| # | Fix | Fichiers |
|---|-----|----------|
| 1 | **AdSense conditionne au consentement cookies** | `index.html`, `AdBanner.jsx`, `AdInterstitial.jsx` |
| 2 | **Lazy loading images** (`loading="lazy"`) | `RankingTable.jsx`, `MiniPodium.jsx` |
| 3 | **Cache headers API** (Cache-Control public) | `backend/routes/players.js` |

**AdSense + consentement** :
- Script AdSense retire de `index.html` (chargeait meme si cookies refuses)
- Charge dynamiquement via `document.createElement('script')` uniquement si `localStorage fv-cookie-consent === 'accepted'`
- `loadAdSenseScript()` dans AdBanner.jsx : injecte le script une seule fois (flag `adsenseLoaded`)
- AdBanner + AdInterstitial retournent `null` si consentement non accepte

**Lazy loading** :
- `loading="lazy"` sur drapeaux nationalites (RankingTable) et photos/logos podium (MiniPodium)
- Carte joueur (PlayerCard/Vote) garde le chargement eager (contenu principal above-the-fold)

**Cache headers** :
- Middleware `cache(seconds)` qui pose `Cache-Control: public, max-age=N, s-maxage=N`
- `/ranking`, `/players`, `/players/:id` : 60s
- `/matches/recent` : 300s (5 min)
- `/contexts` : 600s (10 min)
- `/players/random` : pas de cache (aleatoire)

**Fichiers modifies** :
- `frontend/index.html` : script AdSense retire
- `frontend/src/components/AdBanner.jsx` : chargement dynamique + check consentement
- `frontend/src/components/AdInterstitial.jsx` : check consentement
- `frontend/src/components/RankingTable.jsx` : loading="lazy" drapeaux
- `frontend/src/components/MiniPodium.jsx` : loading="lazy" photos + logos
- `backend/routes/players.js` : middleware cache + Cache-Control

---

### Session du 10 fevrier 2026 (nuit) - 5 fixes RGPD/UX/CLS

**5 fixes issus de la priorisation post-audit** :

| # | Fix | Fichiers |
|---|-----|----------|
| 1 | **Hash IP HMAC-SHA256** : IPs hashees avant stockage BDD (conformite RGPD Art. 32) | `votesController.js`, `ipTracker.js` |
| 2 | **Placeholder photo** : silhouette plus visible (`#4a5568` → `#9ca3af`) | `PlayerCard.jsx` |
| 3 | **Dimensions images explicites** : `width`/`height` sur toutes les `<img>` (anti-CLS) | `PlayerCard.jsx`, `RankingTable.jsx`, `MiniPodium.jsx` |
| 4 | **Message 0 resultats** : affiche "Aucun resultat" quand recherche classement vide | `Ranking.jsx` |
| 5 | **Nettoyage console.log** : supprime log verbose `[MATCH FALLBACK]` dans admin.js | `admin.js` |

**Hash IP - details** :
- `crypto.createHmac('sha256', IP_HASH_SECRET).update(ip).digest('hex')` dans votesController et ipTracker
- Env var `IP_HASH_SECRET` (64 chars hex) dans `.env` + a ajouter sur Render
- Fallback `'topflop-default-salt-change-me'` si env var absente (dev local)
- Impact : les anciennes IPs en clair dans `votes` ne matchent plus les nouvelles hashees → reset one-time de l'anti-spam 24h

**Console.log - bilan** :
- Seul log superflu : `[MATCH FALLBACK]` dans `findClubName()` (admin.js L86)
- Logs gardes : startup, cron summary, erreurs, warnings secu — tous utiles pour monitoring

**Fichiers modifies** :
- `backend/controllers/votesController.js` : hash IP HMAC-SHA256
- `backend/middleware/ipTracker.js` : hash IP HMAC-SHA256
- `backend/routes/admin.js` : suppression console.log MATCH FALLBACK
- `frontend/src/components/PlayerCard.jsx` : placeholder #9ca3af + width/height
- `frontend/src/components/RankingTable.jsx` : width/height drapeaux + alt text
- `frontend/src/components/MiniPodium.jsx` : width/height photos + logos
- `frontend/src/pages/Ranking.jsx` : message vide "Aucun resultat"

---

### Session du 10 fevrier 2026 (soir) - Audit 4 agents + Fixes secu/UX

**Audit croise par 4 agents** (UI Designer, Engineer, Security Auditor, Security Engineer) :
- Analyse complete du code frontend + backend
- Synthese des points de convergence et contradictions
- Top 10 actions priorisees par consensus

**8 fixes implementes** :

| # | Fix | Fichier |
|---|-----|---------|
| 1 | Rate limit global 100 req/min `/api/*` | `backend/server.js` |
| 2 | Suppression puppeteer + cheerio (-134 packages) | `backend/package.json` |
| 3 | Helmet headers secu (X-Frame, HSTS, X-Content-Type) | `backend/server.js` |
| 4 | SQL interpolation `${column}` → 3 requetes distinctes | `backend/controllers/votesController.js` |
| 5 | Cle admin verifiee (ancienne rejetee en prod) | - |
| 6 | Contraste texte WCAG : white/20→/40, white/40→/60 | `Vote.jsx`, `Home.jsx`, `Ranking.jsx` |
| 7 | Debounce 300ms recherche classement | `frontend/src/pages/Ranking.jsx` |
| 8 | Middleware erreur global catch-all + unhandledRejection | `backend/server.js` |

**Nouveau favicon** : pouce haut emerald sur fond navy (remplace ancien ballon+ondes)
- `frontend/public/favicon.svg` + `favicon.png`

**Points notes pour plus tard** (issus des audits) :
- ~~Hasher les IP en BDD (HMAC-SHA256) pour conformite RGPD Article 32~~ FAIT
- ~~Conditionner chargement AdSense au consentement cookies~~ FAIT
- Monitoring erreurs (Sentry)
- FingerprintJS anti-spam v1.1

---

### Session du 10 fevrier 2026 (apres-midi) - Migration BDD Turso

**Migration sql.js → Turso (libSQL) pour BDD persistante** :
- Probleme : BDD SQLite embarquee via sql.js, fichier ephemere perdu a chaque redeploy Render
- Solution : migration vers Turso (libSQL cloud), BDD persistante en region EU West (Ireland)

**Code migre** :
- `@libsql/client` remplace `sql.js` dans package.json
- `database.js` reecrit : `createClient()` avec fallback fichier local si pas de `TURSO_DATABASE_URL`
- Tous les appelants migres en async/await (controllers, middleware, routes, scripts)
- Script `migrateToTurso.js` : copie locale → cloud par batch de 50 rows

**Donnees migrees** : 481 players, 245 votes, 23 matches

**Configuration** :
- Turso DB : `topflop` sur `aws-eu-west-1` (Ireland)
- Env vars : `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (dans `.env` local + Render)
- Fallback : si pas de TURSO_DATABASE_URL, utilise `file:database/ligue1.db` (dev local)

**Fichiers crees** :
- `backend/scripts/migrateToTurso.js`
- `backend/.env` (gitignore)

**Fichiers modifies** :
- `backend/models/database.js` : reecrit complet (sql.js → @libsql/client)
- `backend/package.json` : sql.js → @libsql/client
- `backend/server.js` : dotenv.config() simplifie
- `backend/controllers/playersController.js` : async/await
- `backend/controllers/votesController.js` : async/await
- `backend/middleware/ipTracker.js` : async/await
- `backend/routes/admin.js` : async/await
- `backend/scripts/checkDb.js` : async/await
- `backend/scripts/importTransfermarkt.js` : async/await
- `backend/scripts/updateGoalkeeperStats.js` : async/await
- `backend/scripts/verifyData.js` : async/await

**Nettoyage** : suppression turso-cli/, zip, fichiers temporaires (auth, auth-wal, nul)

---

### Session du 10 fevrier 2026 - Audit securite + Nettoyage

**Audit securite complet du backend** (18 points analyses) :

**Points critiques corriges (commits `05e7052` + `af105e1`)** :

| # | Probleme | Fix |
|---|----------|-----|
| 2 | CORS ouvert `*` | Restreint aux domaines prod (topflop.fr, vercel, localhost) |
| 3 | Admin key en fallback hardcode | `ADMIN_KEY` env obligatoire, 403 si absent |
| 4 | Vote: champs req.body passes direct en SQL | Mapping explicite `{1, 0, -1}` pour vote_type |
| 5 | Pas de validation inputs ranking/players | Whitelist positions, plafond limit (100), offset (10000), search tronque (50 chars) |
| 6 | Rate limit 2s trop court | Passe a 3s |
| 7 | ipTracker: compteur RAM (perdu au restart) | Remplace par COUNT en BDD sur table votes (voter_ip) |
| 8 | Pas de timeout sur fetch Football-Data | `AbortSignal.timeout(15000)` ajoute |

**Nettoyage (commit `8ec05c2`)** :

- **36 scripts morts supprimes** dans `backend/scripts/` (-6353 lignes)
  - Conserves : `checkDb.js`, `verifyData.js`, `importTransfermarkt.js`, `updateGoalkeeperStats.js`
- **favicon.png** ajoute (fallback Safari, SVG non supporte)
- **robots.txt** + **sitemap.xml** crees pour SEO (7 URLs)
- **MatchGrid** : erreurs fetch loguees au lieu d'etre avalees silencieusement

**Points notes mais non traites (pas urgents)** :
- Console.log partout → nettoyage futur
- Config clubs dupliquee frontend/backend → refacto future
- Dependances CDN externes (flagcdn, AdSense) → acceptable
- AdSense slots placeholders → attente validation Google
- ~~BDD ephemere sur Render free tier~~ → FAIT : migre vers Turso (libSQL cloud)
- Pas de risque XSS : React echappe par defaut, pas de `dangerouslySetInnerHTML`

**Fichiers modifies** :
- `backend/controllers/playersController.js` : validation inputs (whitelist, plafonds, truncate)
- `backend/middleware/rateLimiter.js` : 2s → 3s
- `backend/middleware/ipTracker.js` : compteur RAM → check BDD
- `backend/routes/admin.js` : timeout 15s fetch, CORS restreint, admin key sans fallback
- `backend/controllers/votesController.js` : mapping vote_type explicite
- `frontend/index.html` : favicon PNG fallback
- `frontend/src/components/MatchGrid.jsx` : log erreurs fetch
- `frontend/public/robots.txt` : nouveau
- `frontend/public/sitemap.xml` : nouveau
- `frontend/public/favicon.png` : nouveau

---

### Session du 9 fevrier 2026 (nuit) - Renforcement bg-vibes

**Animation de fond bg-vibes renforcee (index.css)** :
- Opacites ondes SVG montees (~+50%) pour meilleure visibilite :
  - Couche 1 emerald : `0.06→0.09`, indigo : `0.05→0.07`, fadeouts `0.01→0.02`
  - Couche 2 emerald : `0.06→0.08`, fadeout `0.01→0.02`
- Nouveau glow pulsant emerald : `radial-gradient` (6% opacite) qui pulse de 100% a 130% en 8s
- Keyframe `vibesGlow` ajoute + desactive dans `prefers-reduced-motion`
- Vitesse des ondes inchangee (80s/60s)

**Fichiers modifies** :
- `frontend/src/index.css` : opacites SVG, glow pulsant, reduced-motion

---

### Session du 9 fevrier 2026 (soir) - MiniPodium + Partage WhatsApp + Polish UI

**MiniPodium Top 3 sur la Home (MiniPodium.jsx)** :
- Nouveau composant affichant les 3 premiers du classement general
- Layout podium : 2e a gauche, 1er au centre (plus grand), 3e a droite
- Photo joueur (ronde, bordure emerald), badge rang, nom raccourci (J. Nom), logo club, score
- 1er plus grand (`w-20 sm:w-24`), 2e/3e decales vers le bas (`mt-6 sm:mt-8`)
- Lien "Voir le classement" en bas
- Fond `bg-white/5` avec bordure `border-white/10`, coins arrondis `rounded-2xl`
- Donnees : `fetchRanking({ limit: 3 })` au mount de Home.jsx
- Ne s'affiche que si >= 3 joueurs disponibles
- Fichier : `frontend/src/components/MiniPodium.jsx`

**Ordre Home revu** :
1. Hero (logo + CTA)
2. **MiniPodium Top 3** ← remonte au-dessus du carrousel
3. **MatchGrid carrousel** ← descend
4. Separateur "ou vote par club" (anciennement "ou choisis ton club")
5. ClubGrid
6. AdBanner

**Partage WhatsApp classement (ShareWhatsApp.jsx)** :
- Bouton "Partager sur WhatsApp" sous le tableau classement
- Partage le Top 5 avec titre adapte aux filtres actifs (club, periode, FR)
- Format message : emoji trophee + titre + top 5 + lien www.topflop.fr/classement
- Ouvre `wa.me/?text=...` dans un nouvel onglet
- Style discret : `bg-white/5 border-white/10`, hover vert
- Props : `players`, `clubFilter`, `periodFilter`, `frenchOnly`
- Fichier : `frontend/src/components/ShareWhatsApp.jsx`

**Polish UI** :
- Header : lien "Accueil" affiche a cote du logo sur les pages non-home
- CookieBanner : boutons `rounded-full` + couleurs brand (`bg-fv-green`, `text-fv-navy`)
- Home tagline : "Le barometre des joueurs de Ligue 1" + sous-titre "Vote et decouvre le classement"
- Home CTA classement : `border` au lieu de `border-2`
- Confetti : suppression du message overlay (la modal milestone suffit)

**Fichiers crees** :
- `frontend/src/components/MiniPodium.jsx`
- `frontend/src/components/ShareWhatsApp.jsx`

**Fichiers modifies** :
- `frontend/src/pages/Home.jsx` : MiniPodium, ordre blocs, tagline, separateur
- `frontend/src/pages/Ranking.jsx` : integration ShareWhatsApp
- `frontend/src/components/Header.jsx` : lien "Accueil"
- `frontend/src/components/CookieBanner.jsx` : style boutons
- `frontend/src/components/Confetti.jsx` : suppression message overlay

---

### Session du 9 fevrier 2026 - Anti-spam + Banniere RGPD

**Anti-spam : 1 vote par joueur par IP toutes les 24h** :
- Avant d'inserer le vote, check si l'IP a deja vote sur ce joueur dans les 24 dernieres heures
- Si doublon : retourne `429` avec `{ error: 'already_voted' }`
- Le vote est optimiste cote frontend → pas de changement UI (le 429 est ignore silencieusement)
- Nouvel index `idx_votes_ip_date` sur `(player_id, voter_ip, voted_at)` pour performance
- Fichiers : `backend/controllers/votesController.js`, `backend/models/database.js`

**Banniere cookies RGPD (CookieBanner.jsx)** :
- Banniere fixee en bas de l'ecran (`fixed bottom-0`, z-40)
- Texte : "Ce site utilise des cookies..." + lien vers `/confidentialite`
- Bouton "Accepter" (vert emerald) + bouton "Refuser" (bordure blanche)
- Consent stocke dans `localStorage` : cle `fv-cookie-consent` = `"accepted"` | `"refused"`
- Si deja repondu, la banniere ne s'affiche plus
- Responsive : colonne sur mobile, ligne sur desktop
- Fichier : `frontend/src/components/CookieBanner.jsx`

**Integration App.jsx** :
- `<CookieBanner />` rendu juste avant la fermeture du div principal
- Visible sur toutes les pages (y compris Vote)

**Responsive mobile fixes** :
- Page Vote : `h-dvh` avec fallback `h-screen` (fix barre d'adresse mobile)
- VoteButtons : tailles corrigees `w-14 h-14 sm:w-16 sm:h-16` (plus petit mobile, plus grand desktop)
- CookieBanner : padding reduit sur mobile (`px-3 py-3 sm:p-4`)
- ClubSelector dropdown : `max-w-[calc(100vw-2rem)]` pour eviter le debordement

**Domaine topflop.fr** :
- Achete sur OVH (3 ans, renouvellement fevr. 2029)
- DNS : A record `76.76.21.21` + CNAME `www` → `cname.vercel-dns.com.`
- Vercel : `topflop.fr` redirige 307 vers `www.topflop.fr` (production)
- CORS : deja ouvert (`cors()` sans restriction), pas de changement backend
- Meta tags OG/Twitter mis a jour avec URLs absolues `https://www.topflop.fr`

**Fichiers crees** :
- `frontend/src/components/CookieBanner.jsx`

**Fichiers modifies** :
- `backend/controllers/votesController.js` : check doublon avant INSERT
- `backend/models/database.js` : nouvel index `idx_votes_ip_date`
- `frontend/src/App.jsx` : import + rendu CookieBanner
- `frontend/src/pages/Vote.jsx` : h-dvh
- `frontend/src/components/VoteButtons.jsx` : tailles boutons corrigees
- `frontend/src/components/ClubSelector.jsx` : max-w dropdown
- `frontend/index.html` : meta tags og:url, og:image, twitter:image absolus

---

### Session du 8 fevrier 2026 (soir) - Vote par match

**3e mode de vote : par match** :
- En plus de "Toute la L1" et "par club", on peut voter sur un match specifique
- L'utilisateur clique sur une affiche (ex: Nice 0-0 Monaco) et vote sur les joueurs des 2 clubs
- Mode context : `match:clubId1:clubId2` (ex: `match:nice:monaco`)

**Table `matches` en BDD** :
- Colonnes : football_data_id (UNIQUE), home_club, away_club, home_score, away_score, match_date, matchday, status, season
- Index sur match_date DESC et season
- Migration auto dans `initDb()`
- Fichier : `backend/models/database.js`

**Cron etendu (FINISHED + SCHEDULED)** :
- Le cron recupere maintenant tous les matchs (pas seulement FINISHED)
- Plage : 7 jours passe + 10 jours futur
- Seuls les matchs FINISHED mettent a jour `last_match_date` des joueurs
- Tous les matchs sont persistes en BDD (INSERT OR REPLACE sur football_data_id)
- Fichier : `backend/routes/admin.js`

**Endpoint `GET /api/matches/recent`** :
- Selection intelligente de la journee :
  - Affiche la journee en cours (matchs du jour en priorite)
  - A partir de mercredi (si dernier match > 2 jours), bascule sur la prochaine journee
- Tri : matchs du jour en premier, puis par date chronologique
- Retourne `{ matches, matchday }`
- Fichier : `backend/controllers/playersController.js` + `backend/routes/players.js`

**Mode match dans `getRandomPlayer`** :
- Si context = `match:clubId1:clubId2` → `WHERE club IN (club1.name, club2.name)`
- Fichier : `backend/controllers/playersController.js`

**Carrousel de matchs (MatchGrid.jsx)** :
- Nouveau composant sur la Home entre CTA et grille clubs
- Titre "Journee X" + fleches de navigation (desktop)
- Cartes match : logos + noms courts + score (FINISHED) ou heure (TIMED/SCHEDULED)
- Matchs du jour surlignés (ring vert + date "Aujourd'hui" en vert)
- Scroll horizontal avec snap points sur mobile, scrollbar masquee
- Se masque automatiquement si aucun match disponible
- Clic → `setMode('match:homeId:awayId')` + navigate('/vote')
- Fichier : `frontend/src/components/MatchGrid.jsx`

**ClubSelector mode match** :
- Le pill affiche les 2 logos avec "vs" entre eux quand mode match actif
- Selectionner "Toute la L1" ou un club dans le dropdown sort du mode match
- Fichier : `frontend/src/components/ClubSelector.jsx`

**Vote page : banniere contexte match** :
- Si mode match, affiche `[logo] Club1 vs Club2 [logo]` au-dessus de la carte
- Fichier : `frontend/src/pages/Vote.jsx`

**Helpers frontend** :
- `isMatchMode(mode)` : detecte si le mode est un match
- `parseMatchMode(mode)` : extrait les 2 objets club
- `getClubIdFromName(clubName)` : lookup nom BDD → club id
- `fetchRecentMatches()` : appel API /matches/recent
- Fichiers : `frontend/src/config/clubs.js`, `frontend/src/utils/api.js`

**CSS** :
- Utilitaire `.scrollbar-hide` pour masquer la scrollbar du carrousel
- Fichier : `frontend/src/index.css`

**Fichiers crees** :
- `frontend/src/components/MatchGrid.jsx`

**Fichiers modifies** :
- `backend/models/database.js` : table matches
- `backend/routes/admin.js` : cron etendu + persist matches
- `backend/controllers/playersController.js` : getRecentMatches + match mode
- `backend/routes/players.js` : route /matches/recent
- `frontend/src/utils/api.js` : fetchRecentMatches
- `frontend/src/config/clubs.js` : helpers mode match
- `frontend/src/components/ClubSelector.jsx` : affichage mode match
- `frontend/src/pages/Home.jsx` : integration MatchGrid
- `frontend/src/pages/Vote.jsx` : banniere contexte match
- `frontend/src/index.css` : scrollbar-hide
- `backend/database/ligue1.db` : 23 matchs persistes (J20-J22)

---

### Session du 8 fevrier 2026 - Vote optimiste + Cron blindé

**Fix double-clic vote** :
- Bug : `handleVote` attendait la reponse API (`await submitVote()`) avant de lancer le timer d'animation
- Temps de blocage = latence API (500ms-2s sur Render free) + 250ms animation
- Le user voyait la nouvelle carte mais les boutons restaient disabled → devait cliquer 2 fois
- Fix : update optimiste, `submitVote()` en fire-and-forget, UI avance en 250ms fixe
- Fichier : `frontend/src/pages/Vote.jsx`

**Cron matches blinde** :
- Lookback etendu de 3 jours a 7 jours (plus de matchs rates si le cron saute un week-end)
- Nouveau endpoint `/api/admin/cron-status?key=...` pour monitoring :
  - Dernier resultat du cron (succes/erreur)
  - Nombre de joueurs avec/sans last_match_date
  - Liste des clubs avec leur dernier match
- Logs `[CRON]` dans la console Render (succes, erreur, tentative non autorisee)
- Fichier : `backend/routes/admin.js`

**Keep-alive Render** :
- Self-ping `/api/health` toutes les 14 minutes (Render sleep apres 15 min d'inactivite)
- Active uniquement en prod (detecte `RENDER_EXTERNAL_URL`)
- Fichier : `backend/server.js`

**BDD mise a jour** :
- `last_match_date` renseigne pour 395/481 joueurs (10 matchs detectes sur 7 jours)
- 3 clubs sans match cette semaine : OM, Le Havre, Paris FC

**Fichiers modifies** :
- `frontend/src/pages/Vote.jsx` : vote optimiste (plus d'await)
- `backend/routes/admin.js` : lookback 7j, cron-status, logs
- `backend/server.js` : keep-alive Render
- `backend/database/ligue1.db` : last_match_date mis a jour

---

### Session du 7 fevrier 2026 - Logo, AdSense, Algo fix

**Repo GitHub renomme** : `foot-vibes` → `topflop`
- Commande : `gh repo rename topflop --yes`
- Nouvelle URL : https://github.com/Xtorbi/topflop
- L'ancienne URL redirige automatiquement

**Nouveau logo Topflop** :
- Source : `logo6.png` (genere via Ideogram)
- Style : typo italique sport, pouces haut/bas avec speed lines
- Pouce haut : blanc avec contour vert
- Pouce bas : vert plein
- Texte "TOPFLOP" : blanc avec contour navy

**Traitement du logo (Python/Pillow)** :
1. Suppression du faux damier transparent (flood fill depuis les coins)
2. Detection des bordures vertes/navy pour eviter de fuir dans l'interieur du pouce
3. Erosion des pixels blancs en bordure exterieure (2 passes)
4. Recadrage serre + resize a 400px de large

**Taille logo Home.jsx** : `w-48 sm:w-56 md:w-64`

**Fix algo selection joueur** :
- Bug : l'algo utilisait `last_matchday_played` (jamais mis a jour) au lieu de `last_match_date`
- Fix : buckets bases sur le temps depuis `last_match_date` (< 24h, < 48h, < 72h, older)
- Fichier : `backend/controllers/playersController.js`

**Fix matching equipe Lens** :
- API Football-Data retourne "Racing Club de Lens" vs "RC Lens" en BDD
- Ajout alias explicite + fallback par mot-cle ville (Paris, Marseille, Lens...)
- Fichier : `backend/routes/admin.js`

**Desactivation pubs en attendant AdSense** :
- Flag `ADS_ENABLED = false` dans AdBanner.jsx et AdInterstitial.jsx
- Les composants retournent `null` si desactives
- AdInterstitial ferme automatiquement si appele avec ADS_ENABLED = false
- A reactiver une fois le compte AdSense valide

**Page A propos enrichie (pour AdSense)** :
- Section "L'histoire de Topflop" - origine et philosophie
- Section "Systeme de score" - transparence sur le calcul (+1/-1/0)
- FAQ avec 6 questions frequentes
- Section "Nos engagements" - 4 valeurs avec icones (vie privee, transparence, communaute, gratuit)
- CTAs en bas de page (Voter, Classement)
- Liens vers pages legales

**Agent UI designer cree** :
- Fichier : `.claude/agents/ui-designer.md`
- Palette couleurs Topflop, guidelines typo, checklist analyse
- Inspire du projet Gargameal

**Ameliorations UI (accessibilite)** :
- Touch targets 44px minimum sur boutons header
- Contraste ameliore sur separateur (text-white/60)
- Support `prefers-reduced-motion` dans index.css

**Fichiers modifies** :
- `frontend/public/logo.png` : nouveau logo traite
- `frontend/src/pages/Home.jsx` : taille logo, touch targets
- `frontend/src/pages/About.jsx` : contenu enrichi
- `frontend/src/components/AdBanner.jsx` : ADS_ENABLED flag
- `frontend/src/components/AdInterstitial.jsx` : ADS_ENABLED flag
- `frontend/src/index.css` : prefers-reduced-motion
- `backend/controllers/playersController.js` : fix algo buckets
- `backend/routes/admin.js` : fix matching Lens + fallback ville
- `.claude/agents/ui-designer.md` : nouvel agent

---

### Session du 6 fevrier 2026 - Rebranding Topflop

**Changement de nom** : Foot Vibes → Topflop (Goal + GOAT)

**Raison** : Le domaine footvibes.fr etait deja pris. Topflop est plus international et memorable.

**Fichiers modifies** (15 fichiers) :
- `frontend/index.html` : meta tags, titre
- `frontend/package.json` : nom du package
- `frontend/src/components/Footer.jsx` : copyright GOL/GOAT
- `frontend/src/components/Header.jsx` : alt text logo
- `frontend/src/components/AdInterstitial.jsx` : texte
- `frontend/src/pages/Home.jsx` : alt text logo
- `frontend/src/pages/About.jsx` : texte complet
- `frontend/src/pages/Contact.jsx` : email contact@topflop.fr
- `frontend/src/pages/Privacy.jsx` : texte
- `frontend/src/pages/Terms.jsx` : texte
- `frontend/src/index.css` : commentaire
- `backend/package.json` : nom du package
- `backend/server.js` : console log
- `backend/routes/admin.js` : admin key → topflop-admin-2026
- `backend/render.yaml` : nom du service

**A faire** :
- [x] Generer nouveau logo "TOPFLOP" (remplacer `frontend/public/logo.png`) FAIT
- [x] Acheter domaine topflop.fr (OVH, 3 ans)
- [x] Configurer domaine dans Vercel (DNS + redirect)
- [ ] Mettre a jour vercel.json si rename du service Render

**Logo Topflop** :
- Genere via Ideogram avec fond transparent
- Typo bold : "GOL" (contour blanc) + "GOAT" (vert #10B981)
- Icone tete de chevre stylisee en dessous
- Dimensions : 1556x688 px (ratio horizontal)
- Fichier : `frontend/public/logo.png`

**Prompt logo Ideogram utilise** :
```
Logo "TOPFLOP" ultra bold black weight condensed typography, heavy impactful letterforms, GOL white GOAT emerald green #10B981, stylized goat head icon below, transparent background, PNG format
```

---

### Session du 6 fevrier 2026 - Monetisation AdSense

**Emplacements publicitaires implementes** :

| Page | Emplacement | Format | Frequence |
|------|-------------|--------|-----------|
| Vote | Interstitiel plein ecran | Video/Display | Tous les 10 votes |
| Classement | Banner horizontal en haut | 728x90 (desktop) / 320x50 (mobile) | 1x |
| Classement | Banner inline dans tableau | 728x90 / 320x50 | Tous les 25 joueurs |
| Home | Banner sous grille clubs | 728x90 / 320x50 | 1x |

**Composant AdBanner.jsx** :
- Formats supportes : leaderboard (728x90), banner (320x50), rectangle (300x250), skyscraper (120x600)
- Detection ad blocker avec fallback gracieux (rien affiche)
- Mode dev (`DEV_MODE = false`) : pubs invisibles jusqu'a validation AdSense
- Responsive : format different selon breakpoint

**Composant AdInterstitiel.jsx** :
- Plein ecran avec fond opaque `#0f1629`
- z-index 99999 pour couvrir tout (header inclus)
- Countdown 5 secondes avant bouton "Continuer"
- Zone pub centrale large (format video/display)
- Detection ad blocker : fermeture auto si bloque

**Integration Vote.jsx** :
- `AD_INTERVAL = 10` : interstitiel tous les 10 votes
- Delai 1.5s si milestone (confetti d'abord), 300ms sinon
- State `showAd` + `setShowAd(false)` au close

**Integration Ranking.jsx** :
- Banner en haut de page (responsive)
- Prop `adInterval={25}` passee a RankingTable

**Integration RankingTable.jsx** :
- Fonction `renderRows()` insere une pub avant chaque multiple de 25
- `<tr>` avec `colSpan={6}` pour la banniere inline

**Fichiers crees** :
- `frontend/src/components/AdBanner.jsx`
- `frontend/src/components/AdInterstitial.jsx`

**Fichiers modifies** :
- `frontend/index.html` : script AdSense dans `<head>`
- `frontend/src/index.css` : animation `.animate-scale-in`
- `frontend/src/pages/Home.jsx` : AdBanner sous ClubGrid
- `frontend/src/pages/Ranking.jsx` : AdBanner en haut
- `frontend/src/pages/Vote.jsx` : AdInterstitial tous les 10 votes
- `frontend/src/components/RankingTable.jsx` : AdBanner inline tous les 25 joueurs

**Configuration AdSense** :
- Publisher ID : `ca-pub-5498498962137796` (configure)
- Slots : placeholders a remplacer par les vrais IDs depuis la console AdSense

**Avant mise en prod** :
1. ~~Remplacer `ca-pub-XXXXXXXXXXXXXXXX` par le vrai Publisher ID AdSense~~ FAIT
2. Creer les slots dans la console AdSense et remplacer les placeholders
3. ~~Passer `DEV_MODE = false` dans AdBanner.jsx et AdInterstitial.jsx~~ FAIT
4. ~~Ajouter banniere cookies RGPD (consentement pub ciblee)~~ FAIT

**Note** : Les pubs sont deployees mais invisibles jusqu'a validation du compte AdSense par Google.

**Pages legales ajoutees** (conformite AdSense) :

| Page | Route | Contenu |
|------|-------|---------|
| Confidentialite | `/confidentialite` | RGPD, cookies, donnees collectees, droits utilisateurs |
| CGU | `/cgu` | Regles d'utilisation, votes, propriete intellectuelle |
| A propos | `/a-propos` | Presentation Topflop, fonctionnement |
| Contact | `/contact` | Formulaire (question, bug, suggestion, RGPD) |

**Fichiers crees** :
- `frontend/src/pages/Privacy.jsx`
- `frontend/src/pages/Terms.jsx`
- `frontend/src/pages/About.jsx`
- `frontend/src/pages/Contact.jsx`

**Fichiers modifies** :
- `frontend/src/App.jsx` : ajout des 4 routes
- `frontend/src/components/Footer.jsx` : liens vers les pages legales

---

### Session du 5 fevrier 2026 - UI filtres classement

**Filtres sur une ligne (Ranking.jsx)** :
- Tous les filtres fusionnes sur une seule ligne desktop (dropdowns + periode + toggle FR)
- `flex-wrap` pour passer a la ligne sur mobile si necessaire
- Gap reduit sur mobile (`gap-2 sm:gap-3`)

**Dropdowns custom** :
- Fleche SVG custom (chevron blanc) positionnee a `0.4rem` du bord droit
- `appearance-none` pour supprimer la fleche native
- Dropdown clubs : largeur fixe `w-[145px]` + `truncate` (noms longs coupes)
- Dropdown postes : largeur auto (affiche "Tous les postes" en entier)

**Noms de clubs raccourcis** :
- "RC Strasbourg Alsace" → "RC Strasbourg" (affichage uniquement)
- "Stade Brestois 29" → "Stade Brestois" (affichage uniquement)
- Mapping `CLUB_DISPLAY_NAMES` dans `config/clubs.js`
- Valeur du filtre reste le nom complet (compatibilite BDD)

**Toggle renomme** :
- "Français uniquement" → "Joueurs FR" (plus compact)

**Fichiers modifies** :
- `frontend/src/pages/Ranking.jsx` : layout filtres, dropdowns custom
- `frontend/src/config/clubs.js` : CLUB_DISPLAY_NAMES, getClubDisplayName()

---

### Session du 5 fevrier 2026 - Swipe mobile + Fix double-clic

**Swipe mobile implemente (Vote.jsx)** :
- Touch events natifs (`touchstart` / `touchmove` / `touchend`), zero dependance externe
- Swipe droite = upvote, swipe gauche = downvote, swipe bas = neutre
- Seuils : 80px horizontal, 60px vertical, direction dominante gagne
- Swipe vers le haut ignore (pas d'action associee)
- Carte suit le doigt en temps reel (`transform: translate + rotate`)
- Snap back fluide (transition 0.3s) si swipe sous le seuil
- Classe `touch-none` sur le wrapper pour empecher le scroll parasite
- Carte suivante visible en transparence pendant le drag

**Indicateur visuel de direction pendant le drag** :
- Drag droite : ombre interne verte (rgba 16,185,129)
- Drag gauche : ombre interne rouge (rgba 239,68,68)
- Drag bas : ombre interne blanche
- Opacite proportionnelle a la distance (0 au centre, max au seuil)

**Fix double-clic desktop** :
- Bug : `handleVote` lisait `exitDirection` depuis une closure stale (pas re-rendu)
- Fix : remplacement du guard `exitDirection` par `isVotingRef` (ref toujours a jour)
- `isVotingRef.current = true` au debut du vote, `false` apres le timeout 250ms ou en cas d'erreur

**Hint mobile** :
- "Swipe la carte pour voter" affiche uniquement sur mobile (`sm:hidden`)
- Hint clavier desktop inchange (`hidden sm:block`)

**Fichiers modifies** :
- `frontend/src/pages/Vote.jsx` : swipe tactile, indicateur visuel, fix double-clic, hint mobile

---

### Session du 5 fevrier 2026 - Votants uniques au classement

**Colonne "Votants" ajoutee au classement** :
- Affiche le nombre de votants uniques (par IP) pour chaque joueur
- Visible sur ecrans sm: et plus (cachee sur tres petit mobile)
- Positionnee entre "Poste" et "Score"

**Backend - Stockage IP votant** :
- Nouvelle colonne `voter_ip` dans la table `votes` (migration auto au demarrage)
- IP recuperee via `x-forwarded-for` (compatible proxies Render/Vercel) ou `req.ip`
- Index `idx_votes_ip` sur `(player_id, voter_ip)` pour optimiser les COUNT DISTINCT

**Backend - API ranking modifiee** :
- Requete "saison" : sous-requete `COUNT(DISTINCT voter_ip)` par joueur
- Requete "periode" (7j/30j) : `COUNT(DISTINCT v.voter_ip)` dans le JOIN

**Note** : Les votes existants ont `voter_ip = NULL`, comptes comme 0 votants (seuls les nouveaux votes incrementent)

**Teste en local** : Vote sur Nuno Mendes → unique_voters passe de 0 a 1, IP enregistree OK

**Deploye en prod** : Backend Render + Frontend Vercel auto-deployes depuis master

**Fichiers modifies** :
- `backend/models/database.js` : migration colonne voter_ip + index
- `backend/controllers/votesController.js` : stockage IP votant
- `backend/controllers/playersController.js` : unique_voters dans getRanking
- `frontend/src/components/RankingTable.jsx` : colonne Votants

---

### Session du 5 fevrier 2026 - Logo + Branding

**Logo FOOTVIBES integre** :
- Logo genere via Ideogram.ai (typo grasse, ballon + ondes, couleur brand #10B981)
- JPEG converti en PNG transparent via Python/Pillow (suppression fond navy)
- PNG recadre automatiquement (suppression marges transparentes)
- Fichier final : `frontend/public/logo.png` (906x291)

**Integration logo dans le code** :
- Home hero : `<img>` avec `w-72 sm:w-96 md:w-[500px]` (remplace les spans texte)
- Home sticky header : `<img>` avec `h-8` (apparait au scroll > 80px)
- Header global : `<img>` avec `h-8 sm:h-10` (pages Vote et Classement)
- `.logo-glow` : passe de `text-shadow` a `filter: drop-shadow()` (compatible img)

**Meta tags et favicon** :
- `favicon.svg` : icone ballon + ondes sonores sur fond navy
- Meta tags Open Graph (og:title, og:description, og:image, og:site_name)
- Meta tags Twitter Card (summary_large_image)
- `theme-color` : #0f1629

**Fix header blink au scroll rapide** :
- Padding `py-3` fixe (plus de changement py-3/py-4 qui causait un saut)
- Transition limitee a `opacity, background-color, backdrop-filter` (200ms)
- `will-change` ajoute pour optimiser les repaint

**Fichiers crees** :
- `frontend/public/logo.png` : logo principal PNG transparent
- `frontend/public/logo.jpeg` : logo original JPEG (source)
- `frontend/public/favicon.svg` : favicon ballon + ondes
- `frontend/public/og-image.svg` : image Open Graph
- `frontend/public/logo.svg` : placeholder SVG (remplace par PNG)
- `frontend/public/logo-small.svg` : placeholder SVG petit (remplace par PNG)

**Fichiers modifies** :
- `frontend/index.html` : favicon, meta tags OG/Twitter, theme-color
- `frontend/src/pages/Home.jsx` : logo img, fix header blink
- `frontend/src/components/Header.jsx` : logo img
- `frontend/src/index.css` : logo-glow en drop-shadow

---

### Session du 5 fevrier 2026 - Fix UX vote

**Feedback overlay supprime (Vote.jsx)** :
- Le message feedback ("Ce joueur monte au classement") bloquait les clics (restait 2s, boutons reactives apres 250ms)
- Supprime state `feedback`, le bloc `setFeedback` dans handleVote, et le JSX overlay
- Les milestones (Confetti) restent fonctionnels

**Bouton neutre redesigne (VoteButtons.jsx)** :
- Remplace le "?" par un pouce horizontal (rotate -90°) pour symboliser la stabilite
- Meme SVG que le pouce haut, tourne vers la gauche

**Fichiers modifies** :
- `frontend/src/pages/Vote.jsx` : supprime feedback overlay
- `frontend/src/components/VoteButtons.jsx` : bouton neutre pouce horizontal

---

### Session du 5 fevrier 2026 - Nettoyage animations vote

**Nettoyage effectue** :
- Supprime `voteFlash` (flash colore au clic) - effet inutile
- Supprime `getFlashOverlay()` de PlayerCard.jsx
- Supprime `@keyframes voteFlash` et `.animate-vote-flash` de index.css
- Simplifie Vote.jsx : animation de sortie immediate (plus de delai 150ms)

**Card stack implemente (pattern pile de cartes)** :
- 2 cartes rendues en meme temps : carte actuelle (relative, z-10) + carte suivante (absolute, dessous)
- Au vote : carte du dessus swipe → revele celle du dessous
- Joueur suivant charge en arriere-plan (zero skeleton entre joueurs)
- 1er joueur affiche immediatement, 2e charge en parallele
- Timeout animation aligne sur duree exit (250ms)

**Fichiers modifies** :
- `frontend/src/pages/Vote.jsx` : supprime voteFlash
- `frontend/src/components/PlayerCard.jsx` : supprime voteFlash, ajoute state entered (en cours)
- `frontend/src/index.css` : supprime voteFlash, ajoute enterScale (en cours)

---

### Session du 4 fevrier 2026 (nuit) - Algo + Cron matchs

**Algorithme selection joueur ameliore (playersController.js)** :
- Favorise les joueurs connus (stars des grands clubs)
- Bonus club (0-50) : PSG=50, OM=40, Lyon=30...
- Bonus titulaire (0-30) : plus de matchs = plus visible
- Bonus stats (0-20) : buts + passes decisives
- Bonus fraicheur match (0-100) : boost si match recent
  - < 6h : +100 (le match vient de finir !)
  - < 24h : +60
  - < 48h : +30
  - < 72h : +15
- Penalite votes reduite (etait trop forte, favorisait les inconnus)

**Cron job mise a jour matchs** :
- Route `/api/admin/update-matches?key=footvibes-admin-2026`
- API : Football-Data.org (gratuit, 10 req/min)
- Met a jour `last_match_date` des joueurs apres chaque match
- Cron configure sur cron-job.org : `0 19,23 * * 5,6,0`
  - Vendredi, samedi, dimanche a 19h et 23h

**Fichiers crees/modifies** :
- `backend/routes/admin.js` : nouvelle route admin
- `backend/server.js` : ajout route admin
- `backend/controllers/playersController.js` : algo mis a jour
- `backend/package.json` : ajout node-fetch

---

### Session du 4 fevrier 2026 (nuit) - Polish carte joueur

**Effet tilt carte (PlayerCard.jsx)** :
- Tilt augmente de 10° a 15° au hover
- Effet 3D plus prononce

**Effet shine refait (index.css)** :
- Nouvelle approche : bandeau unique qui traverse la carte
- 1 seul passage (gauche → droite), 0.8s
- Angle 25°, largeur 50%
- Plus elegant que les multiples allers-retours

**Fichiers modifies** :
- `frontend/src/components/PlayerCard.jsx` : tilt 15°
- `frontend/src/index.css` : nouveau keyframes shine + .card-shine refait

---

### Session du 4 fevrier 2026 (soir) - Design Vibes

**Nouveau fond anime "Vibes" (index.css)** :
- Classe `.bg-vibes` : ondes animees avec effet parallaxe
- 2 couches d'ondes a vitesses differentes (80s et 60s)
- Ondes en SVG avec degradé vertical (6% opacite en haut, fondu a 30%)
- Couleurs : turquoise (#10B981) + indigo (#6366f1)
- Applique sur les 3 pages : Home, Vote, Classement

**Cartes clubs flat (ClubGrid.jsx)** :
- Fond unifie `bg-white/10` (plus de degrade par club)
- Hover : `bg-white/15`
- `backdrop-blur-sm` pour flouter les ondes derriere

**Page Classement - Top 3 turquoise (RankingTable.jsx)** :
- 1er : turquoise plein (`bg-emerald-500`)
- 2e : turquoise 70% (`bg-emerald-500/70`)
- 3e : turquoise 40% (`bg-emerald-500/40`)
- Plus de style or/argent/bronze

**Drapeaux nationalites - variantes francaises ajoutees** :
- ~50 nouvelles variantes : Allemagne, Espagne, Bresil, Senegal, etc.
- Toutes les nationalites de la BDD maintenant mappees

**Page Vote - viewport optimise** :
- Layout `h-[calc(100vh-64px)]` avec flex center
- Plus besoin de scroller pour voir les boutons
- Espacements reduits : stats py-2, club pb-3, hint mt-4

**Carte joueur - formatage noms (PlayerCard.jsx)** :
- Prenom : capitalize (Geronimo, pas GERONIMO)
- Club : formatage intelligent (Olympique de Marseille)
- Fonction `formatClubName()` : mots de liaison en minuscules

**Logo glow reduit (index.css)** :
- text-shadow : 20px/35% + 40px/15% (etait 30px/50% + 60px/30%)

**BDD - position corrigee** :
- "Defenseur" → "Défenseur" (avec accent)
- Contrainte CHECK mise a jour

**Fichiers modifies** :
- `frontend/src/index.css` : classe `.bg-vibes`, logo-glow reduit
- `frontend/src/pages/Home.jsx` : bg-vibes
- `frontend/src/pages/Vote.jsx` : bg-vibes, layout viewport
- `frontend/src/pages/Ranking.jsx` : bg-vibes
- `frontend/src/components/ClubGrid.jsx` : cartes flat
- `frontend/src/components/RankingTable.jsx` : top 3 turquoise, nationalites FR
- `frontend/src/components/PlayerCard.jsx` : formatage noms, espacements
- `backend/database/ligue1.db` : position Défenseur

---

### Session du 4 fevrier 2026 (matin)

**Refonte page d'accueil (Home.jsx)** :
- Grand logo "FOOT VIBES" central (5xl a 7xl responsive)
- Effet glow vert sur "VIBES" (text-shadow)
- Header masque sur homepage (evite redite logo)
- Header sticky qui apparait au scroll (> 80px) avec logo reduit + nav
- Bouton "Voir le classement" ajoute a cote du CTA principal
- Boutons CTA homogeneises (meme hauteur py-4, meme padding px-8)
- Tagline : "Vote pour tes joueurs de Ligue 1 preferes"

**Cartes clubs (ClubGrid.jsx)** :
- Fond degrade aux couleurs de chaque club (opacite 30%/15%) → remplace par flat en session soir
- Disposition verticale : logo au-dessus du nom
- Hover : bordure verte + glow vert (coherence logo VIBES)
- Logos plus grands (w-12 h-12)

**Couleurs clubs (config/clubs.js)** :
- Ajout propriete `colors` pour chaque club (2 couleurs principales)
- PSG (#004170, #DA291C), OM (#2FAEE0, #FFFFFF), Lyon (#1A3E8F, #E30613)...

**Page Vote - UX amelioree** :
- Ajout message d'erreur visible si API indisponible
- Bouton "Reessayer" pour recharger le joueur
- Affichage "X votes recus" du joueur (total_votes)
- Compteur perso "Mes votes : X" sous les boutons
- Bouton neutre remplace par emoji 🤔 stylise (je ne sais pas)
- Messages paliers theme foot :
  - 10 : "Tu t'es bien echauffe"
  - 25 : "Quelle aisance balle au pied"
  - 50 : "Ciseau-retourne"
  - 100 : "Quelle merveille !"
  - 250 : "Mais ou t'arreteras-tu ?"
  - 500 : "Hall of Fame !"

**Stats gardiens (backend)** :
- Script `updateGoalkeeperStats.js` via API SofaScore
- Source : https://api.sofascore.com (saison 77356 = 2025-2026)
- Stats recuperees : clean_sheets, saves, matches
- 32 gardiens mis a jour avec donnees reelles

---

### Session du 3 fevrier 2026 (soir)

**Refonte carte joueur (PlayerCard.jsx)** :
- Stats en tableau 2 colonnes : label a gauche, valeur a droite
- Chiffres en blanc gras (`text-white font-bold text-xl`)
- Plus d'espace vertical dans les stats (`py-3`)
- Nom de famille plus grand (`text-2xl`)
- Espace sous le club (`pb-6`)

**Page Classement - nouveaux filtres** :
- Filtre par periode : 7 jours / 30 jours / Toute la saison
- Filtre par club : dropdown "Tous les clubs" + 18 clubs
- Filtre par poste : dropdown "Tous les postes"
- Toggle "Francais uniquement" : style iOS (rond blanc qui glisse)
- Drapeaux nationalites affiches via flagcdn.com

**Backend - nouveaux parametres API /ranking** :
- `period` : week / month / (vide = saison)
- `nationality` : filtre par nationalite (ex: "France")
- Index ajoute sur `votes.voted_at` pour performances

**Mapping nationalites (RankingTable.jsx)** :
- ~100 nationalites mappees vers codes ISO (flagcdn.com)
- Inclut variantes francaises : Angleterre, Argentine, Cameroun, Grece, Pologne, Tchequie

**Tailwind config** :
- Couleur `fv-gold` ajoutee (#F5A623)

---

### Session du 3 fevrier 2026 (matin)

**Typographie titres** :
- Font heading : **Bebas Neue** (condensee, bold, style sport/affiche)
- Remplace Montserrat pour les titres
- `tracking-wide` ajoute pour aerer les lettres
- Fonts testees : Bebas Neue, Oswald, Anton, Russo One → Bebas Neue retenue

**Ajustements design page Vote** :
- Fond : nouveau style `bg-aurora-static` (gradient bleu/violet statique, sans animation)
- Feedback vote : repositionne en overlay (ne decale plus la carte)
- Fix blink au changement de joueur (reset player a null avant chargement)

**Ajustements UI** :
- CTA en minuscules : "Voter", "Classement", "Commencer a voter"
- Stats carte joueur : "PD" remplace par "Passes D."

**Styles de fond disponibles** (index.css) :
- Statiques : `bg-deep`, `bg-glow`, `bg-corner`, `bg-dual`, `bg-aurora-static`
- Animes : `bg-aurora`, `bg-mesh`, `bg-grid`, `bg-aurora-intense`

**Configuration Tailwind** (tailwind.config.js) :
- `fontFamily.heading` : Bebas Neue
- `fontFamily.sans` : Inter

---

### Session du 2 fevrier 2026 (soir)

**Deploiement effectue** :
- Backend deploye sur Render (region Frankfurt)
- Frontend deploye sur Vercel
- SPA routing configure (vercel.json)
- API health check OK

**Modifications UI** :
- Bouton downvote rouge plein
- Retrait emojis devant les postes
- Logo club affiche sur la carte joueur
- Logo club dans le header en mode club
- Bouton CLASSEMENT homogene avec VOTER
- Alias clubs BDD -> logos (LOSC Lille, Paris Saint-Germain, etc.)
- Fix logo Paris FC (ID 10004)

**Tests design fond anime** :
- Style "Aurora" (gradient bleu/violet anime) : RETENU - subtil et agreable
- Style "Mesh" (bulles flottantes) : teste, pas retenu
- Style "Grid" (grille + grain) : teste, pas retenu
- Style "Aurora Intense" (couleurs vives + glow) : teste, trop charge

**A explorer plus tard** :
- Autres styles de fond (waves, particles, spotlight)
- Trouver le bon equilibre entre sobre et wahou

---

## Donnees en base

**Import du 2 fevrier 2026** via Transfermarkt :
- **481 joueurs** des 18 clubs de L1 2025-2026
- **440 joueurs** avec au moins 1 match joue
- Stats a jour (buts, passes, matchs)
- Photos OK

**Top buteurs** : Greenwood (21), Panichelli (13), Sulc (12), Marriott (12), Ramos (10)

**Clubs** :
- PSG, OM, Lyon, Monaco, Lille, Nice, Lens, Rennes, Brest
- Strasbourg, Toulouse, Nantes, Le Havre, Auxerre, Angers
- **Promus** : Lorient, Paris FC, Metz

---

## Ce qui est fait

### Frontend (React + Vite + TailwindCSS)

| Composant | Fichier | Statut | Notes |
|-----------|---------|--------|-------|
| App principal | `src/App.jsx` | OK | Routing configure (/, /vote, /classement) |
| Header | `src/components/Header.jsx` | OK | Navigation dynamique selon la page |
| Page Home | `src/pages/Home.jsx` | OK | CTA Ligue 1 + grille des 18 clubs |
| Page Vote | `src/pages/Vote.jsx` | OK | Interface de vote complete avec raccourcis clavier |
| Page Classement | `src/pages/Ranking.jsx` | OK | Filtres club, poste, periode, nationalite, recherche |
| ClubGrid | `src/components/ClubGrid.jsx` | OK | Grille des 18 clubs cliquables |
| PlayerCard | `src/components/PlayerCard.jsx` | OK | Carte joueur avec stats adaptees au poste |
| VoteButtons | `src/components/VoteButtons.jsx` | OK | 3 boutons ronds (pouce bas/neutre/pouce haut) |
| RankingTable | `src/components/RankingTable.jsx` | OK | Tableau classement avec rang, drapeau, nom, club, score + pubs inline |
| AdBanner | `src/components/AdBanner.jsx` | OK | Banner pub reutilisable (4 formats, mode dev) |
| AdInterstitial | `src/components/AdInterstitial.jsx` | OK | Interstitiel plein ecran avec countdown |
| MatchGrid | `src/components/MatchGrid.jsx` | OK | Carrousel matchs recents (score/heure, fleches, snap mobile) |
| MiniPodium | `src/components/MiniPodium.jsx` | OK | Top 3 joueurs sur la Home (podium visuel) |
| ShareWhatsApp | `src/components/ShareWhatsApp.jsx` | OK | Partage Top 5 classement via WhatsApp |
| CookieBanner | `src/components/CookieBanner.jsx` | OK | Banniere RGPD cookies (accept/refuse, localStorage) |
| ModeContext | `src/contexts/ModeContext.jsx` | OK | Gestion mode (L1/club/match) + compteur votes en localStorage |
| API utils | `src/utils/api.js` | OK | Fonctions fetch pour l'API |

**Configuration Tailwind** : Couleurs custom (fv-blue, fv-red, fv-gold, fv-bg), fonts (Inter, Montserrat)

### Backend (Node.js + Express + SQLite)

| Element | Fichier | Statut | Notes |
|---------|---------|--------|-------|
| Serveur | `server.js` | OK | Express, CORS, init DB |
| Database | `models/database.js` | OK | @libsql/client (Turso), async helpers (queryAll, queryOne, runSql) |
| Config clubs | `config/clubs.js` | OK | 18 clubs L1 2025-2026 avec Transfermarkt IDs |
| Routes players | `routes/players.js` | OK | /random, /players, /players/:id, /ranking, /contexts |
| Routes votes | `routes/votes.js` | OK | POST /vote avec middlewares |
| Controller players | `controllers/playersController.js` | OK | Algo pondere par recence + popularite club |
| Controller votes | `controllers/votesController.js` | OK | Gestion vote + feedback rang |
| Rate limiter | `middleware/rateLimiter.js` | OK | 1 vote / 2 secondes |
| IP tracker | `middleware/ipTracker.js` | OK | 100 votes max / jour / IP |

### Base de donnees

| Table | Statut | Notes |
|-------|--------|-------|
| players | OK | Schema complet avec stats, votes, saison, archive |
| votes | OK | Historique des votes avec context |
| league_status | OK | Journee actuelle de la ligue |

**Saison configuree** : 2025-2026

**Clubs** : 18 clubs avec promus (Lorient, Paris FC, Metz) et relegues (Montpellier, Saint-Etienne, Reims)

### Scripts d'import

| Script | Statut | Notes |
|--------|--------|-------|
| importPlayers.js | Cree | Import initial API-Football |
| importTransfermarkt.js | Cree | Import via Transfermarkt |
| updateStats.js | Cree | Mise a jour stats |
| checkDb.js | Cree | Verification donnees |
| verifyData.js | Cree | Validation donnees |
| + nombreux scripts de test/scraping | Crees | Tests L'Equipe, Transfermarkt, etc. |

---

## Ce qui reste a faire

### Securite (audit 10 fevrier 2026)

- [x] **Deplacer la cle API Football-Data.org en variable d'environnement** FAIT
- [x] **CORS restreint** aux domaines prod (topflop.fr, vercel, localhost)
- [x] **Admin key sans fallback** : variable env obligatoire
- [x] **Vote mapping explicite** : `{1, 0, -1}` au lieu de passer req.body direct
- [x] **Validation inputs** : whitelist positions, plafond limit/offset, truncate search
- [x] **Rate limit 3s** (etait 2s)
- [x] **ipTracker via BDD** (etait compteur RAM, perdu au restart)
- [x] **Timeout fetch** Football-Data (15s)
- [x] **Nettoyage scripts morts** (36 supprimes)
- [x] **SEO** : robots.txt + sitemap.xml
- [x] **BDD persistante** : migre vers Turso (libSQL cloud, region EU West)
- [x] **Rate limit global** : 100 req/min sur /api/* (express-rate-limit)
- [x] **Helmet** : headers secu (X-Frame-Options, HSTS, X-Content-Type-Options)
- [x] **SQL interpolation** : supprimee dans votesController (3 requetes distinctes)
- [x] **Middleware erreur** : catch-all + unhandledRejection
- [x] **Deps inutilisees** : puppeteer + cheerio supprimes (-134 packages)
- [x] **Hash IP** (HMAC-SHA256) — conformite RGPD Article 32. Env var `IP_HASH_SECRET` a configurer sur Render
- [ ] **Browser fingerprinting** (FingerprintJS) — anti-spam v1.1

### Priorite haute (pour lancer le MVP)

- [x] **Verifier les donnees en BDD** : 481 joueurs importes (2 fev 2026)
- [x] **Tester l'app de bout en bout** : API testee OK, frontend sur port 5180
- [x] **Test manuel complet** : Navigation, vote, classement OK (2 fev soir)
- [x] **Deploiement** :
  - [x] Frontend sur Vercel : https://frontend-xtorbis-projects.vercel.app
  - [x] Backend sur Render : https://foot-vibes-api.onrender.com
  - [ ] Configuration domaine footvibes.fr (optionnel)

### Priorite moyenne (polish v1.1)

- [ ] **Design** :
  - [ ] Verifier responsive mobile (tester sur telephone)
  - [x] Placeholder photo joueur : silhouette gris clair (#9ca3af) sur fond sombre
- [ ] **Infra** :
  - [x] BDD persistante (Turso libSQL cloud)
  - [x] Nettoyage console.log en prod (1 seul log superflu supprime, reste = monitoring utile)

### Priorite basse (post-MVP v1.2+)

- [x] Swipe mobile (gauche/droite style Tinder) - touch events natifs, indicateur visuel
- [ ] Partage reseaux sociaux (Twitter/X, Instagram story)
- [x] Classements tendances (7 derniers jours, movers) - filtres periode implementes
- [ ] Legendes historiques (anciens joueurs L1)
- [ ] Authentification utilisateurs (v2.0)
- [ ] Comparaison joueurs (face a face)

---

## Suggestions pour la suite

### Option A : Deployer maintenant (recommande)

Le MVP est fonctionnel. Deployer rapidement permet de :
1. Collecter des vrais votes et feedback utilisateurs
2. Identifier les vrais problemes (pas ceux qu'on imagine)
3. Creer de l'engagement avant la fin de saison L1

**Etapes deploiement** :
1. Creer compte Vercel + deployer frontend (gratuit)
2. Creer compte Railway/Render + deployer backend avec BDD
3. Configurer variables d'environnement (API_URL)
4. Tester en production
5. Configurer domaine footvibes.fr (si achete)

### Option B : Polish avant deploiement

Si l'objectif est une experience plus finie :
1. Ajouter animations de vote (1-2h)
2. Tester/corriger responsive mobile (1-2h)
3. Ajouter messages d'encouragement (30min)
4. Puis deployer

### Option C : Ameliorations fonctionnelles

Avant deploiement, ajouter des features differenciantes :
1. Partage "Mon classement" sur reseaux sociaux
2. Badge/titre selon nombre de votes (Rookie, Expert, Legende)
3. Statistiques personnelles (joueurs les plus votes, etc.)

---

## Services externes

| Service | Usage | Coût |
|---------|-------|------|
| **Vercel** | Hébergement frontend | Gratuit |
| **Render** | Hébergement backend | Gratuit |
| **Turso** | BDD libSQL cloud (EU West) | Gratuit (500M reads, 10M writes) |
| **GitHub** | Code source | Gratuit |
| **Football-Data.org** | API matchs L1 (cron) | Gratuit (10 req/min) |
| **cron-job.org** | Planification cron weekend | Gratuit |
| **flagcdn.com** | Drapeaux nationalités | Gratuit (CDN public) |
| **Google AdSense** | Monetisation pub | Gratuit (revenus au CPM) |
| **Vercel Analytics** | Tracking pages vues + Web Vitals | Gratuit (2500 events/mois) |

**APIs testées mais abandonnées :**
- SofaScore : bloqué (Cloudflare 403)
- Transfermarkt : utilisé pour import initial uniquement (scraping)

**Coût total : 0€/mois**

---

## Architecture technique

```
Billboard/
├── frontend/                 # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/       # Header, PlayerCard, VoteButtons, etc.
│   │   ├── contexts/         # ModeContext (mode L1/club + compteur)
│   │   ├── pages/            # Home, Vote, Ranking
│   │   └── utils/            # api.js (fetch functions)
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/                  # Node.js + Express + Turso (libSQL)
│   ├── config/               # clubs.js (18 clubs L1)
│   ├── controllers/          # playersController, votesController
│   ├── middleware/           # rateLimiter, ipTracker
│   ├── models/               # database.js (Turso/libSQL)
│   ├── routes/               # players.js, votes.js
│   ├── scripts/              # Import, scraping, verification
│   └── server.js
│
├── database/
│   └── ligue1.db             # SQLite database
│
├── docs/                     # Documentation detaillee
│   ├── 01-BRAND.md
│   ├── 02-PERSONAS.md
│   ├── 03-UX-UI.md
│   ├── 04-USER-STORIES.md
│   ├── 05-ARCHITECTURE.md
│   ├── 06-API.md
│   ├── 07-ANTI-SPAM.md
│   ├── 08-DATA.md
│   ├── 09-SCORING.md
│   └── 10-ROADMAP.md
│
└── REQUIREMENTS.md           # Spec complete du projet
```

---

## API Endpoints implementes

| Methode | Route | Description |
|---------|-------|-------------|
| GET | /api/players/random | Joueur aleatoire pondere (recence + popularite) |
| GET | /api/players | Liste joueurs filtree |
| GET | /api/players/:id | Details joueur avec rang |
| GET | /api/ranking | Classement avec filtres (club, position, period, nationality, search) |
| GET | /api/contexts | Liste des modes (L1 + 18 clubs) |
| POST | /api/vote | Enregistrer un vote |
| GET | /api/matches/recent | Matchs de la journee en cours (smart matchday) |
| GET | /api/health | Health check |
| GET | /api/admin/update-matches | Met a jour last_match_date (cron, cle requise) |
| GET | /api/admin/health | Health check admin |

---

## Algorithme de selection joueur

L'algo de selection du joueur suivant utilise 2 etapes :

**Etape 1 : Selection bucket par recence journee** (80/15/4/1%) :
- 80% : Joueurs ayant joue la journee actuelle
- 15% : J-1
- 4% : J-2
- 1% : Plus ancien

**Etape 2 : Ponderation dans le bucket** (favorise les stars) :
- Base : 50 points
- Bonus fraicheur match : +100 si < 6h, +60 si < 24h, +30 si < 48h, +15 si < 72h
- Bonus club : +50 (PSG) a +5 (petits clubs)
- Bonus titulaire : +1.5 par match joue (max +30)
- Bonus stats : +2 par but/passe (max +20)
- Penalite votes : -3×log(votes) (max -15)

**Exemple** :
- Greenwood (OM, 21 buts, 20 matchs, match hier) : 50 + 60 + 40 + 30 + 20 - 5 = **195 pts**
- Remplacant inconnu (Auxerre, 0 stats, pas de match recent) : 50 + 0 + 5 + 3 + 0 - 2 = **56 pts**

---

## Commandes utiles

```bash
# Frontend
cd frontend
npm install
npx vite --port 5180    # Dev server sur http://localhost:5180

# Backend
cd backend
npm install
npm start               # API sur http://localhost:3001

# Verification BDD
cd backend
node scripts/checkDb.js

# Reimport donnees Transfermarkt (si besoin)
cd backend
node scripts/importTransfermarkt.js
```

**Note** : Port 5173 souvent occupe par autre projet (MPG), utiliser 5180 pour Foot Vibes.

---

## Notes importantes

1. **Saison** : Configure pour 2025-2026, les clubs ont ete mis a jour avec les promus/relegues
2. **Photos** : Utilise les photos de l'API (Transfermarkt ou API-Football)
3. **Anti-spam** : Rate limiting (3s) + IP tracking BDD hashee HMAC-SHA256 (200/jour) + 1 vote/joueur/IP/24h
4. **Positions** : Gardien, Défenseur, Milieu, Attaquant (whitelist validee cote serveur)
5. **Securite** : CORS restreint, admin key env-only, validation inputs, timeout fetch, helmet, rate limit global 100/min
6. **Scores** : upvotes - downvotes (minimum 1 vote pour apparaitre au classement)
7. **BDD** : Turso (libSQL cloud) en prod, fallback fichier local en dev. Env vars : `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
8. **Env vars Render** : `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `IP_HASH_SECRET`, `ADMIN_KEY`, `FOOTBALL_DATA_API_KEY`, `CORS_ORIGINS`

---

## Historique des decisions

| Date | Decision |
|------|----------|
| Janvier 2026 | Rebrand "Billboard" -> "Foot Vibes" |
| Janvier 2026 | Choix stack : React + Vite + TailwindCSS / Express + SQLite (migre vers Turso 10 fev) |
| Janvier 2026 | Wording votes : Pouce haut / Neutre / Pouce bas (icones) |
| Janvier 2026 | Algo pondere par recence de match + popularite club |
| Janvier 2026 | 18 clubs directement sur homepage (pas d'ecran intermediaire) |
| Janvier 2026 | Saison 2025-2026 avec nouveaux promus/relegues |
| 2 fev 2026 | Reimport donnees Transfermarkt : 481 joueurs, bons clubs 2025-2026 |
| 2 fev 2026 | Mise a jour ClubGrid.jsx : retrait relegues, ajout promus |
| 2 fev 2026 | Tests API OK, frontend sur port 5180 (5173 occupe par MPG) |
| 2 fev 2026 (soir) | Test complet MVP : navigation, vote, classement OK - pret pour deploiement |
| 2 fev 2026 (soir) | Deploiement : Backend sur Render, Frontend sur Vercel |
| 2 fev 2026 (soir) | UI : bouton downvote rouge, logos clubs, boutons homogenes |
| 2 fev 2026 (soir) | Design : style Aurora retenu (gradient anime subtil) |
| 3 fev 2026 | Typo titres : Bebas Neue retenue (vs Oswald, Anton, Russo One) |
| 3 fev 2026 | PlayerCard : stats en tableau 2 colonnes, nom agrandi |
| 3 fev 2026 | Classement : filtres periode (7j/30j/saison), club, nationalite |
| 3 fev 2026 | Drapeaux nationalites via flagcdn.com |
| 3 fev 2026 | Toggle iOS pour filtre "Francais uniquement" |
| 4 fev 2026 | Refonte homepage : grand logo + cartes clubs colorees |
| 4 fev 2026 | Header sticky au scroll sur homepage |
| 4 fev 2026 | Vert fv-green (#10B981) comme fil conducteur design |
| 4 fev 2026 (soir) | Fond "Vibes" : ondes animees parallaxe sur toutes les pages |
| 4 fev 2026 (soir) | Cartes clubs flat (bg-white/10) - abandon des couleurs par club |
| 4 fev 2026 (soir) | Top 3 classement : turquoise avec opacites (plus d'or/argent/bronze) |
| 4 fev 2026 (soir) | Vote : layout viewport sans scroll |
| 4 fev 2026 (soir) | Noms clubs : formatage intelligent (Olympique de Marseille) |
| 6 fev 2026 | Monetisation : emplacements AdSense (interstitiel, banners) |
| 6 fev 2026 | Interstitiel tous les 10 votes, banners sur Home/Classement |
| 10 fev 2026 | Audit securite : CORS, validation inputs, rate limit, ipTracker BDD |
| 10 fev 2026 | Nettoyage 36 scripts morts, ajout sitemap/robots.txt SEO |
| 10 fev 2026 | Migration BDD : sql.js → Turso (libSQL cloud, EU West, persistante) |
| 10 fev 2026 | Audit 4 agents + 8 fixes : rate limit global, helmet, SQL fix, contraste, debounce |
| 10 fev 2026 | Nouveau favicon : pouce haut emerald sur fond navy |
| 10 fev 2026 | Hash IP HMAC-SHA256 pour conformite RGPD (plus d'IP en clair en BDD) |
| 10 fev 2026 | Dimensions explicites sur toutes les images (anti-CLS) |
| 10 fev 2026 | AdSense conditionne au consentement cookies (RGPD) |
| 10 fev 2026 | Cache-Control sur API (60s ranking, 5min matchs, 10min contexts) |
| 10 fev 2026 | Vercel Analytics integre (@vercel/analytics) |
| 10 fev 2026 | Bouton neutre : smiley meh (remplace pouce horizontal) |
| 10 fev 2026 | Limite votes quotidiens : 200 → 500 |
| 10 fev 2026 | Fix joueurs 0 match exclus de la selection aleatoire |
