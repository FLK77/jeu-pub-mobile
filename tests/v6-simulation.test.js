import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,interact,addResident,assignJob,stepGame,setWeapon,useAxe,placeBuilding,placementStatus,upgradeBuilding,demolishBuilding,research,setWage,customizeKing,kingdomStats,quotas,buy,distance} from '../simulation.js';
import {FOREST_TREES,HOME} from '../world-data.js';
import {BUILDINGS} from '../kingdom-data.js';
const world=()=>{const s=createGame(66);s.phaseRemaining=1e6;return s;};
const supplies=s=>{s.gold=10000;for(const key of Object.keys(s.resources))s.resources[key]=10000;};
function clearSite(s,type,points){for(const [x,y]of points)if(placementStatus(s,type,x,y).ok)return{x,y};throw Error('No valid fixture site for '+type);}
const sites=[[-100,200],[100,230],[500,-100],[850,460],[1000,280],[500,750],[-100,500],[1100,350],[1000,-100],[300,800],[750,800]];
function addBuilding(s,type,x,y,{complete=true,level=1}={}){const def=BUILDINGS[type],b={id:'fixture-'+s.buildings.length,type,x,y,rotation:0,level,complete,progress:complete?def.work:0,work:def.work,hp:150,maxHp:150};s.buildings.push(b);return b;}

