export const JOBS={
  worker:{label:'Ouvrier',description:'Récupère du bois, de la pierre et du fer dans les environs.',unlockLevel:1},
  builder:{label:'Constructeur',description:'Réalise les chantiers et améliore bâtiments et remparts.',unlockLevel:1},
  knight:{label:'Chevalier',description:'Défend le royaume au corps à corps ; une arme augmente son efficacité.',unlockLevel:1},
  farmer:{label:'Fermier',description:'Cultive et entretient les élevages des fermes pour nourrir le royaume.',unlockLevel:1},
  armorer:{label:'Armurier',description:'Transforme bois et fer en armes, puis ravitaille les chevaliers.',unlockLevel:1},
  inventor:{label:'Inventeur',description:'Produit du savoir et réalise les recherches de l’académie.',unlockLevel:4}
};
export const BUILDINGS={
  house:{label:'Maison',width:150,depth:125,cost:{gold:35,wood:45,stone:20},work:24,housing:10,unlockLevel:1,maxLevel:3},
  wall:{label:'Rempart',width:80,depth:22,cost:{gold:8,wood:12,stone:8},work:8,housing:0,unlockLevel:1,maxLevel:3},
  farm:{label:'Ferme et élevage',width:180,depth:150,cost:{gold:25,wood:40,stone:10},work:24,housing:0,unlockLevel:1,maxLevel:3},
  forge:{label:'Forge',width:165,depth:145,cost:{gold:45,wood:40,stone:40,iron:5},work:35,housing:0,unlockLevel:2,maxLevel:3},
  treasury:{label:'Trésorerie',description:'Organise le commerce local et rapporte des pièces selon la population.',width:160,depth:145,cost:{gold:65,wood:35,stone:45},work:36,housing:0,unlockLevel:3,maxLevel:3},
  academy:{label:'Académie',width:210,depth:175,cost:{gold:100,wood:65,stone:65,iron:15},work:60,housing:0,unlockLevel:4,maxLevel:3}
};
export const TECHS={
  weaponry:{label:'Armes trempées',description:'Les armes et les attaques infligent 25 % de dégâts supplémentaires.',cost:{gold:65,iron:12,knowledge:20},work:45,unlockLevel:4},
  agriculture:{label:'Rotation des cultures',description:'Les fermiers produisent 50 % de nourriture supplémentaire.',cost:{gold:50,wood:15,knowledge:15},work:40,unlockLevel:4},
  architecture:{label:'Architecture renforcée',description:'Construction 30 % plus rapide et bâtiments plus résistants.',cost:{gold:70,stone:25,knowledge:25},work:50,unlockLevel:4}
};
export const RESOURCE_NODES=[{id:'quarry',kind:'stone',x:260,y:480},{id:'mine',kind:'iron',x:780,y:220}];
export const RESOURCE_LABELS={wood:'bois',stone:'pierre',food:'nourriture',iron:'fer',weapons:'armes',knowledge:'savoir'};
export const DEFAULT_APPEARANCE={name:'Aldren',cape:'#225ca8',hair:'#473229',beard:'long',skin:'#f0bf91',crown:'classic',outfit:'royal',emblem:'sun',hairStyle:'swept',eye:'#54737b',mountCoat:'chestnut'};
