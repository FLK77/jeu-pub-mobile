import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Sim from '../simulation.js';
import {WORLD,HOME,FOREST_TREES,DISCOVERY_SITES,nearbyTrees} from '../world-data.js';

const world=()=>{const s=Sim.createGame(20261026);s.phaseRemaining=1e6;Object.assign(s.king,{x:500,y:600});return s;};
const enemy=(x,y,hp=20)=>({x,y,hp,maxHp:hp,speed:0,aim:0});
const level=(s,n)=>{s.king.heroLevel=n;s.king.xp=Sim.xpForLevel(n,true);};
const treeFixture=()=>FOREST_TREES.find(t=>t.x>0&&t.x<1500&&Math.abs(t.y-HOME.y)>550&&nearbyTrees(t.x-50,t.y).every(other=>other===t||Math.hypot(other.x-(t.x-50),other.y-t.y)>=90));

test('V5 opens more than twice the V4 region and indexes forest in its new outskirts',()=>{
  const area=(WORLD.maxX-WORLD.minX)*(WORLD.maxY-WORLD.minY);
  assert.ok(area>=2*4600*4400,'the playable bounds, not only the drawn ground, expand');
  assert.ok(FOREST_TREES.length>1000);
  for(const tree of [FOREST_TREES[0],FOREST_TREES.at(-1),FOREST_TREES.find(t=>t.x>2800)]){
    assert.ok(tree&&nearbyTrees(tree.x,tree.y).includes(tree),'collision index includes the outskirts');
  }
  assert.ok(DISCOVERY_SITES.some(p=>p.x< -1800||p.x>2800||p.y< -1900||p.y>2500));
});

test('construction cannot bury an undiscovered encounter or its reward chest',()=>{
  const s=world();s.gold=10000;for(const key of Object.keys(s.resources))s.resources[key]=10000;
  for(const site of s.discoveries)for(const type of ['house','wall']){
    const before={gold:s.gold,wood:s.resources.wood,stone:s.resources.stone,count:s.buildings.length};
    assert.equal(Sim.placeBuilding(s,type,site.x,site.y).ok,false,site.id+' '+type);
    assert.deepEqual({gold:s.gold,wood:s.resources.wood,stone:s.resources.stone,count:s.buildings.length},before);
  }
});

test('an enemy in range never makes the king shoot without a player attack intent',()=>{
  const s=world(),e=enemy(650,600,100);s.enemies.push(e);
  Sim.stepGame(s,2);
  assert.equal(e.hp,100);assert.equal(s.kills,0);assert.equal(s.arrows.length,0);
  assert.equal(Sim.setTarget(s,e.x,e.y).ok,true);Sim.stepGame(s,1);
  assert.equal(e.hp,100);assert.equal(s.arrows.length,0,'choosing a target alone is not an automatic attack order');
});

test('a chosen bow direction hits that side and the kill produces collectible gold',()=>{
  const s=world(),east=enemy(650,600),west=enemy(350,600);s.enemies.push(east,west);
  const before=s.gold;assert.equal(Sim.attackAt(s,east.x,east.y).ok,true);
  assert.equal(s.arrows.length,1);assert.ok(s.arrows[0].vx>0);assert.ok(Math.abs(s.arrows[0].vy)<.001);
  Sim.stepGame(s,.35);
  assert.equal(s.kills,1);assert.ok(!s.enemies.includes(east));assert.equal(west.hp,20);
  Object.assign(s.king,{x:east.x,y:east.y});Sim.stepGame(s,.1);
  assert.ok(s.gold>before,'the dead enemy drops spendable coins');
});

test('a shot at empty ground does not home towards a nearby enemy or repeat itself',()=>{
  const s=world(),offAxis=enemy(650,600,100);s.enemies.push(offAxis);
  assert.equal(Sim.attackAt(s,500,900).ok,true);assert.equal(s.arrows.length,1);
  assert.equal(s.arrows[0].vx,0);assert.ok(s.arrows[0].vy>0);
  assert.equal(Sim.attackAt(s,offAxis.x,offAxis.y).ok,false,'one click cannot bypass cooldown');
  Sim.stepGame(s,2);assert.equal(offAxis.hp,100);assert.equal(s.arrows.length,0);
});

test('invalid target coordinates and a fallen expedition cannot emit projectiles',()=>{
  const s=world();
  for(const [x,y]of [[NaN,600],[500,Infinity],[WORLD.minX-1,600],[500,WORLD.maxY+1],[s.king.x,s.king.y]]){
    assert.equal(Sim.attackAt(s,x,y).ok,false,JSON.stringify([x,y]));
    assert.equal(s.arrows.length,0);assert.ok(Number.isFinite(s.king.aim));
  }
  s.over=true;
  assert.equal(Sim.attackAt(s,650,600).ok,false);assert.equal(Sim.useDash(s,{x:1,y:0}).ok,false);
  assert.equal(Sim.usePowerAttack(s,650,600).ok,false);assert.equal(s.arrows.length,0);
});

