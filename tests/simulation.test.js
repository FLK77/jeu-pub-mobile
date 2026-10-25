import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,interact,buy,addResident,quotas,population,distance,collide,objective} from '../simulation.js';
import {HOME,HORSE_START,WORLD,FOREST_TREES} from '../world-data.js';

// Exploration and combat regressions from V2. V3 economy/building rules have
// their own focused suite; these tests keep the old adventure usable.
test('start alone in an open forest with a nearby horse and a genuine quiet interval',()=>{
  const s=createGame(77);assert.equal(population(s),0);assert.equal(s.phase,'peace');assert.ok(distance(s.king,HORSE_START)<250);
  assert.ok(FOREST_TREES.length>500);assert.ok(WORLD.maxX-WORLD.minX>4000);
  stepGame(s,60);assert.equal(s.phase,'peace');assert.equal(s.enemies.length,0);assert.ok(s.phaseRemaining>59);
});
test('the horse can be mounted and doubles movement speed; it stays after dismounting',()=>{
  const foot=createGame(1),mounted=createGame(1);foot.king={...foot.king,...HORSE_START};mounted.king={...mounted.king,...HORSE_START};
  assert.equal(interact(mounted).ok,true);assert.equal(mounted.king.mounted,true);
  stepGame(foot,.3,{x:1,y:0});stepGame(mounted,.3,{x:1,y:0});
  assert.ok(Math.abs((mounted.king.x-HORSE_START.x)/(foot.king.x-HORSE_START.x)-2)<.001);
  assert.equal(interact(mounted).ok,true);const horse={...mounted.horse};stepGame(mounted,.4,{x:0,y:1});assert.equal(mounted.king.mounted,false);assert.equal(mounted.horse.x,horse.x);assert.equal(mounted.horse.y,horse.y);
});
test('a forest rescue is an escort and arrives without an automatically assigned job',()=>{
  const s=createGame(2),camp=s.camps[0],gold=s.gold;Object.assign(s.king,{x:camp.x,y:camp.y});
  assert.equal(interact(s).ok,true);assert.equal(s.followers.length,1);assert.equal(s.counts.rescued,0);
  const target={x:500,y:400};for(let i=0;i<200;i++){const d=distance(s.king,target);stepGame(s,.02,d>3?{x:(target.x-s.king.x)/d,y:(target.y-s.king.y)/d}:{});}
  stepGame(s,1);assert.equal(s.followers.length,0);assert.equal(s.counts.rescued,1);assert.ok(s.gold>=gold);
  assert.equal(s.allies[0].job,'unassigned');
});
test('survivors cannot be recruited during an assault or exceed their housing allocation',()=>{
  const s=createGame(3),camp=s.camps[0];Object.assign(s.king,{x:camp.x,y:camp.y});s.phase='raid';assert.equal(interact(s).ok,false);assert.equal(camp.rescued,false);
  s.phase='peace';for(let i=0;i<quotas(s).rescued;i++)assert.equal(addResident(s,'rescued'),true);
  assert.equal(interact(s).ok,false);assert.equal(s.followers.length,0);
});
test('paid recruitment requires a first rescue, the refuge, peace and available gold',()=>{
  const s=createGame(4);s.gold=500;assert.equal(buy(s,'recruit').ok,false);addResident(s,'rescued');
  Object.assign(s.king,{x:1800,y:1800});assert.equal(buy(s,'recruit').ok,false);
  Object.assign(s.king,{x:500,y:400});s.phase='warning';assert.equal(buy(s,'recruit').ok,false);
  s.phase='peace';const before=s.gold;assert.equal(buy(s,'recruit').ok,true);assert.ok(s.gold<before);assert.equal(s.counts.hired,1);assert.equal(s.allies.at(-1).job,'unassigned');
  while(s.counts.hired<quotas(s).hired)assert.equal(buy(s,'recruit').ok,true);
  assert.equal(buy(s,'recruit').ok,false);
});
test('a complete initial cohort preserves twenty/thirty/fifty percent origins',()=>{
  const s=createGame(5),q=quotas(s);assert.equal(q.natural+q.hired+q.rescued,s.capacity);
  for(const [source,n]of Object.entries(q))for(let i=0;i<n;i++)assert.equal(addResident(s,source),true);
  assert.deepEqual(s.counts,q);assert.equal(population(s),s.capacity);
  for(const source of ['natural','hired','rescued'])assert.equal(addResident(s,source),false);
  assert.ok(s.allies.every(p=>p.job==='unassigned'));
});
test('spontaneous arrivals walk to the refuge and arrive without an assigned profession',()=>{
  const s=createGame(6);s.phaseRemaining=1000;addResident(s,'rescued');s.arrivalTimer=.01;
  stepGame(s,.1);assert.equal(s.caravans.length,1);assert.equal(s.counts.natural,0);
  stepGame(s,9);assert.equal(s.counts.natural,1);assert.equal(s.caravans.length,0);
  assert.equal(s.allies.find(p=>p.source==='natural').job,'unassigned');
  stepGame(s,250);assert.equal(s.counts.natural,quotas(s).natural);assert.equal(s.caravans.length,0);
});
test('attacks are separated by long variable truces and preceded by a return warning',()=>{
  const s=createGame(7);stepGame(s,120.1);assert.equal(s.phase,'warning');assert.equal(s.enemies.length,0);
  stepGame(s,25.1);assert.equal(s.phase,'raid');stepGame(s,2);assert.ok(s.enemies.length>0);
  s.left=0;s.enemies=[];stepGame(s,.1);assert.equal(s.phase,'peace');assert.ok(s.phaseRemaining>=89&&s.phaseRemaining<=170);assert.equal(s.day,2);
});
test('the king cannot walk through tree trunks, the refuge or the map boundary',()=>{
  const s=createGame(8),t=FOREST_TREES[0];Object.assign(s.king,{x:t.x-30,y:t.y});stepGame(s,.1,{x:1,y:0});assert.ok(distance(s.king,t)>=12+9*t.size-.001);
  Object.assign(s.king,{x:500,y:300});stepGame(s,.2,{x:0,y:-1});assert.ok(s.king.y>=300);
  Object.assign(s.king,{x:WORLD.maxX-1,y:HOME.y+300});collide(s.king);assert.ok(s.king.x<=WORLD.maxX-45);
});
test('automatic bow arrows still kill enemies and produce collectible coins',()=>{
  const s=createGame(9),before=s.gold;s.enemies.push({x:550,y:440,hp:10,maxHp:10,speed:0});stepGame(s,2);
  assert.equal(s.kills,1);assert.equal(s.enemies.length,0);assert.ok(s.gold>before);assert.equal(s.coins.length,0);
});
test('objectives respond to arrival and a fallen refuge still ends the expedition',()=>{
  const s=createGame(10),before=objective(s);assert.match(before,/survivant/);addResident(s,'rescued');assert.notEqual(objective(s),before);
  s.hp=.01;s.phase='raid';s.left=1;s.enemies.push({x:500,y:330,hp:999,maxHp:999,speed:0});stepGame(s,.1);assert.equal(s.over,true);assert.equal(s.hp,0);
});
test('a horse parked at a survivor camp does not block rescue after dismounting',()=>{
  const s=createGame(12),camp=s.camps[0];Object.assign(s.king,{x:camp.x,y:camp.y,mounted:true});Object.assign(s.horse,{x:camp.x,y:camp.y});
  assert.equal(interact(s).ok,true);assert.equal(s.king.mounted,false);assert.equal(interact(s).ok,true);assert.equal(s.followers.length,1);assert.equal(s.king.mounted,false);
});
