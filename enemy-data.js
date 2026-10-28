// A small shared roster keeps the combat rules, bestiary and silhouettes in sync.
export const ENEMY_TYPES={
  raider:{label:'Pillard',description:'Rapide et opportuniste, il traque les habitants isolés.',hp:58,speed:53,damage:8,buildingDamage:7,range:52,cooldown:1.25,unlockWave:1,color:'#a44735',scale:1},
  skirmisher:{label:'Javelinier',description:'Harcèle les défenseurs à distance avec ses javelots.',hp:45,speed:48,damage:7,buildingDamage:5,range:190,cooldown:1.8,unlockWave:2,color:'#687c44',scale:.96},
  breaker:{label:'Sapeur',description:'Son lourd marteau est redoutable contre les bâtiments et remparts.',hp:88,speed:37,damage:10,buildingDamage:19,range:53,cooldown:1.6,unlockWave:2,color:'#ba8142',scale:1.04},
  brute:{label:'Brute',description:'Un adversaire massif, lent et puissant au corps à corps.',hp:145,speed:32,damage:17,buildingDamage:13,range:60,cooldown:1.7,unlockWave:3,color:'#6e4869',scale:1.2},
  captain:{label:'Capitaine',description:'Un combattant cuirassé qui recherche les défenseurs du royaume.',hp:190,speed:43,damage:19,buildingDamage:16,range:58,cooldown:1.4,unlockWave:5,color:'#335f82',scale:1.1}
};
export const ENEMY_TIERS=['Recrue','Aguerri','Vétéran','Élite'];
export function enemyProfile(kind='raider',tier=1){
  const def=ENEMY_TYPES[kind]||ENEMY_TYPES.raider,rank=Math.max(1,Math.min(4,Math.floor(tier)||1)),power=1+(rank-1)*.35;
  return{...def,kind:ENEMY_TYPES[kind]?kind:'raider',tier:rank,tierLabel:ENEMY_TIERS[rank-1],maxHp:Math.round(def.hp*power),damage:Math.round(def.damage*power),buildingDamage:Math.round(def.buildingDamage*power),speed:def.speed+(rank-1)*2};
}
export function raidEnemy(wave,index,x,y,id){
  // Introduce each unit predictably, then mix them. Early attacks remain fair.
  const available=Object.entries(ENEMY_TYPES).filter(([,d])=>wave>=d.unlockWave).map(([kind])=>kind);
  const kind=available[index%available.length],tier=Math.min(4,1+Math.floor(Math.max(0,wave-1)/3)),profile=enemyProfile(kind,tier);
  return{...profile,id,x,y,hp:profile.maxHp,aim:0,cool:.6+(index%3)*.2,attackPulse:0,targetType:null,targetId:null};
}
