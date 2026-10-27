# Matériaux originaux de Courvane V4

`v4-material-atlas.png` est un atlas original généré pour ce projet le 25 octobre 2026 avec l’outil de génération d’images OpenAI. Il ne contient ni extrait des références du joueur, ni logo, ni filigrane.

Format : 1536 × 1024 pixels, six carreaux de 512 × 512. De gauche à droite : prairie, terre, ardoise bleue ; chêne, enduit ivoire, maçonnerie.

`painted-textures.js` découpe ces carreaux en mémoire, prépare leurs raccords et leurs canaux physiques. `art-assets.js` les importe dans le paquet esbuild pour permettre le fonctionnement hors ligne du jeu PC.

## Artisanat de Cendrune V5

`v5-craft-atlas.png` est un second atlas original généré pour ce projet le 26 octobre 2026 avec l’outil de génération d’images OpenAI. Format 1536 × 1024 : tissu brodé, cuir ouvragé, pelage ; nervures d’une feuille, écorce, métal gravé. Les tons ivoire et gris permettent de conserver les couleurs choisies par le joueur et celles des feuillages. Les cartes de relief et de rugosité sont préparées localement à partir des surfaces. L’image est intégrée au paquet, y compris pour jouer hors ligne. Aucun fichier des références du joueur n’est repris.

## Matières des personnages et animaux réalistes

`v5-realistic-atlas.png` est un troisième atlas original généré le 27 octobre 2026 avec l’outil de génération d’images OpenAI. Format 1536 × 1024 : mailles métalliques, lin matelassé, pelage court de cheval ; pores de peau, cuir fin, acier brossé. Les images de référence du joueur ont guidé les modèles, sans être incorporées à ces textures.

Les six matériaux possèdent des cartes de couleur, de relief et de rugosité distinctes. Leur couleur est neutralisée à l’exécution pour préserver le teint du roi, sa tenue et la robe du cheval ; les variations fines de la source sont conservées dans les canaux physiques. Les bords sont raccordés en mémoire. Le pelage court reste plus lisse que la fourrure des épaules, et la cotte de mailles reçoit des creux plus marqués que la peau.

Cet atlas est également intégré au script autonome PC. Les trois chargements locaux sont attendus avant de déclarer les textures prêtes. Des matières de secours déterministes restent disponibles si une image ne se charge pas.

Le lin uni des capes et tuniques (`linen`) utilise une trame procédurale originale de fils fins entrecroisés. Sa couleur neutre et ses variations discrètes conservent les couleurs de la tenue, avec un relief peu marqué et une forte rugosité. Il ne réutilise pas les grandes broderies de l’ancien tissu et ne nécessite aucun chargement supplémentaire.

La matière `hoof` des sabots emploie des stries de kératine procédurales fines, avec un relief faible et une rugosité dédiée. Elle fonctionne localement sans image supplémentaire.