test('the directed axe cuts in front while sparing an equally close enemy behind',()=>{
  const s=world(),front=enemy(555,600,100),back=enemy(445,600,100);s.enemies.push(front,back);
  Sim.setWeapon(s,'axe');assert.equal(Sim.useAxe(s).ok,false,'the action button cannot choose a nearby target for the player');
  assert.equal(front.hp,100);assert.equal(back.hp,100);assert.equal(s.king.target,null);
  assert.equal(Sim.attackAt(s,600,600).ok,true);
  assert.ok(front.hp<100);assert.equal(back.hp,100);assert.equal(s.arrows.length,0);
  assert.equal(Sim.attackAt(s,400,600).ok,false,'axe cooldown also applies to a new direction');
});

test('a selected tree must be on the axe side, then real cuts award wood and experience',()=>{
  const s=world(),tree=treeFixture(),index=FOREST_TREES.indexOf(tree);assert.ok(tree);
  Object.assign(s.king,{x:tree.x-50,y:tree.y});Sim.setWeapon(s,'axe');const before=s.resources.wood;
  assert.equal(Sim.attackAt(s,s.king.x-150,s.king.y).ok,true);
  assert.ok(!s.harvested.includes(index));assert.equal(s.resources.wood,before);
  for(let i=0;i<3;i++){Sim.stepGame(s,.65);assert.equal(Sim.attackAt(s,tree.x,tree.y).ok,true);}
  assert.ok(s.harvested.includes(index));assert.ok(s.resources.wood>before);assert.ok(s.king.xp>0);
});

test('real exploration experience unlocks a new movement action and communicates the milestone',()=>{
  const s=world();assert.equal(Sim.progressionState(s).abilities.dash.unlocked,false);
  assert.equal(Sim.useDash(s,{x:1,y:0}).ok,false);
  for(const landmark of s.landmarks.slice(0,2)){Object.assign(s.king,{x:landmark.x,y:landmark.y});assert.equal(Sim.interact(s).ok,true);}
  assert.equal(s.king.heroLevel,2);assert.equal(Sim.progressionState(s).abilities.dash.unlocked,true);
  assert.ok(s.events.some(message=>/niveau|élan|souverain|esquive/i.test(message)),'the player receives an in-game milestone message');
  assert.ok(Sim.progressionState(s).unlocks.some(item=>item.id==='dash'&&item.unlocked));
});

test('the level-two dash changes actual movement, has a cooldown and respects world boundaries',()=>{
  const walking=world(),dashing=world();level(dashing,2);
  assert.equal(Sim.useDash(dashing,{x:1,y:0}).ok,true);
  Sim.stepGame(walking,.18,{x:1,y:0});Sim.stepGame(dashing,.18,{x:1,y:0});
  assert.ok(dashing.king.x-500>(walking.king.x-500)*2,'dash is a gameplay action, not a badge');
  assert.equal(Sim.useDash(dashing,{x:1,y:0}).ok,false);
  Sim.stepGame(dashing,4.1);assert.equal(Sim.useDash(dashing,{x:1,y:0}).ok,true);
  Object.assign(dashing.king,{x:WORLD.maxX-46,y:HOME.y+360});Sim.stepGame(dashing,.3,{x:1,y:0});
  assert.ok(dashing.king.x<=WORLD.maxX-45&&dashing.king.x>=WORLD.minX+45);
});

test('the level-three power shot pierces successive enemies and cannot be spammed',()=>{
  const s=world();level(s,2);assert.equal(Sim.usePowerAttack(s,800,600).ok,false);
  level(s,3);assert.equal(Sim.usePowerAttack(s).ok,false,'a power button cannot invent the first target');assert.equal(s.arrows.length,0);
  const a=enemy(590,600),b=enemy(670,600),offAxis=enemy(600,700,100);s.enemies.push(a,b,offAxis);
  assert.equal(Sim.usePowerAttack(s,900,600).ok,true);assert.equal(Sim.usePowerAttack(s,900,600).ok,false);
  Sim.stepGame(s,.55);assert.ok(!s.enemies.includes(a)&&!s.enemies.includes(b),'one royal shot passes through multiple targets');
  assert.equal(offAxis.hp,100);assert.ok(Sim.progressionState(s).abilities.power.cooldown>0);
});

test('royal axe power fells a selected tree in one action and stays level-gated',()=>{
  const s=world(),tree=treeFixture(),index=FOREST_TREES.indexOf(tree);Object.assign(s.king,{x:tree.x-50,y:tree.y});Sim.setWeapon(s,'axe');
  assert.equal(Sim.usePowerAttack(s,tree.x,tree.y).ok,false);assert.ok(!s.harvested.includes(index));
  level(s,3);const wood=s.resources.wood;assert.equal(Sim.usePowerAttack(s,tree.x,tree.y).ok,true);
  assert.ok(s.harvested.includes(index));assert.ok(s.resources.wood>wood);assert.equal(s.arrows.length,0);
});

