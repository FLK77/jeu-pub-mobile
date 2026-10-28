import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,addResident,assignJob,demolishBuilding,kingdomStats,attackAt,setWeapon} from '../simulation.js';
import {ENEMY_TYPES,enemyProfile,raidEnemy} from '../enemy-data.js';
import {BUILDINGS} from '../kingdom-data.js';
import {FOREST_TREES} from '../world-data.js';
const world=()=>{const s=createGame(603);s.phaseRemaining=1e6;s.wildlife=[];s.harvested=Array.from({length:3000},(_,i)=>i);Object.assign(s.king,{x:-1800,y:-1800});return s;};
const house=(s,id,x,y,extra={})=>{const def=BUILDINGS.house,b={id,type:'house',x,y,width:150,depth:125,rotation:0,complete:true,level:1,hp:200,maxHp:200,...extra};s.buildings.push(b);return b;};
function enemy(s,kind,x,y,extra={}){const p=enemyProfile(kind,1),e={...p,id:'test-enemy-'+s.enemies.length,x,y,hp:p.maxHp,cool:0,aim:0,...extra};s.enemies.push(e);return e;}
function person(s,job='unassigned'){assert.equal(addResident(s,'rescued'),true);const p=s.allies.at(-1);if(job!=='unassigned')assert.equal(assignJob(s,p.id,job).ok,true);return p;}

test('V6 roster introduces five distinct combat roles and increasingly powerful ranks',()=>{
  assert.equal(Object.keys(ENEMY_TYPES).length,5);
  const recruit=enemyProfile('raider',1),elite=enemyProfile('raider',4);assert.ok(elite.maxHp>recruit.maxHp&&elite.damage>recruit.damage);assert.equal(elite.tierLabel,'Élite');
  assert.ok(enemyProfile('skirmisher').range>enemyProfile('raider').range*2);assert.ok(enemyProfile('breaker').buildingDamage>enemyProfile('raider').buildingDamage*2);assert.ok(enemyProfile('brute').maxHp>enemyProfile('raider').maxHp*2);
  for(let i=0;i<8;i++)assert.equal(raidEnemy(1,i,0,0,'first-'+i).kind,'raider');
  assert.equal(new Set(Array.from({length:10},(_,i)=>raidEnemy(5,i,0,0,'later-'+i).kind)).size,5);
});

test('two separate enemy groups damage their local buildings instead of draining refuge HP globally',()=>{
  const s=world(),left=house(s,'left',-500,300),right=house(s,'right',1400,300),hp=s.hp;
  const a=enemy(s,'breaker',left.x,left.y+left.depth/2+30,{speed:0}),b=enemy(s,'breaker',right.x,right.y+right.depth/2+30,{speed:0});
  stepGame(s,.1);assert.ok(left.hp<200&&right.hp<200);assert.equal(s.hp,hp);assert.equal(a.targetType,'building');assert.equal(a.targetId,left.id);assert.equal(b.targetId,right.id);
});

test('a distant attacker cannot damage a building until reaching its actual footprint',()=>{
  const s=world(),b=house(s,'distant',1300,300),e=enemy(s,'breaker',1300,700,{speed:0});stepGame(s,3);assert.equal(b.hp,200);assert.equal(s.hp,160);assert.equal(e.targetId,b.id);
});

test('raiders strike outdoor residents, not only the king or the refuge',()=>{
  const s=world(),p=person(s);Object.assign(p,{x:1100,y:700});const e=enemy(s,'raider',p.x+30,p.y,{speed:0});
  const hp=p.hp;stepGame(s,.1);assert.ok(p.hp<hp);assert.equal(e.targetType,'resident');assert.equal(e.targetId,p.id);assert.equal(s.hp,160);
});

test('residents have assigned housing, physically go around buildings and enter their own house',()=>{
  const s=world(),p=person(s);assert.equal(p.homeId,'refuge');Object.assign(p,{x:500,y:100});s.phase='warning';s.phaseRemaining=100;
  stepGame(s,5);assert.equal(p.safetyState,'sheltered');assert.equal(p.sheltered,true);assert.equal(p.hidden,true);assert.equal(p.shelterId,p.homeId);assert.equal(p.x,500);assert.equal(p.y,240);
  s.phase='peace';s.phaseRemaining=100;stepGame(s,.1);assert.equal(p.sheltered,false);assert.equal(p.hidden,false);assert.equal(p.safetyState,'working');assert.equal(p.workStatus,'Métier à choisir');assert.ok(p.y>315);
});

