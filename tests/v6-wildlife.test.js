import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWildlife,stepWildlife,hitWildlife,wildlifeThreats,WILDLIFE_TYPES} from '../wildlife.js';
import {HOME,WORLD,nearbyTrees} from '../world-data.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function world(kind='wolf'){
  const a=createWildlife(20261028).find(a=>a.kind===kind);
  return{time:0,king:{...HOME,hp:100,maxHp:100,invulnerable:0},allies:[],buildings:[{id:'refuge',type:'house',isRefuge:true,...HOME,complete:true,hp:160}],resources:{food:0},wildlife:[a],events:[],over:false};
}
function step(s,seconds,services){const n=Math.ceil(seconds*30);for(let i=0;i<n;i++){s.time+=seconds/n;if(s.king.invulnerable>0)s.king.invulnerable=Math.max(0,s.king.invulnerable-seconds/n);stepWildlife(s,seconds/n,services);}}
function enter(s,dx=40){const a=s.wildlife[0];s.king.x=a.homeX+dx;s.king.y=a.homeY;return a;}

test('V6 wildlife is deterministic, bounded and placed in genuine forest away from civilization',()=>{
  const animals=createWildlife(20261028);
  assert.deepEqual(animals,createWildlife(20261028));assert.notDeepEqual(animals,createWildlife(20261029));
  assert.equal(animals.length,32);assert.equal(new Set(animals.map(a=>a.id)).size,32);
  assert.deepEqual(Object.fromEntries(Object.keys(WILDLIFE_TYPES).map(kind=>[kind,animals.filter(a=>a.kind===kind).length])),{deer:12,rabbit:12,boar:4,wolf:4});
  for(const a of animals){
    assert.ok(a.x>WORLD.minX&&a.x<WORLD.maxX&&a.y>WORLD.minY&&a.y<WORLD.maxY);
    assert.ok(nearbyTrees(a.homeX,a.homeY).length>0,'every habitat has actual forest');
    if(a.territorial)assert.ok(distance(a,HOME)>1100,'aggressive wildlife starts in remote forest');
    assert.ok(WILDLIFE_TYPES[a.kind].description);
  }
});

test('deer and hares flee nearby humans and never attack even when provoked',()=>{
  for(const kind of ['deer','rabbit']){
    const s=world(kind),a=enter(s,35),start={x:a.x,y:a.y};
    step(s,.2);assert.equal(a.state,'fleeing');assert.ok(distance(a,start)>10);assert.equal(s.king.hp,100);
    hitWildlife(s,a,1);step(s,5);assert.equal(s.king.hp,100);assert.equal(a.targetId,null);assert.notEqual(a.state,'defending');
  }
});

test('territorial animals stay away from the kingdom and do not start a raid or map-wide pursuit',()=>{
  const s=world(),a=s.wildlife[0],home={x:a.homeX,y:a.homeY};
  step(s,90);assert.equal(s.king.hp,100);assert.equal(a.targetId,null);assert.ok(distance(a,home)<a.territoryRadius+30);assert.ok(distance(a,HOME)>800);
  assert.equal(s.events.length,0);assert.equal(s.wildlife.length,1);
});

test('entering a den gives a real warning before a bounded melee attack through hurtHero',()=>{
  const s=world(),a=enter(s,35);let attacks=0;
  const services={hurtHero(state,damage){attacks++;state.king.hp-=damage;}};
  step(s,1,services);assert.equal(a.state,'warning');assert.equal(s.king.hp,100);assert.equal(s.events.filter(e=>/Territoire sauvage/.test(e)).length,1);
  step(s,3,services);assert.equal(a.state,'defending');assert.equal(a.targetId,'king');assert.ok(attacks>=1&&attacks<=3);assert.ok(s.king.hp<100);assert.equal(s.events.length,1,'warning is not emitted every tick');
});

test('leaving the territory immediately clears combat intent and the animal returns home',()=>{
  const s=world('boar'),a=enter(s,35);step(s,2);
  const hp=s.king.hp;s.king.x=a.homeX+a.territoryRadius+160;s.king.y=a.homeY;
  step(s,.05);assert.equal(a.targetId,null);assert.notEqual(a.state,'defending');
  step(s,20);assert.equal(s.king.hp,hp);assert.ok(distance(a,{x:a.homeX,y:a.homeY})<a.territoryRadius+30);
});

