# Matériaux originaux de Courvane V4

`v4-material-atlas.png` est un atlas original généré pour ce projet le 25 octobre 2026 avec l’outil de génération d’images OpenAI. Il ne contient ni extrait des références du joueur, ni logo, ni filigrane.

Format : 1536 × 1024 pixels, six carreaux de 512 × 512. De gauche à droite : prairie, terre, ardoise bleue ; chêne, enduit ivoire, maçonnerie.

`painted-textures.js` découpe ces carreaux en mémoire, prépare leurs raccords et leurs canaux physiques. `art-assets.js` les importe dans le paquet esbuild pour permettre le fonctionnement hors ligne du jeu PC.

## Artisanat de Cendrune V5

`v5-craft-atlas.png` est un second atlas original généré pour ce projet le 26 octobre 2026 avec l’outil de génération d’images OpenAI. Format 1536 × 1024 : tissu brodé, cuir ouvragé, pelage ; nervures d’une feuille, écorce, métal gravé. Les tons ivoire et gris permettent de conserver les couleurs choisies par le joueur et celles des feuillages. Les cartes de relief et de rugosité sont préparées localement à partir des surfaces. L’image est intégrée au paquet, y compris pour jouer hors ligne. Aucun fichier des références du joueur n’est repris.