test('retreat routes avoid every adjacent house and still reach rotated front doors',()=>{
  for(const rotation of[0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const s=world(),p=person(s),refuge=s.buildings[0];refuge.rotation=rotation;
    // Each neighbor is legal: 20px between the physical footprints. Taking a
    // corner of just the refuge previously sent the resident into a neighbor.
    house(s,'left-neighbor',310,240);house(s,'right-neighbor',690,240);house(s,'rear-neighbor',500,20);
    Object.assign(p,{x:500,y:100});s.phase='warning';s.phaseRemaining=100;stepGame(s,20);
    assert.equal(p.sheltered,true,'reachable home entrance at rotation '+rotation);assert.equal(p.hidden,true);assert.equal(p.shelterId,'refuge');
  }
});

test('sheltered residents cannot be selected or harmed through the walls of their home',()=>{
  const s=world(),b=house(s,'safe',1300,300),p=person(s);p.homeId=b.id;Object.assign(p,{x:b.x,y:b.y+b.depth/2+23});s.phase='warning';s.phaseRemaining=100;stepGame(s,.1);assert.equal(p.sheltered,true);
  const e=enemy(s,'raider',b.x+b.width/2+30,b.y,{speed:0}),hp=p.hp;stepGame(s,.1);assert.equal(p.hp,hp);assert.equal(e.targetType,'building');assert.equal(e.targetId,b.id);assert.ok(b.hp<200);
});

test('an unprotected civilian defends only at melee distance and uses a real cooldown',()=>{
  const s=world(),p=person(s);Object.assign(p,{x:1200,y:650});const e=enemy(s,'raider',p.x+40,p.y,{speed:0,cool:10}),hp=e.hp;stepGame(s,.01);assert.equal(p.safetyState,'defending');assert.equal(e.hp,hp-8);
  stepGame(s,.1);assert.equal(e.hp,hp-8,'the same swing does not deal damage every simulation tick');
  Object.assign(e,{x:p.x+180,y:p.y});const farHp=e.hp;stepGame(s,.3);assert.equal(e.hp,farHp,'civilians do not deal remote damage or chase attackers');
});

test('a capable nearby knight protects civilians and intercepts the attacker',()=>{
  const s=world(),p=person(s),guard=person(s,'knight');Object.assign(p,{x:1200,y:650});Object.assign(guard,{x:1270,y:650,cool:10});const e=enemy(s,'raider',1240,650,{speed:0,cool:10}),hp=e.hp;
  stepGame(s,.1);assert.notEqual(p.safetyState,'defending');assert.equal(e.hp,hp);guard.cool=0;stepGame(s,.1);assert.ok(e.hp<hp);assert.equal(guard.workStatus,'Défend le royaume');
});

test('a wall physically intercepts an assault and prevents attacks through it',()=>{
  const s=world(),p=person(s,'knight');Object.assign(p,{x:1200,y:600,cool:10});const wall={id:'barrier',type:'wall',x:1200,y:650,width:160,depth:22,rotation:0,complete:true,level:1,hp:190,maxHp:190};s.buildings.push(wall);
  const e=enemy(s,'raider',1200,690,{speed:0}),hp=p.hp;stepGame(s,.1);assert.equal(e.targetType,'building');assert.equal(e.targetId,wall.id);assert.ok(wall.hp<190);assert.equal(p.hp,hp);assert.ok(e.y>=wall.y+wall.depth/2);
});

test('an enemy detours around a real tree trunk instead of stalling an assault forever',()=>{
  const s=world(),tree=FOREST_TREES.find(t=>t.x>1600&&t.y>1000);s.harvested=FOREST_TREES.flatMap((t,i)=>t===tree?[]:[i]);
  const b=house(s,'behind-trunk',tree.x,tree.y-220),e=enemy(s,'breaker',tree.x,tree.y+100);stepGame(s,20);
  assert.ok(b.hp<200,'the actual building receives siege damage after the detour');assert.ok(e.y<tree.y,'the attacker passed the obstructing tree');assert.ok(Math.hypot(e.x-tree.x,e.y-tree.y)>=19+tree.size*9);
});

test('destroying housing ejects occupants, lowers capacity and reassigns homes without ending the game',()=>{
  const s=world(),b=house(s,'vulnerable',1300,300),p=person(s);p.homeId=b.id;Object.assign(p,{x:b.x,y:b.y+b.depth/2+23});s.phase='warning';s.phaseRemaining=100;stepGame(s,.1);assert.equal(p.sheltered,true);b.hp=1;
  enemy(s,'breaker',b.x+b.width/2+30,b.y,{speed:0});stepGame(s,.1);assert.equal(b.destroyed,true);assert.equal(p.sheltered,false);assert.equal(p.hidden,false);assert.equal(p.homeId,'refuge');assert.equal(s.capacity,10);assert.equal(s.over,false);assert.equal(s.hp,160);
});

test('destroyed and manually removed homes never leave invisible occupants stranded inside',()=>{
  const s=world(),b=house(s,'removed',1300,300),p=person(s);p.homeId=b.id;Object.assign(p,{x:b.x,y:b.y+b.depth/2+23});s.phase='warning';s.phaseRemaining=100;stepGame(s,.1);assert.equal(p.hidden,true);
  s.phase='peace';assert.equal(demolishBuilding(s,b.id).ok,true);stepGame(s,.1);assert.equal(p.hidden,false);assert.equal(p.sheltered,false);assert.equal(p.homeId,'refuge');assert.ok(Math.hypot(p.x-b.x,p.y-b.y)>b.depth/2);
});

test('resident casualties free living source quotas and payroll slots exactly once',()=>{
  const s=world(),p=person(s);Object.assign(p,{x:1200,y:650,hp:1});enemy(s,'raider',p.x+30,p.y,{speed:0,cool:0});stepGame(s,.1);assert.equal(s.allies.length,0);assert.equal(s.counts.rescued,0);assert.equal(s.residentDeaths,1);assert.equal(kingdomStats(s).population,0);
  stepGame(s,.1);assert.equal(s.residentDeaths,1);assert.equal(addResident(s,'rescued'),true);assert.equal(s.counts.rescued,1);
});

test('javeliniers fire moving hostile projectiles and cannot hit through a wall',()=>{
  const s=world();Object.assign(s.king,{x:1200,y:700});const e=enemy(s,'skirmisher',1050,700,{speed:0}),hp=s.king.hp;stepGame(s,.05);assert.equal(s.arrows.length,1);assert.equal(s.arrows[0].owner,'enemy');assert.equal(s.king.hp,hp);
  stepGame(s,.6);assert.ok(s.king.hp<hp);assert.equal(e.targetType,'king');
  const blocked=world();Object.assign(blocked.king,{x:1200,y:700});blocked.buildings.push({id:'screen',type:'wall',x:1125,y:700,rotation:Math.PI/2,complete:true,level:1,hp:190,maxHp:190});enemy(blocked,'skirmisher',1050,700,{speed:0});stepGame(blocked,2);assert.equal(blocked.king.hp,100);assert.equal(blocked.arrows.length,0);
});

test('encounter guardians obey the same physical wall protection as raiders',()=>{
  const s=world();Object.assign(s.king,{x:1200,y:700});s.buildings.push({id:'guardian-screen',type:'wall',x:1170,y:700,rotation:Math.PI/2,complete:true,level:1,hp:190,maxHp:190});
  s.enemies.push({id:'guardian',encounterId:'qa',kind:'guardian',homeX:1150,homeY:700,x:1140,y:700,speed:0,cool:0,hp:100,maxHp:100});stepGame(s,.1);assert.equal(s.king.hp,100);
});

test('manual bow and axe actions affect wildlife while neutral animals never count as raid kills',()=>{
  const s=world();Object.assign(s.king,{x:500,y:600});const a={id:'hunt',kind:'rabbit',label:'Lièvre',x:560,y:600,homeX:560,homeY:600,hp:18,maxHp:18,speed:0,territorial:false,territoryRadius:100,seed:1,state:'grazing',behavior:'grazing',cool:0,attackPulse:0,hitFlash:0,clock:0,wanderTimer:5,safetyTimer:5,warningTime:0,provokedUntil:0,homeSafe:true,relocating:false,distantTime:0,noticeCool:0};s.wildlife=[a];const before=s.resources.food;setWeapon(s,'axe');assert.equal(attackAt(s,560,600).ok,true);stepGame(s,.01);assert.equal(s.wildlife.length,0);assert.equal(s.kills,0);assert.equal(s.hunts,1);assert.ok(s.resources.food>before);
});
