# Cendrune V5.5 — Personnages et animaux

La V5.5.0 refond les modèles du roi, des habitants, des ennemis et des animaux à partir des nouvelles références transmises par le joueur. Le combat, l’économie, l’exploration et les choix de personnalisation de la [V5](DESIGN-V5.md) restent la base de cette version.

## Roi et habitants

Les corps sont formés de sections continues, avec des proportions adultes et des articulations pour la marche et la posture montée. Le visage possède une mâchoire, des pommettes et des orbites modelées ; les yeux retrouvent une taille naturelle. Le casque conique couronné, la fourrure des épaules, les manches de mailles, le gambison et les pans séparés du tabard définissent le roi.

Les habitants et ennemis partagent cette construction anatomique. Les métiers gardent leurs silhouettes, protections, outils et accessoires propres. Les tenues, teints, coiffures, barbes, couronnes et emblèmes choisis au lancement continuent de modifier le modèle. La posture du cavalier tient compte des nouvelles longueurs de jambes, avec des genoux articulés.

## Cheval et cochons

Le cheval possède une tête longue et fine, de petits yeux latéraux, des jambes effilées, une cage thoracique et une encolure modelées. Ses trois robes utilisent une matière à poils courts ; crinière et queue gardent des mèches distinctes. La selle et son tapis épousent le dos ; sangles, brides, mors et étriers sont modelés séparément. Le cochon reçoit une silhouette plus naturelle, un groin, des oreilles tombantes et des sabots fendus.

## Matières et rendu

Un troisième atlas original apporte les mailles, le matelassage, le pelage court, la peau, le cuir fin et l’acier. Le lin uni des capes et tuniques utilise une trame procédurale fine ; les sabots emploient un grain de kératine discret. Chaque matière possède une couleur, un relief et une rugosité adaptés ; les albedos neutres préservent les couleurs choisies par le joueur. L’origine et la préparation des textures sont précisées dans [assets/README.md](assets/README.md).

Les surfaces statiques compatibles sont regroupées et les géométries réutilisées. Les membres, accessoires animés et articulations restent séparés. Les petits détails continuent à recevoir la lumière ; les ombres projetées sont sélectionnées selon leur contribution à la silhouette et le type d’appareil.

Les trois atlas, les nouveaux modèles et Three.js sont intégrés à l’édition PC autonome **Cendrune-PC-V5.5.zip**. Les alias de téléchargement pointent vers cette version ; le paquet initial **Cendrune-PC-V5.zip** et les archives précédentes sont conservés.

## Validation et limites

Les tests de géométrie vérifient les sommets, les indices, les proportions, les pivots, les choix d’apparence et la réutilisation des formes. Les contrôles navigateur vérifient les vues rapprochées, la posture montée, les interactions, le cadrage mobile, la stabilité des images en pause et les ressources graphiques après reconstruction des modèles.

Les [vues du roi](docs/v5.5-king.png), du [cheval](docs/v5.5-horse.png) et des [métiers](docs/v5.5-professions.png) sont produites avec le moteur et les matériaux du jeu. Le cadrage de studio sert au contrôle des détails ; ses accès sont injectés uniquement dans les outils de test.

Les compteurs du navigateur cloud ne mesurent pas la fréquence d’image sur un téléphone. Les essais sur matériel iPhone et Windows restent nécessaires. La sauvegarde entre sessions et la conquête territoriale restent des développements ultérieurs.