test('a shot from outside the den cannot lure a territorial animal toward civilization',()=>{
  const s=world(),a=s.wildlife[0];s.king.x=a.homeX+a.territoryRadius+220;s.king.y=a.homeY;
  assert.equal(hitWildlife(s,a,10),true);const hp=s.king.hp;
  step(s,12);assert.equal(s.king.hp,hp);assert.equal(a.targetId,null);assert.notEqual(a.state,'defending');
  assert.ok(distance(a,{x:a.homeX,y:a.homeY})<a.territoryRadius+30);
});

test('wildlife threatens outdoor residents but never targets a resident sheltered inside',()=>{
  const s=world('boar'),a=s.wildlife[0];
  const p={id:'citizen-worker',x:a.homeX+34,y:a.homeY,hp:85,maxHp:85,motivation:80};s.allies.push(p);
  step(s,3);assert.ok(p.hp<85);assert.equal(a.targetId,p.id);assert.equal(wildlifeThreats(s,p).length,1);assert.equal(s.king.hp,100);
  p.hidden=true;p.sheltered=true;const hp=p.hp;step(s,4);assert.equal(p.hp,hp);assert.equal(a.targetId,null);assert.equal(wildlifeThreats(s,p).length,0);
});

test('territories move away from new completed buildings without teleporting or attacking the settlement',()=>{
  const s=world(),a=enter(s,35);step(s,2);const original={x:a.x,y:a.y},oldHome={x:a.homeX,y:a.homeY};
  const settlement={id:'new-house',type:'house',x:a.homeX,y:a.homeY+180,complete:true,hp:150};s.buildings.push(settlement);a.safetyTimer=0;
  step(s,.1);assert.equal(a.targetId,null);assert.equal(a.state,'returning');assert.equal(a.relocating,true);
  assert.ok(distance(a,original)<30,'relocation uses physical movement');
  assert.ok(distance({x:a.homeX,y:a.homeY},settlement)>a.territoryRadius+420,'new habitat excludes the settlement footprint');
  const hp=s.king.hp;step(s,50);assert.equal(s.king.hp,hp);assert.ok(distance(a,oldHome)>400);assert.ok(a.homeSafe);
});

test('territorial melee cannot pass through a wall while animals navigate',()=>{
  const s=world('boar'),a=s.wildlife[0];a.x=a.homeX-30;a.y=a.homeY;enter(s,30);
  // An unfinished rempart already has a physical footprint but does not yet
  // count as a new civilization centre that would relocate the habitat.
  s.buildings.push({id:'wall',type:'wall',x:a.homeX,y:a.homeY,width:8,depth:130,complete:false,hp:100});
  const hp=s.king.hp;step(s,6);assert.equal(s.king.hp,hp);assert.equal(a.state,'defending');assert.ok(a.x<a.homeX);
});

test('a hunted animal disappears once, yields finite food, and does not change raid kill counters',()=>{
  const s=world('deer'),a=s.wildlife[0];s.kills=7;
  assert.equal(hitWildlife(s,a,a.maxHp+1),true);assert.equal(hitWildlife(s,a,50),false);step(s,.1);
  assert.equal(s.wildlife.length,0);assert.equal(s.resources.food,12);assert.equal(s.hunts,1);assert.equal(s.kills,7);
  step(s,100);assert.equal(s.resources.food,12);assert.equal(s.hunts,1);assert.equal(s.wildlife.length,0,'no endless respawning or duplicate rewards');
});

test('wildlife ignores invalid time, dead worlds, and invalid damage',()=>{
  const s=world(),a=s.wildlife[0],before=structuredClone(s);
  for(const dt of [0,-1,NaN,Infinity])stepWildlife(s,dt);assert.deepEqual(s,before);
  for(const damage of [0,-10,NaN,Infinity])assert.equal(hitWildlife(s,a,damage),false);
  s.over=true;stepWildlife(s,1);assert.equal(a.clock,0);
});
