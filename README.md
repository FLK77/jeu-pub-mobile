# Le Dernier Royaume · V2.0.0

**L’Aube de Valdor** transforme la défense de village en première aventure d’exploration et de reconstruction. Le roi a perdu une guerre : trouvez des survivants dans une forêt ouverte, ramenez-les au refuge et rebâtissez votre civilisation entre des assauts espacés. Voir [DESIGN-V2.md](DESIGN-V2.md) pour les règles complètes.

## Jouer immédiatement sur PC Windows

Télécharger **Royaume-PC-V2.zip**, choisir **Extraire tout**, ouvrir le dossier `Royaume-PC` puis double-cliquer sur **LANCER-JEU.bat**. On peut aussi ouvrir directement `jeu-pc.html` avec Edge, Chrome ou Firefox récent, compatible WebGL 2. Aucun serveur, installation ou connexion n’est nécessaire après le téléchargement : le moteur 3D, les modèles et les textures sont inclus.

La V1 reste conservée dans `Royaume-PC-V1.zip` et dans le tag Git `v1.0.0`. `Royaume-PC.zip` désigne la version courante ; `VERSION.txt` identifie la version dans le paquet.

## Commandes

- **ZQSD / WASD / flèches** : se déplacer ; les tirs sont automatiques.
- **E** : monter/descendre du cheval, secourir un survivant ou fouiller des vestiges, selon ce qui est proche.
- **M / Échap / Espace** : ouvrir ou fermer le menu et mettre en pause.
- Sur mobile : joystick et bouton d’interaction contextuel, menu en haut à droite.

Le terrain occupe toute la fenêtre, en portrait ou paysage. Le menu rassemble la gestion du royaume, la carte des zones explorées, l’histoire et les options. Le véritable mode plein écran du navigateur est disponible dans **Options** lorsque le navigateur l’autorise ; Safari sur iPhone peut utiliser l’ajout à l’écran d’accueil. Le menu suspend les attaques, le déplacement et les délais d’arrivée.

## Progression

Le cheval attend près du refuge et double la vitesse de déplacement. Les survivants doivent être trouvés pendant les accalmies et escortés chez eux. Les vestiges financent les reconstructions et les recrutements. Les assauts sont annoncés 25 secondes à l’avance et séparés par des périodes de calme de 90 à 170 secondes (120 secondes avant le premier).

Les tranches de dix habitants réservent **2 arrivées spontanées, 3 engagements payants et 5 secours en forêt**. Ces proportions cibles de **20 % / 30 % / 50 %** sont détaillées dans le menu. Un premier sauvetage est nécessaire pour commencer les autres modes de recrutement. Deux reconstructions font passer la capacité de 10 à 20 puis 30 habitants ; quinze camps permettent de remplir la part des survivants. Des bâtisseurs produisent lentement des pièces, et les archers défendent le refuge.

La V2 couvre une région et les premières étapes de reconstruction. La reconquête des royaumes ennemis n’est pas encore jouable. La partie reste en mémoire uniquement : aucune sauvegarde entre sessions.

## Développement

Node.js 24, Python 3 pour le ZIP :

```sh
npm ci
npm run build:pc
npm start
```

Port 3000 par défaut ; utiliser `PORT=3200 npm start` si occupé. Chaque tâche cloud est déjà isolée : utiliser le dépôt existant, sans créer de worktree sauf demande explicite.

- `simulation.js` : règles et progression, testables sans navigateur.
- `world-data.js` : limites de la région, camps, lieux et forêt déterministe, index spatial des collisions.
- `world3d.js` : scène Three.js, modèles, animation, secteurs de forêt et niveaux de détail.
- `game.js` : commandes, menus, affichage et boucle principale.
- `painted-textures.js` : textures peintes générées localement.

`npm run build` assemble ces modules avec Three.js dans `game.bundle.js`. `npm run build:pc` reconstruit aussi le HTML autonome et le ZIP versionné. Les sorties sont conservées dans Git pour permettre un téléchargement et un hébergement statique immédiats. La licence de Three.js est incluse dans le paquet.

## Vérifications

```sh
npm test
npm run test:browser
npm run test:pc
```

Les tests de simulation couvrent notamment la vitesse montée, les escortes, les quotas des trois origines, les arrivées autonomes, les reconstructions, les collisions et les attaques intermittentes. Les tests navigateur vérifient l’interface plein écran sur neuf formats, le prologue, les menus, les commandes tactiles et clavier, le cheval, la progression, la caméra et le redémarrage. Les accès à l’état sont injectés seulement dans les réponses de test.

Le test PC extrait le ZIP, vérifie sa version et le script livré, puis exerce le document en mode hors réseau. La politique du navigateur cloud bloque `file://` et `data:` : les essais utilisent `page.setContent`. Le batch et le double-clic doivent encore être confirmés sur Windows réel. Les essais matériels iPhone restent nécessaires pour le rendu et les performances.

Chromium est détecté dans `/usr/bin/chromium`, ou via `CHROMIUM_PATH`. Sinon, utiliser `npx playwright install chromium`. WebKit peut être utilisé avec `BROWSER=webkit npm run test:browser` après installation de son navigateur et de ses bibliothèques ; le test CDP de gestes bruts y sera explicitement ignoré. Les domaines de téléchargement WebKit sont bloqués dans cet environnement cloud.

## GitHub Pages

Servir `index.html`, `style.css` et `game.bundle.js`, avec leurs chemins relatifs. Dans **Settings → Pages**, choisir **Deploy from a branch**, la branche voulue et **/(root)**. L’hébergement de dépôts privés dépend de l’offre GitHub ; ne pas rendre le dépôt public sans autorisation. Les polices Google de la version web sont facultatives et retirées de l’édition PC hors ligne.
