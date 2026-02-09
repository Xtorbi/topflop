# Design System — Topflop

## Identit\xE9 visuelle

### Palette de couleurs
| R\xF4le | Couleur | Variable Tailwind |
|------|---------|-------------------|
| Fond principal | `#0f1629` | `fv-navy` / `fv-bg` |
| Vert accent | `#10B981` | `fv-green` / `emerald-500` |
| Vert hover | `#059669` | `fv-green-dark` / `emerald-600` |
| Rouge downvote | `#EF4444` | `red-500` |
| Texte principal | `#FFFFFF` | `white` |
| Texte secondaire | `rgba(255,255,255,0.7)` | `white/70` |
| Cartes | `rgba(255,255,255,0.1)` | `white/10` |

### Couleurs Top 3 classement
| Rang | Couleur |
|------|---------|
| 1er | `emerald-500` (vert plein) |
| 2e | `emerald-500/70` (vert 70%) |
| 3e | `emerald-500/40` (vert 40%) |

### Typographie
- **Titres** : Bebas Neue (condensed, style sport/affiche)
- **Corps** : Inter (sans-serif lisible)
- **Taille min mobile** : 16px
- **tracking-wide** sur les titres

### Ambiance
- Sport, dynamique, gaming
- Dark mode natif
- Animations fluides (ondes, swipe)
- Vert \xE9meraude comme fil conducteur
- Contraste fort sur fond sombre

---

## Classes CSS du projet (index.css)

### Fonds anim\xE9s
```css
.bg-vibes          /* Ondes anim\xE9es parallaxe - pages principales */
.bg-aurora         /* Gradient anim\xE9 bleu/violet */
.bg-deep           /* Gradient statique profond */
```

### Effets sp\xE9ciaux
```css
.logo-glow         /* Glow vert sur le logo */
.card-shine        /* Effet shine au hover */
.animate-vote-bounce  /* Rebond au clic vote */
.animate-scale-in  /* Apparition avec scale */
```

### Swipe mobile (Vote.jsx)
- Touch events natifs
- Seuil 80px horizontal, 60px vertical
- Indicateur visuel pendant le drag (ombre color\xE9e)

---

## Composants sp\xE9cifiques

### PlayerCard.jsx
- Photo joueur (API Transfermarkt)
- Nom (pr\xE9nom capitalize, nom uppercase)
- Club + logo
- Stats adapt\xE9es au poste (Gardien vs Attaquant)
- Effet tilt 3D au hover (15\xB0)

### VoteButtons.jsx
- 3 boutons ronds : down (rouge), neutre (gris), up (vert)
- Ic\xF4nes SVG pouce
- Animation bounce au clic
- Touch-friendly (64x64 mobile)

### RankingTable.jsx
- Colonnes : Rang, Drapeau, Joueur, Club, Poste, Votants, Score
- Couleurs Top 3
- Pubs inline tous les 25 joueurs
- Responsive (colonnes cach\xE9es sur mobile)

### ClubGrid.jsx
- Grille 18 clubs L1
- Cartes flat `bg-white/10`
- Hover : `bg-white/15` + bordure verte
- Logo + nom du club

---

## Animations existantes

| Animation | Dur\xE9e | Comportement |
|-----------|--------|-------------|
| Ondes bg-vibes | 60-80s | Parallaxe, 2 couches |
| Card shine | 0.8s | Bandeau lumineux au hover |
| Swipe carte | suivi du doigt | Translate + rotation |
| Vote bounce | 200ms | Rebond rapide au clic |

### Principes d'animation Topflop
- **Dynamique** : style sport/gaming
- **Fluide** : pas de saccades
- **R\xE9actif** : feedback imm\xE9diat

---

## Structure fichiers UI

```
frontend/src/
\u251C\u2500\u2500 components/
\u2502   \u251C\u2500\u2500 Header.jsx
\u2502   \u251C\u2500\u2500 Footer.jsx
\u2502   \u251C\u2500\u2500 PlayerCard.jsx
\u2502   \u251C\u2500\u2500 VoteButtons.jsx
\u2502   \u251C\u2500\u2500 RankingTable.jsx
\u2502   \u251C\u2500\u2500 ClubGrid.jsx
\u2502   \u251C\u2500\u2500 AdBanner.jsx
\u2502   \u2514\u2500\u2500 AdInterstitial.jsx
\u251C\u2500\u2500 pages/
\u2502   \u251C\u2500\u2500 Home.jsx
\u2502   \u251C\u2500\u2500 Vote.jsx
\u2502   \u251C\u2500\u2500 Ranking.jsx
\u2502   \u251C\u2500\u2500 About.jsx
\u2502   \u251C\u2500\u2500 Contact.jsx
\u2502   \u251C\u2500\u2500 Privacy.jsx
\u2502   \u2514\u2500\u2500 Terms.jsx
\u251C\u2500\u2500 contexts/
\u2502   \u2514\u2500\u2500 ModeContext.jsx
\u251C\u2500\u2500 config/
\u2502   \u2514\u2500\u2500 clubs.js
\u251C\u2500\u2500 index.css          /* Styles globaux, animations */
\u2514\u2500\u2500 App.jsx            /* Routing */
```

---

## Ressources

- **Tailwind Config** : `tailwind.config.js` (couleurs custom `fv-*`)
- **Fonts** : Google Fonts (Bebas Neue, Inter)
- **Icons** : SVG inline (pouces, chevrons)
- **Drapeaux** : flagcdn.com
- **Logos clubs** : API Transfermarkt

---

## Stack & conventions
- **Framework** : React + Vite
- **Styles** : TailwindCSS (classes custom dans `tailwind.config.js` + `index.css`)
- **H\xE9bergement** : Frontend Vercel, Backend Render
- **Conventions** : utiliser les classes Tailwind existantes, variables CSS dans `index.css` si r\xE9utilis\xE9es, pr\xE9f\xE9rer `transform` et `opacity` pour GPU, \xE9viter les re-renders inutiles (React)
