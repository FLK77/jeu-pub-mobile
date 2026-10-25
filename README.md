# Le Dernier Royaume

Prototype original de défense de village, inspiré des mécaniques de la vidéo fournie. Jeu web en français, sans dépendance d’exécution, compatible tactile et clavier. Playwright est une dépendance de développement pour les tests navigateur. Graphismes dessinés dans Canvas, sans ressources de la publicité.

## Démarrage

Node.js 24 (aucun paquet à installer) :

```sh
npm start
```

Le serveur écoute sur le port 3000 (modifiable avec `PORT`).

## Jouer

Déplacer le roi avec ZQSD, WASD, les flèches ou le joystick tactile. Il tire automatiquement sur les ennemis proches. Ramasser les pièces en s'approchant : chaque ennemi rapporte 10 pièces. Recruter des archers, renforcer/réparer la maison ou améliorer l'arc avec les boutons. Les vagues deviennent progressivement plus difficiles. Espace ou bouton de pause ; bouton de reprise après une défaite. Son facultatif.

La partie reste en mémoire uniquement. Prototype 2D : pas encore de sauvegarde, de progression entre parties ni de version native iOS.

## Compatibilité mobile

- Interface adaptée au portrait et au paysage : sur téléphone, le terrain et les achats restent visibles ensemble, sans défilement.
- Joystick avec capture du pointeur : le doigt peut sortir du cercle. Un second doigt ne vole pas la commande.
- Réinitialisation des commandes après rotation, annulation tactile ou perte de capture ; pause à la perte de focus ou lors d’un passage en arrière-plan.
- Cibles tactiles d’au moins 44 px et marges tenant compte des zones réservées aux encoches de l’iPhone.
- Caméra suivant le roi sur les deux axes, sans étirer les graphismes.
- Audio facultatif activé par une action du joueur. Le zoom du navigateur reste disponible en dehors du terrain.
- Depuis Safari, le jeu peut être ajouté à l’écran d’accueil. Il nécessite une connexion pour le chargement initial ; aucun mode hors ligne n’est installé.

La cible est Safari iOS 16+ et Chrome Android récents, ainsi que les navigateurs PC modernes. Les tests automatisés Chromium couvrent neuf dimensions de 320 × 568 à 1024 × 768, dont trois formats paysage, avec clavier, souris et événements tactiles. Les tests sur un appareil iPhone physique restent à effectuer. WebKit n’a pas pu être installé dans l’environnement cloud, ses domaines de téléchargement étant bloqués.

## Vérifications

```sh
npm ci
npm test
npm run test:browser
```

`npm test` vérifie les routes HTTP. Les sept tests navigateur vérifient l’affichage sur neuf formats, les gestes tactiles, les interruptions, la rotation, la caméra, le combat, les pièces, les achats, le redémarrage et les commandes PC. Ils ne modifient pas le code servi aux joueurs : les accès à l’état interne sont injectés uniquement dans les réponses du navigateur de test.

Le navigateur Chromium système est utilisé lorsqu’il se trouve dans `/usr/bin/chromium`. Sinon, installer le navigateur avec `npx playwright install chromium` (ou définir `CHROMIUM_PATH` pour une autre installation). Sur une machine disposant des dépendances WebKit, on peut exécuter :

```sh
npx playwright install webkit
BROWSER=webkit npm run test:browser
```

Le test multitactile brut utilise CDP et sera explicitement ignoré sous WebKit ; les six autres tests sont communs aux deux moteurs. Les téléchargements Playwright nécessitent l’accès à `cdn.playwright.dev` et `playwright.download.prss.microsoft.com`. Un test WebKit ne remplace pas une validation sur un véritable iPhone.

## Jouer sur iPhone avec GitHub Pages

La version jouable est un site statique : seuls `index.html`, `style.css` et `game.js` sont nécessaires. Les chemins relatifs permettent un hébergement dans un sous-répertoire. Aucun serveur Node.js ne tourne sur GitHub Pages.

Une fois les fichiers envoyés dans le dépôt GitHub :

1. Ouvrir le dépôt dans Safari (les réglages Pages ne sont pas dans l’application GitHub).
2. Ouvrir **Settings → Pages** ; au besoin demander la version pour ordinateur dans Safari.
3. Choisir **Deploy from a branch**, puis la branche contenant les fichiers et le dossier **/(root)** ; enregistrer.
4. Attendre la fin du déploiement. Ouvrir le lien indiqué par GitHub Pages dans Safari.
5. Facultatif : **Partager → Sur l’écran d’accueil** pour créer un raccourci.

GitHub Pages rend le jeu accessible sur le Web. Sa disponibilité pour un dépôt privé dépend de l’offre GitHub ; ne pas rendre le dépôt public sans l’accord du propriétaire.

## Lanceur PC hors ligne (Windows)

Télécharger `Royaume-PC.zip`, choisir **Extraire tout**, ouvrir le dossier `Royaume-PC` puis double-cliquer sur `LANCER-JEU.bat`. Le lanceur ouvre le jeu dans le navigateur associé aux fichiers HTML. On peut aussi ouvrir directement `jeu-pc.html` avec Edge, Chrome ou Firefox récent. Aucun serveur, installation ou compte n’est nécessaire pour jouer après le téléchargement. Les polices externes sont retirées de cette édition.

Pour reconstruire le ZIP après une modification du jeu, utiliser `npm run build:pc` (Python 3 est nécessaire uniquement à la fabrication). Le script assemble les sources courantes sans modifier le jeu principal. Le dossier `pc/` et le ZIP sont livrés dans le dépôt pour permettre le téléchargement immédiat.

`npm run test:pc` extrait le ZIP dans un chemin contenant des espaces et vérifie le document autonome : rendu du roi, déplacement, pause et absence de requêtes réseau. Le navigateur cloud interdit les navigations `file://` et `data:` par une politique administrateur ; le test charge le document extrait avec `page.setContent`, hors réseau. Le lancement par double-clic et le fichier batch restent à vérifier sur une machine Windows réelle.