test('V6 arrivals are unassigned and the king chooses their actual profession',()=>{
  const s=world();assert.equal(addResident(s,'rescued'),true);const p=s.allies[0];assert.equal(p.job,'unassigned');assert.equal(p.role,'survivor');
  assert.equal(assignJob(s,p.id,'worker').ok,true);assert.equal(p.job,'worker');assert.equal(assignJob(s,p.id,'potato').ok,false);
  assert.equal(assignJob(s,p.id,'inventor').ok,false);assert.equal(p.job,'worker');
});
test('only complete housing adds population slots, and pending arrivals reserve real slots',()=>{
  const s=world();addBuilding(s,'house',900,0,{complete:false});assert.equal(kingdomStats(s).capacity,10);
  for(let i=0;i<5;i++)assert.equal(addResident(s,'rescued'),true);
  for(let i=0;i<3;i++)assert.equal(addResident(s,'hired'),true);
  s.caravans.push({id:'incoming0',x:800,y:800},{id:'incoming1',x:800,y:800});
  assert.equal(kingdomStats(s).availableHousing,0);assert.equal(addResident(s,'natural'),false);
  s.buildings[1].complete=true;s.buildings[1].progress=s.buildings[1].work;assert.equal(kingdomStats(s).capacity,20);assert.deepEqual(quotas(s),{natural:4,hired:6,rescued:10});
});
test('axe is a genuine alternative weapon: swings have cooldown, fell trees, gather wood and earn hero xp',()=>{
  const s=world(),tree=FOREST_TREES.find(t=>t.x>0&&t.x<1500),index=FOREST_TREES.indexOf(tree);Object.assign(s.king,{x:tree.x-50,y:tree.y});
  const before=s.resources.wood;assert.equal(useAxe(s).ok,false);assert.equal(setWeapon(s,'axe').ok,true);
  for(let i=0;i<3;i++){assert.equal(useAxe(s).ok,true);assert.equal(useAxe(s).ok,false);stepGame(s,.6);}
  assert.ok(s.harvested.includes(index));assert.ok(s.resources.wood>before);assert.ok(s.king.xp>=30);assert.ok(s.king.axeSwing===0);
});
test('axe damages nearby enemies but does not emit bow projectiles',()=>{
  const s=world();setWeapon(s,'axe');s.enemies.push({x:550,y:420,hp:30,maxHp:30,speed:0});assert.equal(useAxe(s).ok,true);stepGame(s,.1);
  assert.equal(s.kills,1);assert.equal(s.arrows.length,0);assert.ok(s.king.xp>=20);
});
test('placement rejects overlaps, trees, and invalid bounds without spending; adjacent walls are legal',()=>{
  const s=world();supplies(s);const gold=s.gold;
  assert.equal(placeBuilding(s,'house',HOME.x,HOME.y).ok,false);assert.equal(s.gold,gold);
  assert.equal(placeBuilding(s,'house',-1900,0).ok,false);const tree=FOREST_TREES[0];assert.equal(placementStatus(s,'house',tree.x,tree.y).ok,false);
  const point=clearSite(s,'wall',sites);const result=placeBuilding(s,'wall',point.x,point.y);assert.equal(result.ok,true);assert.ok(result.id);assert.equal(placeBuilding(s,'wall',point.x+80,point.y).ok,true);
});
test('builders do real work and unfinished housing does not magically fill',()=>{
  const s=world();supplies(s);const point=clearSite(s,'house',sites),r=placeBuilding(s,'house',point.x,point.y);assert.equal(r.ok,true);stepGame(s,5);assert.equal(s.buildings.at(-1).progress,0);assert.equal(s.capacity,10);
  addResident(s,'rescued');const p=s.allies[0];assignJob(s,p.id,'builder');Object.assign(p,{x:point.x,y:point.y+BUILDINGS.house.depth/2+32});stepGame(s,35);
  assert.equal(s.buildings.at(-1).complete,true);assert.equal(s.capacity,20);assert.ok(s.xp>=65);assert.ok(p.xp>0);
});
test('building upgrades require builders and add housing only when the work finishes',()=>{
  const s=world();supplies(s);addResident(s,'rescued');const p=s.allies[0];assignJob(s,p.id,'builder');
  assert.equal(upgradeBuilding(s,'refuge').ok,true);assert.equal(s.capacity,10);assert.equal(s.buildings[0].level,1);
  Object.assign(p,{x:500,y:347});stepGame(s,55);assert.equal(s.buildings[0].level,2);assert.equal(s.capacity,20);assert.ok(s.maxHp>160);
});
test('one worker cycles material types rather than locking the economy to its arrival index',()=>{
  const s=world();addResident(s,'rescued');const p=s.allies[0];assignJob(s,p.id,'worker');const before={...s.resources};
  stepGame(s,100);assert.ok(s.resources.wood>before.wood);assert.ok(s.resources.stone>before.stone);assert.ok(s.resources.iron>before.iron);assert.ok(p.xp>0);
});
test('farmers require farms and their food production exceeds consumption',()=>{
  const s=world();addResident(s,'rescued');const p=s.allies[0];assignJob(s,p.id,'farmer');const before=s.resources.food;stepGame(s,10);assert.ok(s.resources.food<before);assert.equal(p.workStatus,'Ferme requise');
  const farm=addBuilding(s,'farm',850,460);Object.assign(p,{x:farm.x,y:farm.y+BUILDINGS.farm.depth/2+25});const stocked=s.resources.food;stepGame(s,10);assert.ok(s.resources.food>stocked);
});
test('armorer consumes actual supplies and weapons automatically equip knights',()=>{
  const s=world();supplies(s);addResident(s,'rescued');addResident(s,'rescued');const smith=s.allies[0],knight=s.allies[1];assignJob(s,smith.id,'armorer');s.resources.weapons=0;assignJob(s,knight.id,'knight');assert.equal(knight.equipped,false);
  const forge=addBuilding(s,'forge',850,460);Object.assign(smith,{x:forge.x,y:forge.y+BUILDINGS.forge.depth/2+25});const iron=s.resources.iron;stepGame(s,13);assert.ok(s.resources.iron<iron);assert.equal(knight.equipped,true);assert.ok(knight.equipmentDurability>0);
});
test('knights defend at melee range and unassigned inhabitants do not fight automatically',()=>{
  const s=world();addResident(s,'rescued');const p=s.allies[0];setWeapon(s,'axe');s.enemies.push({x:p.x+45,y:p.y+30,hp:40,maxHp:40,speed:0});stepGame(s,1);assert.equal(s.enemies[0].hp,40);
  assignJob(s,p.id,'knight');stepGame(s,2);assert.equal(s.enemies.length,0);assert.ok(p.xp>0);
});
test('development activates wages; paid workers stay motivated and arrears reduce real efficiency',()=>{
  const paid=world(),unpaid=world();for(const s of [paid,unpaid]){addResident(s,'rescued');assignJob(s,s.allies[0].id,'farmer');addBuilding(s,'farm',850,460);Object.assign(s.allies[0],{x:850,y:560});s.kingdomLevel=3;s.xp=300;s.resources.food=500;setWage(s,4);}
  paid.gold=100;unpaid.gold=0;const pFood=paid.resources.food,uFood=unpaid.resources.food;stepGame(paid,125);stepGame(unpaid,125);
  assert.equal(paid.payroll.totalPaid,8);assert.equal(unpaid.payroll.totalPaid,0);assert.equal(unpaid.payroll.arrears,8);assert.ok(paid.allies[0].motivation>unpaid.allies[0].motivation);assert.ok(paid.resources.food-pFood>unpaid.resources.food-uFood);
});
test('hero, kingdom and inhabitant experience are separate progression systems',()=>{
  const s=world();addResident(s,'rescued');const person=s.allies[0];assert.equal(s.xp,20);assert.equal(s.king.xp,0);assert.equal(person.xp,0);
  for(const p of s.landmarks.slice(0,3)){Object.assign(s.king,{x:p.x,y:p.y});assert.equal(interact(s).ok,true);}
  assert.equal(s.king.xp,75);assert.equal(s.king.heroLevel,2);assert.equal(s.kingdomLevel,1);assert.equal(s.xp,50);
  assignJob(s,person.id,'worker');stepGame(s,30);assert.ok(person.xp>0);assert.equal(s.king.xp,75);assert.ok(kingdomStats(s).hero.nextXP>75);
});
test('inventors unlock late, accumulate knowledge and complete technology with actual effects',()=>{
  const s=world();supplies(s);addResident(s,'rescued');const p=s.allies[0];assert.equal(assignJob(s,p.id,'inventor').ok,false);s.kingdomLevel=4;s.xp=600;const academy=addBuilding(s,'academy',850,460);assert.equal(assignJob(s,p.id,'inventor').ok,true);
  Object.assign(p,{x:academy.x,y:academy.y+BUILDINGS.academy.depth/2+25});assert.equal(research(s,'weaponry').ok,true);assert.equal(research(s,'architecture').ok,false);stepGame(s,60);assert.ok(s.tech.includes('weaponry'));assert.equal(s.research,null);assert.ok(p.xp>0);assert.equal(research(s,'weaponry').ok,false);
});
test('customization validates names and appearance without accepting markup or invalid colors',()=>{
  const s=world();assert.equal(customizeKing(s,{name:'<Éloi>',cape:'#336699',beard:'short',crown:'spiked'}).ok,true);assert.equal(s.king.appearance.name,'Éloi');assert.equal(s.king.appearance.beard,'short');const before={...s.king.appearance};assert.equal(customizeKing(s,{cape:'javascript:evil'}).ok,false);assert.deepEqual(s.king.appearance,before);
});


