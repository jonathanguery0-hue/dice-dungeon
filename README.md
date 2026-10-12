# Dice Dungeon Duel — V7

Version entièrement réécrite : même univers, mêmes cartes, mêmes illustrations,
mais un code propre, des règles testées et une interface pensée d'abord pour le téléphone.
Aucune dépendance, aucune étape de compilation : ce sont de simples fichiers statiques.

## Apprendre à jouer
Menu → **🎓 Tutoriel** : un premier duel guidé en 19 étapes (lancer, invoquer, se déplacer, charger,
attaquer, cartes, tactique, siège). Il se termine en vrai duel contre l'IA.

## Organisation du code
| Fichier | Rôle |
|---|---|
| `index.html` | squelette des écrans |
| `css/style.css` | tout le style (mobile d'abord, puis paysage / ordinateur) |
| `js/data.js` | données : monstres, effets, compétences, arènes, campagne, niveaux |
| `js/art.js` | illustrations SVG des cartes |
| `js/engine.js` | **moteur de règles** : tout l'état d'un duel, sans affichage |
| `js/ai.js` | IA du rival (passe par le moteur, mêmes règles que le joueur) |
| `js/store.js` | sauvegardes (niveau, deck, campagne, duel en cours) |
| `js/audio.js` | musique et bruitages générés (aucun fichier son) |
| `js/ui.js` | interface : menus, deck, campagne, plateau tactile, animations |
| `sw.js`, `manifest.webmanifest`, `icons/` | application installable et hors-ligne |
| `tests/` | tests des règles + 400 parties IA contre IA |

Tes sauvegardes de la V6 (niveau, deck, campagne) sont reprises automatiquement.

## Jouer / tester en local
```
python3 -m http.server 8000      # puis http://localhost:8000
node --test                      # tests des règles (Node 18+)
```
Sur ton téléphone (même Wi-Fi) : `http://IP-DE-TON-PC:8000`.
Le simple double-clic sur `index.html` marche aussi, mais sans le mode hors-ligne.

## Mettre en ligne (gratuit, HTTPS)
- **Netlify Drop** (le plus simple) : https://app.netlify.com/drop → glisse le dossier.
- **GitHub Pages** : pousse le dossier dans un dépôt → Settings → Pages → branche `main`, dossier racine.
- Cloudflare Pages, Vercel, itch.io (zip « HTML », coche « mobile friendly ») marchent aussi.

**Mise à jour** : remplace les fichiers puis change `VERSION` dans `sw.js`,
sinon les téléphones gardent l'ancienne version en cache.

## Installer sur téléphone
- iPhone (Safari) : Partager → « Sur l'écran d'accueil ».
- Android (Chrome) : bouton « 📲 Installer le jeu » du menu, ou ⋮ → « Installer l'application ».

## Les stores (plus tard)
- Google Play : https://www.pwabuilder.com génère le paquet Android depuis l'URL (25 $ une fois).
- App Store : Capacitor + Xcode sur Mac (99 $/an). Apple refuse souvent un simple site emballé.
- ⚠ Le jeu s'inspire de Dungeon Dice Monsters (Konami) : vérifie les questions de propriété
  intellectuelle avant une publication commerciale.
