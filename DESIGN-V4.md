# Courvane V4 — Direction artistique

Cette version se concentre sur les graphismes. Les règles d’exploration, de combat, de recrutement, de métiers, de construction et d’économie décrites dans [DESIGN-V3.md](DESIGN-V3.md) sont conservées.

## Personnages

La silhouette royale repose sur un buste profilé, des membres arrondis articulés et une tête sculptée. Le visage comprend mâchoire, joues, oreilles, nez, paupières, iris et sourcils. Les cheveux et la barbe utilisent des mèches courbes effilées ; la cape forme un tissu drapé bordé d’or. Les deux couronnes, les teints, les barbes, les cheveux et les capes restent personnalisables en direct. Les habitants portent leurs vêtements et outils de métier.

Le roi conserve davantage de subdivisions que les habitants. Les parties immobiles sont regroupées par matériau et seules les articulations nécessaires restent animées. Les géométries regroupées propres à une ancienne apparence sont libérées lors de sa reconstruction.

## Matières et décors

L’atlas original [v4-material-atlas.png](assets/v4-material-atlas.png), créé pour ce projet, contient six surfaces peintes : prairie, terre, ardoise bleue, chêne, enduit ivoire et maçonnerie. La préparation locale extrait les carreaux, adoucit leurs raccords et en tire des cartes de relief. La rugosité reste contrôlée par type de surface. Tissu, cuir, peau et métal disposent de motifs complémentaires générés localement. Les textures sont répétées et filtrées ; aucune image de référence fournie par l’utilisateur n’est incorporée.

Les constructions emploient des toitures aux débords courbes, des ouvertures cintrées et des matériaux assortis. Le refuge initial suit la même palette. Le cheval utilise des volumes arrondis. Les arbres ont des troncs infléchis et plusieurs silhouettes de feuillage ; fougères, fleurs et touffes courbes enrichissent les clairières. La terre et le chemin se fondent dans la prairie au moyen de masques alpha.

Le soleil chaud, un ciel plus frais et une carte de réflexion douce donnent du volume aux surfaces et aux ornements métalliques. Le portrait de création utilise un fond de studio. Les surfaces conservent des écarts physiques pour éviter les scintillements dus aux plans superposés.

## Livraison et validation

Le paquet web incorpore l’atlas sous forme de données ; le lanceur PC emporte le même script, les styles et le moteur. Il fonctionne sans serveur ni image distante. Les archives précédentes sont conservées.

La forêt reste instanciée avec niveaux de détail. Le rendu plafonne la résolution et réduit les ombres sur les appareils tactiles. Les métaux utilisent trois paliers communs pour regrouper leurs surfaces. Les parties statiques de chaque articulation du cheval sont fusionnées en conservant ses pivots et son animation. Aucun effet de post-traitement plein écran n’est requis.

Les tests graphiques couvrent un village peuplé, les métiers, la personnalisation, le cadrage mobile avec les deux couronnes, les erreurs WebGL et la stabilité des allocations lors des reconstructions. Une mesure dans Chromium cloud ne remplace pas un essai de fluidité sur iPhone ou PC Windows réel.