test('forests renew refugee supply after original exploration without duplicate escorts',()=>{
  const s=world();supplies(s);for(let i=0;i<3;i++)addBuilding(s,'house',1000+i*180,-500);
  kingdomStats(s);for(let i=0;i<15;i++)assert.equal(addResident(s,'rescued'),true);
  for(const c of s.camps){c.rescued=true;c.visits=1;c.nextRefugeeAt=0;}
  s.refugeeRefreshTimer=.01;stepGame(s,.1);const camp=s.camps.find(c=>!c.rescued);assert.ok(camp);
  Object.assign(s.king,{x:camp.x,y:camp.y});assert.equal(interact(s).ok,true);const follower=s.followers[0];assert.equal(follower.campId,camp.id);assert.notEqual(follower.id,camp.id);
  camp.nextRefugeeAt=0;s.refugeeRefreshTimer=.01;stepGame(s,.1);assert.equal(camp.rescued,true,'camp with pending escort is not renewed');assert.equal(s.followers.length,1);
  const known=s.camps.filter(c=>!c.rescued).length;assert.ok(known<=1,'only one additional camp renewed per bounded timer');
});
test('critical morale slows farmers but does not permanently lock a starving kingdom',()=>{
  const s=world();addResident(s,'rescued');const p=s.allies[0];assignJob(s,p.id,'farmer');addBuilding(s,'farm',850,460);Object.assign(p,{x:850,y:560,motivation:0});s.resources.food=0;
  stepGame(s,10);assert.ok(s.resources.food>0);assert.equal(s.allies.length,1);assert.ok(kingdomStats(s).efficiency>0&&kingdomStats(s).efficiency<.2);
});
test('a completed treasury supports wages through local commerce',()=>{
  const s=world();addResident(s,'rescued');addBuilding(s,'treasury',850,460);const before=s.gold;stepGame(s,90);assert.ok(s.gold>before);assert.ok(kingdomStats(s).incomePerMinute>0);
});


test('dashboard food balance matches effective nearby farmers, chosen farm levels and raid pauses',()=>{
  const s=world();addResident(s,'rescued');addResident(s,'rescued');
  const f0=addBuilding(s,'farm',850,460),f1=addBuilding(s,'farm',100,600,{level:2});
  for(let i=0;i<2;i++){const p=s.allies[i];assignJob(s,p.id,'farmer');const farm=i?f1:f0;Object.assign(p,{x:farm.x,y:farm.y+BUILDINGS.farm.depth/2+25,motivation:i?40:80});}
  const reported=kingdomStats(s).foodBalance,before=s.resources.food;stepGame(s,.001);const actual=(s.resources.food-before)/.001;
  assert.ok(Math.abs(reported-actual)<.00001,`reported ${reported}, effective ${actual}`);
  s.allies[1].x=2000;const away=kingdomStats(s).foodBalance;assert.ok(away<reported);
  s.phase='warning';s.phaseRemaining=100;assert.equal(kingdomStats(s).foodBalance,-s.allies.length*.012);assert.equal(kingdomStats(s).incomePerMinute,0);
});


test('demolition protects the refuge, refunds a base fraction once and updates real housing',()=>{
  const s=world();supplies(s);assert.equal(demolishBuilding(s,'refuge').ok,false);
  const house=addBuilding(s,'house',850,460,{level:2});assert.equal(kingdomStats(s).capacity,30);
  const before={gold:s.gold,wood:s.resources.wood,stone:s.resources.stone},result=demolishBuilding(s,house.id);
  assert.equal(result.ok,true);assert.equal(s.capacity,10);assert.equal(s.gold-before.gold,17);assert.equal(s.resources.wood-before.wood,22);assert.equal(s.resources.stone-before.stone,10);
  assert.equal(demolishBuilding(s,house.id).ok,false);assert.equal(s.gold,before.gold+17);
  const unfinished=addBuilding(s,'house',900,-300,{complete:false});assert.equal(kingdomStats(s).capacity,10);assert.equal(demolishBuilding(s,unfinished.id).ok,true);assert.equal(s.capacity,10);
});
