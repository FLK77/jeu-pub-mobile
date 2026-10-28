# Cendrune V5.6 — Le souverain

La V5.6.0 reprend le roi à partir de la nouvelle référence du joueur : un souverain mature aux traits marqués, aux cheveux et à la barbe grisonnants, vêtu d’une armure sombre et coiffé d’une couronne dorée sans casque. La cape noire et les cheveux gris constituent la présentation par défaut ; les choix de personnalisation continuent de définir son apparence.

## Construction du personnage

Le visage et les mains partent d’une base anatomique connectée, adaptée aux proportions du souverain. La sculpture et l’habillage du roi définissent son âge et sa silhouette. Les pièces d’armure, les vêtements, les cheveux, la barbe et les ornements royaux sont créés pour le projet à partir de la direction visuelle demandée.

Le portrait présente le roi tenant une épée de cérémonie. En jeu, les mains s’adaptent à la prise de l’arc et de la hache, tandis que la main vide adopte une pose détendue. Les articulations nécessaires à la marche, aux armes et à la posture montée sont conservées. Les vues de contrôle vérifient les raccords entre tête, cou, vêtements, mains et équipement, ainsi que le cadrage du portrait et du jeu.

## Provenance anatomique

Les données de visage et de mains dérivent uniquement du maillage de base MakeHuman hm08, dans `makehuman/data/3dobjs/base.obj`. Son en-tête déclare explicitement sa publication sous CC0 en septembre 2020 et cite Data Collection AB, Joel Palmius et Jonas Hauquier. La section C de la licence amont confirme que les ressources graphiques, dont le maillage de base, sont publiées sous CC0 1.0 Universal.

Le fichier source utilisé compte 1 749 303 octets et porte l’empreinte SHA256 `8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c`. Il a été vérifié avec les documents de licence à la révision amont [`a8bc2d54ff0ac92e78ff71431b1023eda42bf482`](https://github.com/makehumancommunity/makehuman/tree/a8bc2d54ff0ac92e78ff71431b1023eda42bf482). Le script original du projet `scripts/build-king-anatomy.py` prépare `assets/v56-king-anatomy.json`. Seules les données graphiques sont utilisées ; aucun code du logiciel MakeHuman n’est incorporé.

La [notice conservée dans le dépôt](assets/licenses/makehuman-cc0.txt) réunit la provenance, l’en-tête d’origine et le texte complet de CC0. Le build réunit cette notice et la licence MIT de Three.js dans `THIRD-PARTY-NOTICES.txt`, également distribué dans le paquet PC.

Le générateur utilise Blender pour extraire et adapter les surfaces utiles, en écartant les groupes auxiliaires. Les données converties sont conservées dans le dépôt ; le build web et PC les assemble directement. Pour les régénérer à partir du fichier dont l’empreinte est vérifiée :

```sh
blender -b -t 2 --python scripts/build-king-anatomy.py -- --source /chemin/vers/base.obj
```

## Livraison et contrôles

Les données du roi, les matières et le moteur sont intégrés au script assemblé et à **Cendrune-PC-V5.6.zip**. Les alias de téléchargement suivent cette version. Les archives V5.5 et précédentes restent conservées.

Les vues du [roi entier](docs/v5.6-king.png), du [buste](docs/v5.6-bust.png), du [visage](docs/v5.6-face.png), de la [couronne](docs/v5.6-crown.png), des [mains](docs/v5.6-hands.png) et du [portrait de création](docs/v5.6-portrait.png) utilisent le modèle et les matériaux de production. Les cadrages rapprochés et leurs accès de studio servent uniquement aux tests.

Cette version se concentre sur le roi. Les habitants, ennemis, animaux et règles de jeu restent ceux de la [V5.5](DESIGN-V5.5.md). La sauvegarde entre sessions, la conquête territoriale et les essais matériels Windows/iPhone restent des étapes ultérieures.
