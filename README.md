# Le Dernier Royaume

Prototype original de défense de village, inspiré des mécaniques de la vidéo fournie. Jeu web en français, sans dépendance, compatible tactile et clavier. Graphismes dessinés dans Canvas, sans ressources de la publicité.

## Démarrage

Node.js 24 (aucun paquet à installer) :

```sh
npm start
```

Le serveur écoute sur le port 3000 (modifiable avec `PORT`).

## Jouer

Déplacer le roi avec ZQSD, WASD, les flèches ou le joystick tactile. Il tire automatiquement sur les ennemis proches. Ramasser les pièces en s'approchant : chaque ennemi rapporte 10 pièces. Recruter des archers, renforcer/réparer la maison ou améliorer l'arc avec les boutons. Les vagues deviennent progressivement plus difficiles. Espace ou bouton de pause ; bouton de reprise après une défaite. Son facultatif.

La partie reste en mémoire uniquement. Prototype 2D : pas encore de sauvegarde, de progression entre parties ni de version native iOS.

## Vérifications

`npm test` vérifie les routes HTTP. Les tests fonctionnels dans le navigateur peuvent être exécutés avec Playwright lorsqu'il est disponible.

## Jouer sur iPhone avec GitHub Pages

La version jouable est un site statique : seuls `index.html`, `style.css` et `game.js` sont nécessaires. Les chemins relatifs permettent un hébergement dans un sous-répertoire. Aucun serveur Node.js ne tourne sur GitHub Pages.

Une fois les fichiers envoyés dans le dépôt GitHub :

1. Ouvrir le dépôt dans Safari (les réglages Pages ne sont pas dans l’application GitHub).
2. Ouvrir **Settings → Pages** ; au besoin demander la version pour ordinateur dans Safari.
3. Choisir **Deploy from a branch**, puis la branche contenant les fichiers et le dossier **/(root)** ; enregistrer.
4. Attendre la fin du déploiement. Ouvrir le lien indiqué par GitHub Pages dans Safari.
5. Facultatif : **Partager → Sur l’écran d’accueil** pour créer un raccourci.

GitHub Pages rend le jeu accessible sur le Web. Sa disponibilité pour un dépôt privé dépend de l’offre GitHub ; ne pas rendre le dépôt public sans l’accord du propriétaire.
