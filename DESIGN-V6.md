# Cendrune V6 — Défense et territoires

La V6 développe les assauts et les réactions du peuple. Le roi détaillé et sa personnalisation de la V5.6 sont conservés. L’économie, les métiers, les capacités du roi et la construction restent la base du développement du royaume.

## Assaillants

Les profils partagés de `enemy-data.js` fixent la vie, la vitesse, les dégâts, la portée et le rang. Les modèles de `enemy-models.js` rendent leur rôle visible par la silhouette et l’équipement.

| Type | Arrivée | Rôle |
| --- | --- | --- |
| Pillard | Vague 1 | Combattant mobile qui recherche les habitants isolés. |
| Javelinier | Vague 2 | Harcèlement à distance. |
| Sapeur | Vague 2 | Dégâts élevés contre les ouvrages. |
| Brute | Vague 3 | Combattant lent, résistant et puissant au contact. |
| Capitaine | Vague 5 | Combattant cuirassé qui recherche les défenseurs. |

Les vagues introduisent puis mélangent les types disponibles. Les quatre rangs — recrue, aguerri, vétéran et élite — augmentent la résistance et les dégâts ; les ennemis ne sont plus de simples copies de puissance identique.

Les ennemis choisissent des cibles concrètes : habitants exposés, roi, défenseurs ou bâtiments encore debout. Une cible détruite, cachée ou devenue inaccessible doit être remplacée. Les remparts et les autres empreintes de bâtiments font obstacle aux déplacements et aux attaques ; un assaillant peut se rabattre sur un ouvrage qui lui barre la route. Les rencontres anciennes et leurs gardiens conservent leurs règles d’exploration.

La destruction du refuge reste la condition de défaite du royaume. La destruction d’un autre logement réduit la capacité disponible et oblige ses habitants à chercher un abri encore intact.

## Protection des habitants

Chaque habitant possède des points de vie et, si la capacité le permet, une place dans un logement achevé. Les états de sécurité servent aussi à l’affichage du conseil du royaume. Son onglet **Menaces** présente la situation des habitants, les groupes ennemis signalés et les cinq profils d’assaillants.

- Au travail ou en attente, l’habitant surveille les menaces proches.
- Un non-combattant en danger suspend son métier et tente de rejoindre une maison intacte.
- Une fois entré, il disparaît de la scène extérieure et ne sert plus de cible directe aux assaillants.
- Une maison détruite ne protège plus ses occupants ; ils doivent chercher un autre abri.
- En l’absence de défenseur capable d’intervenir, un habitant menacé à courte portée riposte avec une puissance et une fréquence limitées.
- Le retour au calme permet de sortir et de reprendre le métier attribué.

La riposte ne donne ni poursuite à longue distance ni efficacité équivalente à celle d’un chevalier équipé. Les chevaliers recherchent les menaces qui mettent le peuple en danger et restent le moyen principal de défendre les quartiers.

## Faune forestière

`wildlife.js` entretient une population bornée et déterministe à partir de la graine de la partie. Les modèles sont définis dans `wildlife-models.js`. Les animaux ont une position, une orientation, des points de vie, un domaine de vie et un comportement explicite.

| Espèce | Comportement |
| --- | --- |
| Cerf | Broute, se déplace et fuit les menaces. |
| Lièvre | Se déplace par petites étapes et fuit à l’approche du danger. |
| Sanglier | Protège un territoire forestier. |
| Loup | Protège un territoire forestier éloigné du royaume. |

Les animaux territoriaux vivent à l’écart des bâtiments du royaume. Un intrus reçoit un avertissement avant la défense du territoire. Une attaque directe peut également provoquer une riposte. L’animal abandonne la poursuite lorsque l’intrus sort de son domaine et retourne vers son habitat ; il ne choisit jamais les bâtiments du royaume comme objectifs d’assaut.

L’extension de la civilisation entraîne une recherche d’habitat plus éloigné. Cette séparation empêche les animaux de se transformer en nouvelles vagues d’envahisseurs. Le roi peut les viser avec les mêmes gestes que pour les ennemis : clic ou toucher, puis arc ou hache selon l’arme équipée. La carte n’affiche que la faune observée près du roi et distingue les espèces paisibles, les territoires proches et les animaux en défense.

## Charge graphique

Les Options proposent une qualité automatique qui adapte la résolution, un mode privilégiant la fluidité et un mode privilégiant les détails. Le rendu utilise les distances à la caméra, le regroupement des surfaces et un budget d’ombres pour éviter de payer le même coût pour toute la région. Les personnages proches conservent leurs formes et matériaux, et le portrait du souverain garde sa présentation détaillée. Les habitants à l’abri ne sont pas dessinés dehors.

Les essais navigateur comparent une scène déterministe sur ordinateur et sur mobile simulé, avec un village, plusieurs métiers, des ouvrages et des menaces. Les compteurs d’appels de rendu et de triangles permettent de contrôler la charge envoyée au GPU ; ils ne prouvent pas une fréquence d’images sur un iPhone ou un ordinateur réel.

Sur le village déterministe de comparaison, la V5.6 utilise 837 appels de rendu sur ordinateur et 735 sur mobile simulé. La V6 en utilise respectivement 454 et 407, soit environ 46 % et 45 % de moins. Les géométries visibles du roi (224 656 triangles) et des habitants (117 104 triangles cumulés dans cette scène) sont conservées ; les gains viennent principalement du regroupement des surfaces articulées et des ombres. Ces mesures portent sur la soumission graphique, pas sur un gain de FPS garanti.

## Vérification et distribution

Les tests de simulation couvrent les profils ennemis, la sélection des cibles, les bâtiments endommagés, le repli des habitants, leur riposte et les limites des territoires animaux. Les tests de modèles contrôlent les nouvelles variantes. Le parcours navigateur couvre le ciblage des modèles visibles et l’interface au toucher.

`npm run build:pc` produit `Cendrune-PC-V6.zip` et actualise les alias de téléchargement. L’archive contient le jeu, le moteur, les atlas et les notices de licence ; les anciennes éditions sont conservées. Le tag de publication est `v6.0.0-cendrune` : l’ancien tag `v6.0.0`, créé avant le renommage de la V3, reste conservé. Le test PC déduit le nom du ZIP et la version attendue de `package.json` pour vérifier le paquet courant.

Les essais physiques Windows et iPhone restent nécessaires. La sauvegarde entre sessions et la reconquête de territoires ennemis restent hors de cette version.
