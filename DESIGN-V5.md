# Cendrune V5

La V5 conserve l’économie, les six métiers, les logements, les salaires, les placements et les technologies décrits dans [DESIGN-V3.md](DESIGN-V3.md). Elle enrichit le combat, l’exploration, la progression et la direction artistique.

## Viser et agir

Le roi ne tire plus automatiquement. Un clic ou un toucher sur le terrain fixe une cible et déclenche l’attaque de l’arme équipée si son délai de récupération est terminé. Le clic sur le modèle d’un ennemi ou, avec la hache, sur le feuillage d’un arbre sélectionne la position réelle de cette cible. Un clic vide garde la position choisie au sol. L’arc envoie un véritable projectile dans la direction choisie ; la hache frappe les arbres et ennemis dans un arc orienté. Le déplacement au joystick, les menus et le placement d’ouvrages ne déclenchent pas d’attaque. Les indicateurs au sol matérialisent la cible.

Le niveau 2 ouvre l’Élan royal : une accélération brève avec invulnérabilité, à pied, limitée par un délai de récupération. Le niveau 3 ouvre une attaque puissante, différente selon l’arme : flèche traversante ou grand balayage à la hache. Le niveau 4 augmente la découverte du monde ; le niveau 5 renforce les capacités déjà acquises. Les niveaux du royaume et des habitants restent séparés de ceux du roi.

## Un monde plus vaste

La région passe de 4 600 × 4 400 à 6 600 × 6 400 unités, soit 2,09 fois sa surface précédente. Les clairières, les anciens lieux et le refuge restent accessibles ; six camps supplémentaires et des rencontres invitent à explorer les nouvelles zones. La mini-carte ronde reste orientée au nord, indique la position du souverain et ouvre la carte complète. Les ressources sont regroupées en haut à gauche avec des symboles SVG reconnaissables. Le zoom des Options descend à 0,45.

Des sites oubliés se révèlent à l’approche. Leurs gardiens combattent réellement le roi ; une victoire donne accès à un coffre et une relique aux effets durables. Chaque récompense ne peut être obtenue qu’une fois. Les sites et leurs entrées sont protégés des constructions pour conserver leur accès. Le roi dispose de points de vie ; une défaite dans ces rencontres provoque un retour au refuge et la perte d’au plus 25 pièces, tandis que les gardiens restent sur place. La chute du refuge conserve son rôle de fin de partie.

## Direction artistique et création

La nouvelle palette accentue les verts lumineux, les contrastes et les accents chauds. Les arbres emploient de véritables groupes de feuilles incurvées, nervures, rameaux et aiguilles ; les niveaux de détail et l’instanciation limitent leur coût sur la grande carte. Les personnages reçoivent des vêtements et accessoires propres aux métiers. Le cheval dispose d’un pelage, d’une sellerie et d’un harnachement plus détaillés.

Les ombres des personnages proviennent des surfaces principales du corps, des membres, de la cape et des outils. Les petits accessoires gardent leur géométrie, leurs textures et leur éclairage dans l’image, sans chacun ajouter un calcul d’ombre. Cette sélection est préparée à la création des modèles ; le PC conserve davantage de surfaces projetantes que le mobile. Les textures identiques partagent également leurs cartes pour limiter les transferts et les appels de rendu.

Le nom du roi et celui du royaume sont distincts. Trois familles de tenues, de coiffures et d’emblèmes complètent les couleurs, les barbes et les couronnes existantes ; les yeux et la robe du cheval deviennent personnalisables. Les valeurs sont validées par la simulation. Les tissus, cuirs, pelages, feuilles, écorces et métaux utilisent un atlas original neutre, coloré par les matériaux du jeu, avec cartes de relief et rugosité locales. Il est intégré au paquet hors ligne avec l’atlas de terrain de la V4.

Le nom **Cendrune** évoque la renaissance depuis les cendres et les mystères à découvrir. Les sources et les limites du contrôle de disponibilité figurent dans [NAME-RESEARCH-V5.md](NAME-RESEARCH-V5.md). Aucune disponibilité universelle de marque ou de titre n’est affirmée.

## Validation et limites

Les tests couvrent les anciens systèmes, la visée, les délais des capacités, les changements réels débloqués par l’XP, les découvertes et leurs récompenses uniques. Les contrôles navigateur exercent les interactions, le HUD, la personnalisation, le cadrage, le rendu et l’édition PC hors réseau. Les mesures de complexité graphique dans le navigateur cloud ne sont pas des mesures de fréquence d’image sur un téléphone. Les essais matériels iPhone et Windows restent nécessaires.

La sauvegarde entre sessions et la conquête des royaumes ennemis restent des développements ultérieurs.

## Refonte V5.5

La refonte des personnages et animaux porte le numéro **V5.5.0**. Sa direction artistique, ses matières et les contrôles des nouveaux modèles sont décrits dans [DESIGN-V5.5.md](DESIGN-V5.5.md). Elle conserve les règles et les choix de personnalisation décrits dans ce document. L’archive V5 initiale reste disponible séparément.