test('new clothing, heraldry, hair, eyes, mount and kingdom naming persist with atomic validation',()=>{
  const s=world(),appearance={name:'Éloi',outfit:'ranger',emblem:'stag',hairStyle:'braids',eye:'#7470a2',mountCoat:'ivory'};
  assert.equal(Sim.customizeKing(s,appearance).ok,true);
  for(const [key,value]of Object.entries(appearance))assert.equal(s.king.appearance[key],value,key);
  const before={...s.king.appearance};
  for(const bad of [{outfit:'dragon'},{emblem:'script'},{hairStyle:'wrong'},{eye:'url(x)'},{mountCoat:'zebra'},{cape:'#aabbcc',outfit:'bad'}]){
    assert.equal(Sim.customizeKing(s,bad).ok,false);assert.deepEqual(s.king.appearance,before);
  }
  assert.equal(Sim.customizeKingdom(s,'  <Aurore>\u0000 des Bois  ').ok,true);
  assert.equal(s.kingdomName,'Aurore des Bois');
  const realm=s.kingdomName;assert.equal(Sim.customizeKingdom(s,'   ').ok,false);assert.equal(s.kingdomName,realm);
});

test('a hidden landmark becomes a gated guardian encounter and its relic reward can only be claimed once',()=>{
  const s=world(),def=DISCOVERY_SITES[0],site=s.discoveries.find(p=>p.id===def.id);assert.ok(site);assert.equal(site.known,false);
  Object.assign(s.king,{x:site.x-70,y:site.y});Sim.stepGame(s,.02);
  assert.equal(site.known,true);assert.equal(Sim.interact(s).ok,false);assert.equal(site.triggered,false);
  level(s,Math.max(3,def.requiredLevel));
  assert.equal(Sim.interact(s).ok,true);assert.equal(site.triggered,true);
  const guardCount=s.enemies.filter(e=>e.encounterId===site.id).length;assert.ok(guardCount>0);
  Sim.interact(s);assert.equal(s.enemies.filter(e=>e.encounterId===site.id).length,guardCount,'interaction cannot duplicate guardians');
  assert.equal(site.rewardClaimed,false);
  for(let tries=0;tries<100&&s.enemies.some(e=>e.encounterId===site.id);tries++){
    const target=s.enemies.find(e=>e.encounterId===site.id);
    Sim.attackAt(s,target.x,target.y);Sim.stepGame(s,.7);
  }
  assert.equal(s.enemies.filter(e=>e.encounterId===site.id).length,0,'guardians are defeated by actual player-directed attacks');
  assert.equal(site.cleared,true);assert.equal(site.rewardClaimed,false);
  Object.assign(s.king,{x:site.x-70,y:site.y});const before={gold:s.gold,knowledge:s.resources.knowledge,maxHp:s.king.maxHp};
  assert.equal(Sim.interact(s).ok,true);assert.equal(site.rewardClaimed,true);
  assert.equal(s.gold-before.gold,def.reward.gold);assert.equal(s.resources.knowledge-before.knowledge,def.reward.knowledge);
  assert.ok(s.king.maxHp>before.maxHp,'the revealed relic changes gameplay');
  const paid={gold:s.gold,knowledge:s.resources.knowledge,xp:s.king.xp};
  assert.equal(Sim.interact(s).ok,false);assert.deepEqual({gold:s.gold,knowledge:s.resources.knowledge,xp:s.king.xp},paid);
  s.king.hp-=10;const wounded=s.king.hp;Sim.stepGame(s,4);assert.ok(s.king.hp>wounded,'the earned relic supports exploration regeneration');
});

test('being defeated returns the hero to refuge with a bounded gold loss and preserves customization',()=>{
  const s=world();Sim.customizeKingdom(s,'Les Cimes');Sim.customizeKing(s,{outfit:'warden',emblem:'moon'});
  level(s,2);const site=s.discoveries[0];Object.assign(s.king,{x:site.x-70,y:site.y});
  assert.equal(Sim.interact(s).ok,true);const guardian=s.enemies.find(e=>e.encounterId===site.id);
  Object.assign(guardian,{x:s.king.x+10,y:s.king.y,cool:0});s.gold=200;s.king.hp=1;Sim.stepGame(s,.05);
  assert.ok(s.king.hp>0);assert.ok(Sim.distance(s.king,HOME)<300);assert.ok(s.gold>=175&&s.gold<=200);
  assert.equal(s.kingdomName,'Les Cimes');assert.equal(s.king.appearance.outfit,'warden');assert.equal(s.over,false);
});
