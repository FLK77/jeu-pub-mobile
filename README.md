# Le Dernier Royaume · V1.0.0

Jeu original de défense de village inspiré des mécaniques de la vidéo fournie : un roi seul à l’arc défend sa maison, récupère des pièces et recrute des archers. La scène utilise Three.js et WebGL 2 : personnages en volume, couronne, arcs, flèches, pièces animées, maison à toit incliné, protections en pierre, palissades, arbres, ombres et éclairage. Tous les modèles sont créés dans le code ; aucune ressource de la publicité n’est utilisée.

## Jouer immédiatement sur PC Windows

1. Télécharger `Royaume-PC-V1.zip` et choisir **Extraire tout**.
2. Ouvrir le dossier `Royaume-PC` et double-cliquer sur **LANCER-JEU.bat**.
3. Autre possibilité : ouvrir directement **jeu-pc.html** avec Edge, Chrome ou Firefox récent.

Le moteur 3D et le jeu sont inclus dans le fichier HTML : aucun serveur, compte ou téléchargement supplémentaire n’est nécessaire après extraction. Un navigateur avec WebGL 2 et accélération graphique est requis. Le jeu affiche un message si la 3D n’est pas disponible. La partie n’est pas sauvegardée à la fermeture.

## Commandes et progression

- **ZQSD / WASD / flèches**, ou **joystick tactile** : déplacer le roi. Les directions suivent l’écran malgré l’angle de la caméra.
- Tirs automatiques sur les ennemis proches. Approcher des pièces pour les récupérer ; chaque ennemi rapporte 10 pièces.
- Boutons : recruter un archer, renforcer/réparer la maison ou améliorer l’arc. Les prix augmentent avec les achats.
- Renforcer la maison ajoute aussi des protections en pierre visibles en 3D.
- Les vagues deviennent progressivement plus difficiles ; une nouvelle partie peut être lancée après la défaite.
- Espace ou bouton de pause : pause/reprise. Son facultatif activable par le joueur.

## Développement

Node.js 24 et Python 3 (uniquement pour construire le ZIP) :

```sh
npm ci
npm run build:pc
npm start
```

Le serveur écoute sur le port 3000, configurable par `PORT`. Si ce port est occupé, utiliser par exemple `PORT=3200 npm start`. Chaque tâche cloud est déjà isolée : utiliser le dépôt existant, sans créer de worktree sauf demande explicite.

`game.js` contient la simulation et les commandes. `world3d.js` construit la scène et synchronise les objets avec la simulation. `painted-textures.js` crée les textures peintes directement dans le navigateur, sans image externe. `npm run build` assemble Three.js et ces modules dans `game.bundle.js`. `npm run build:pc` reconstruit aussi l’édition HTML autonome et le ZIP. Reconstruire avant de publier les changements de code : les fichiers générés sont versionnés pour être immédiatement téléchargeables. La licence MIT de Three.js figure dans `THIRD-PARTY-NOTICES.txt`, également incluse dans le ZIP.

## Mobile

La version web conserve les commandes tactiles et l’interface adaptée au portrait et au paysage : boutons d’au moins 44 px, marges pour les encoches, achats accessibles sans défilement et caméra suivant le roi. Un second doigt ne vole pas le joystick. La rotation, une annulation tactile ou une perte de capture relâchent les commandes ; le jeu se met en pause en arrière-plan.

Les décors statiques sont regroupés par matériau, l’herbe utilise des instances et les ombres ainsi que la résolution sont réduites sur les appareils tactiles. Les géométries propres aux personnages sont libérées lorsqu’ils disparaissent. La perte du contexte graphique met le jeu en pause.

Cible : Safari iOS 16+ et Chrome Android récents avec WebGL 2, ainsi que les navigateurs PC modernes. Les tests Chromium couvrent neuf formats, dont trois paysages, avec événements tactiles réels. Le rendu et les performances sur un véritable iPhone restent à valider ; WebKit n’a pas pu être téléchargé dans cet environnement cloud. Safari permet d’ajouter le site à l’écran d’accueil. Aucun mode hors ligne mobile n’est installé.

## Vérifications

```sh
npm test
npm run test:browser
npm run test:pc
```

- Le test HTTP vérifie la page, le script assemblé et la feuille de style.
- Les neuf tests navigateur vérifient les neuf formats mobile/tablette, les gestes tactiles, la capture du joystick, les interruptions, la rotation, la caméra 3D, le combat, les pièces, les achats, le redémarrage et les commandes PC. Des tests vérifient aussi la création/suppression des objets 3D, les protections, les textures, les proportions du roi et la stabilité de l’image en pause.
- Le test PC extrait le ZIP dans un chemin contenant des espaces et vérifie le rendu WebGL réel, le déplacement du roi, la pause et l’absence de requêtes réseau. La politique du navigateur cloud interdit les navigations `file://` et `data:` : le document extrait est donc chargé via `page.setContent`. Le batch et le double-clic restent à valider sur Windows réel.

Chromium système est détecté dans `/usr/bin/chromium` ; `CHROMIUM_PATH` permet une autre installation. Sinon : `npx playwright install chromium`. Les tests de simulation injectent leurs accès à l’état uniquement dans les réponses de test, jamais dans le jeu livré. Pour WebKit, installer ses dépendances et le navigateur avec `npx playwright install webkit`, puis lancer `BROWSER=webkit npm run test:browser` (le test CDP de multitactile brut sera explicitement ignoré). Ses téléchargements nécessitent `cdn.playwright.dev` et `playwright.download.prss.microsoft.com`.

## GitHub Pages

Les fichiers `index.html`, `style.css` et `game.bundle.js` forment le site statique, avec chemins relatifs permettant un sous-répertoire. Les polices Google sont facultatives et ont un repli local ; elles sont retirées de l’édition PC hors ligne.

Dans GitHub, ouvrir **Settings → Pages → Deploy from a branch**, sélectionner la branche contenant les fichiers puis **/(root)** et enregistrer. Après le déploiement, ouvrir le lien fourni par GitHub dans Safari ou un navigateur PC. La disponibilité de Pages pour les dépôts privés dépend de l’offre GitHub ; ne pas rendre le dépôt public sans accord du propriétaire.

## V1

Cette version 1.0.0 fixe la base jouable : défense de maison, arc automatique, vagues, collecte, recrutement et améliorations. Elle utilise une palette plus vive, des textures peintes (herbe, terre, bois, toit, enduit, pierre et tissu), des personnages aux formes arrondies et de plus grands visages. Les ombres sont filtrées et leurs biais réglés pour réduire le scintillement ; l’anticrénelage est aussi activé sur mobile. La profondeur excessive du buste du roi est corrigée.

Le ZIP comporte `VERSION.txt`. `Royaume-PC.zip` reste disponible comme alias de téléchargement ; `Royaume-PC-V1.zip` identifie cette première version. Les tests du navigateur cloud ne garantissent pas l’absence de scintillement sur tous les pilotes graphiques : un contrôle sur le PC du joueur et un iPhone réel restent nécessaires.
