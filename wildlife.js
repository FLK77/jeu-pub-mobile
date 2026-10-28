import {HOME,WORLD,FOREST_TREES,nearbyTrees} from './world-data.js';
import {BUILDINGS} from './kingdom-data.js';

// Wildlife has its own random stream: adding an animal never changes raid,
// arrival or loot rolls. Populations are finite and do not respawn mid-hunt.
export const WILDLIFE_SPECIES=Object.freeze({
  deer:Object.freeze({label:'Cerf',description:'Broute dans les clairières et fuit les humains. N’attaque jamais.',hp:54,speed:98,fleeSpeed:178,territorial:false,territoryRadius:165,food:12}),
  rabbit:Object.freeze({label:'Lièvre',description:'Petit animal craintif, rapide et paisible.',hp:18,speed:112,fleeSpeed:195,territorial:false,territoryRadius:110,food:3}),
  boar:Object.freeze({label:'Sanglier',description:'Vit en forêt reculée. Prévient, puis défend uniquement son territoire.',hp:96,speed:86,fleeSpeed:136,territorial:true,territoryRadius:175,damage:12,attackRange:43,attackInterval:1.65,food:14}),
  wolf:Object.freeze({label:'Loup',description:'Protège sa tanière loin des habitations ; cesse la poursuite quand vous partez.',hp:72,speed:132,fleeSpeed:158,territorial:true,territoryRadius:235,damage:9,attackRange:40,attackInterval:1.35,food:0})
});
export const WILDLIFE_TYPES=WILDLIFE_SPECIES;
const TAU=Math.PI*2;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const setState=(a,state)=>{a.state=state;a.behavior=state;};
const random=a=>{a.seed=(Math.imul(a.seed,1664525)+1013904223)>>>0;return a.seed/4294967296;};
const habitat=FOREST_TREES.filter((_,i)=>i%13===0).map(t=>({x:clamp(t.x+42,WORLD.minX+100,WORLD.maxX-100),y:clamp(t.y+24,WORLD.minY+100,WORLD.maxY-100)}));
const treeIds=new Map(FOREST_TREES.map((t,i)=>[t,i]));
const intact=b=>!b.destroyed&&b.hp>0;
function footprint(b){
  const d=BUILDINGS[b.type]||{width:100,depth:100},rotated=Math.abs(Math.sin(b.rotation||0))>.5;
  const w=b.width||d.width,h=b.depth||d.depth;
  return{x:b.x,y:b.y,halfW:(rotated?h:w)/2,halfD:(rotated?w:h)/2};
}
function distanceFromBuilding(p,b){const r=footprint(b);return Math.hypot(Math.max(0,Math.abs(p.x-r.x)-r.halfW),Math.max(0,Math.abs(p.y-r.y)-r.halfD));}
function safeTerritory(p,radius,buildings){return buildings.every(b=>!intact(b)||!b.complete||distanceFromBuilding(p,b)>radius+420);}
function anchorNear(point,radius,buildings,offset=0){
  let best=null,score=Infinity;
  for(let i=0;i<habitat.length;i++){
    const candidate=habitat[(i+offset)%habitat.length];
    if(!safeTerritory(candidate,radius,buildings))continue;
    const d=dist(candidate,point);
    if(d<score){score=d;best=candidate;}
  }
  return best;
}
export function createWildlife(seed=1){
  const rng={seed:(Number(seed)^0x6b539ad1)>>>0},animals=[],used=[];
  const kinds=[...Array(12).fill('deer'),...Array(12).fill('rabbit'),...Array(4).fill('boar'),...Array(4).fill('wolf')];
  kinds.forEach((kind,i)=>{
    const def=WILDLIFE_SPECIES[kind],angle=(i*.61803398875+random(rng)*.12)*TAU;
    // A few peaceful animals introduce the living forest on the first outing.
    // Territorial species start much deeper in the woods.
    const range=def.territorial?1450+random(rng)*1450:i<5?620+random(rng)*450:1050+random(rng)*1800;
    const point={x:HOME.x+Math.sin(angle)*range,y:HOME.y+Math.cos(angle)*range};
    const options=habitat.filter(p=>dist(p,HOME)>(def.territorial?1100:550)&&used.every(other=>dist(p,other)>140));
    const home=options.reduce((best,p)=>!best||dist(p,point)<dist(best,point)?p:best,null)||habitat[i%habitat.length];
    used.push(home);
    animals.push({id:'wildlife-'+i,kind,label:def.label,x:home.x,y:home.y,homeX:home.x,homeY:home.y,
      hp:def.hp,maxHp:def.hp,speed:def.speed,territorial:def.territorial,territoryRadius:def.territoryRadius,
      aim:random(rng)*TAU,state:'grazing',behavior:'grazing',targetId:null,targetKind:null,
      cool:0,attackPulse:0,hitFlash:0,clock:0,seed:(rng.seed^Math.imul(i+1,2654435761))>>>0,
      wanderTimer:.2+random(rng)*3,safetyTimer:.3+random(rng)*.7,warningTime:0,provokedUntil:0,
      homeSafe:true,relocating:false,distantTime:0,noticeCool:0});
  });
  return animals;
}
function people(s){
  const result=[];
  if(s.king&&s.king.hp>0)result.push({person:s.king,id:'king',kind:'king'});
  for(const person of s.allies||[])if((person.hp??1)>0&&!person.hidden&&!person.sheltered)result.push({person,id:person.id,kind:'resident'});
  return result;
}
function walk(s,a,target,speed,dt,stop=0){
  const d=dist(a,target);if(d<=stop)return;
  const step=Math.min(d-stop,speed*dt);a.aim=Math.atan2(target.x-a.x,target.y-a.y);
  a.x+=(target.x-a.x)/d*step;a.y+=(target.y-a.y)/d*step;
  // Animals navigate around trunks, rather than walking through the forest.
  for(const tree of nearbyTrees(a.x,a.y)){
    if(s.harvested?.includes(treeIds.get(tree)))continue;
    const dx=a.x-tree.x,dy=a.y-tree.y,distance=Math.hypot(dx,dy),radius=(a.kind==='rabbit'?6:12)+tree.size*9;
    if(distance<radius){a.x=tree.x+(distance?dx/distance:1)*radius;a.y=tree.y+(distance?dy/distance:0)*radius;}
  }
  for(const b of s.buildings||[]){
    if(!intact(b))continue;
    const r=footprint(b),radius=a.kind==='rabbit'?6:13,left=r.x-r.halfW-radius,right=r.x+r.halfW+radius,top=r.y-r.halfD-radius,bottom=r.y+r.halfD+radius;
    if(a.x<=left||a.x>=right||a.y<=top||a.y>=bottom)continue;
    const edges=[a.x-left,right-a.x,a.y-top,bottom-a.y],i=edges.indexOf(Math.min(...edges));
    if(i===0)a.x=left;else if(i===1)a.x=right;else if(i===2)a.y=top;else a.y=bottom;
  }
  a.x=clamp(a.x,WORLD.minX+45,WORLD.maxX-45);a.y=clamp(a.y,WORLD.minY+45,WORLD.maxY-45);
}
function lineBlocked(s,a,p){
  for(const b of s.buildings||[]){
    if(!intact(b))continue;
    const r=footprint(b),dx=p.x-a.x,dy=p.y-a.y;let lo=0,hi=1;
    for(const [origin,direction,min,max]of [[a.x,dx,r.x-r.halfW,r.x+r.halfW],[a.y,dy,r.y-r.halfD,r.y+r.halfD]]){
      if(Math.abs(direction)<1e-9){if(origin<min||origin>max){lo=2;break;}}
      else{const first=(min-origin)/direction,second=(max-origin)/direction;lo=Math.max(lo,Math.min(first,second));hi=Math.min(hi,Math.max(first,second));}
    }
    if(lo<=hi&&hi>=0&&lo<=1)return true;
  }
  return false;
}
function notify(s,text){if(!s.events)return;s.events.push(text);if(s.events.length>12)s.events.shift();}
function relocate(s,a){
  const home={x:a.homeX,y:a.homeY};
  a.homeSafe=safeTerritory(home,a.territoryRadius,s.buildings||[]);
  if(a.homeSafe)return;
  const next=anchorNear(a,a.territoryRadius,s.buildings||[],Number(a.id.replace(/\D/g,''))||0);
  a.targetId=null;a.targetKind=null;a.warningTime=0;a.provokedUntil=0;a.relocating=true;setState(a,'returning');
  if(next){a.homeX=next.x;a.homeY=next.y;a.homeSafe=true;}
}
function roam(s,a,dt){
  a.wanderTimer-=dt;
  if(a.wanderTimer<=0||!a.wanderTarget){
    a.wanderTimer=2.8+random(a)*5;
    const angle=random(a)*TAU,radius=(.12+random(a)*.58)*a.territoryRadius;
    a.wanderTarget={x:a.homeX+Math.sin(angle)*radius,y:a.homeY+Math.cos(angle)*radius};
    a.resting=random(a)<.38;
  }
  if(a.resting){setState(a,'grazing');return;}
  setState(a,'wandering');walk(s,a,a.wanderTarget,a.speed*.32,dt,8);
}
export function hitWildlife(s,animal,damage,attacker=s.king){
  if(!animal||!(animal.hp>0)||!Number.isFinite(damage)||damage<=0)return false;
  animal.hp=Math.max(0,animal.hp-damage);animal.hitFlash=.25;
  animal.provokedUntil=animal.clock+7;animal.provokerId=attacker===s.king?'king':attacker?.id;
  animal.fearSource=attacker?{x:attacker.x,y:attacker.y}:null;
  animal.wanderTimer=0;
  return true;
}
export function wildlifeThreats(s,person,maxDistance=260){
  return(s.wildlife||[]).filter(a=>a.hp>0&&a.state==='defending'&&dist(a,person)<maxDistance&&(a.targetId===(person===s.king?'king':person.id)||dist(a,person)<70));
}
function tickAnimal(s,a,dt,humans,services){
  const def=WILDLIFE_SPECIES[a.kind];if(!def)return;
  a.cool=Math.max(0,a.cool-dt);a.attackPulse=Math.max(0,a.attackPulse-dt);a.hitFlash=Math.max(0,a.hitFlash-dt);a.noticeCool=Math.max(0,(a.noticeCool||0)-dt);
  a.safetyTimer-=dt;
  if(a.territorial&&a.safetyTimer<=0){a.safetyTimer=1;relocate(s,a);}
  const home={x:a.homeX,y:a.homeY};
  if(a.territorial&&(!a.homeSafe||a.relocating)){
    a.targetId=null;a.targetKind=null;setState(a,'returning');
    if(dist(a,home)>35)walk(s,a,home,def.fleeSpeed,dt,25);else if(a.homeSafe)a.relocating=false;
    return;
  }
  let nearest=null,best=Infinity;
  for(const entry of humans){const d=dist(a,entry.person);if(d<best){best=d;nearest=entry;}}
  if(!a.territorial){
    const frightened=best<(a.kind==='rabbit'?130:105)||(a.provokedUntil>a.clock&&a.fearSource);
    a.targetId=null;a.targetKind=null;
    if(frightened){
      const source=nearest?.person||a.fearSource,dx=a.x-source.x,dy=a.y-source.y,n=Math.hypot(dx,dy)||1;
      setState(a,'fleeing');walk(s,a,{x:a.x+dx/n*120,y:a.y+dy/n*120},def.fleeSpeed,dt);
      if(dist(a,home)>a.territoryRadius*2.5){a.homeX=a.x;a.homeY=a.y;}
    }else if(dist(a,home)>a.territoryRadius){setState(a,'returning');walk(s,a,home,def.speed*.65,dt,35);}
    else roam(s,a,dt);
    return;
  }
  // Presence at a den, rather than general proximity to an animal, creates a
  // threat. Leaving this circle immediately ends pursuit and attack intent.
  let intruder=null,score=Infinity;
  for(const entry of humans){
    if(dist(entry.person,home)>a.territoryRadius)continue;
    if((s.buildings||[]).some(b=>intact(b)&&b.complete&&distanceFromBuilding(entry.person,b)<300))continue;
    const d=dist(a,entry.person);if(d<score){intruder=entry;score=d;}
  }
  if(!intruder||dist(a,home)>a.territoryRadius+28){
    a.targetId=null;a.targetKind=null;a.warningTime=0;
    if(dist(a,home)>a.territoryRadius*.8||a.state==='defending'||a.state==='warning'){
      setState(a,'returning');walk(s,a,home,def.speed*.85,dt,35);
    }else roam(s,a,dt);
    return;
  }
  a.targetId=intruder.id;a.targetKind=intruder.kind;a.aim=Math.atan2(intruder.person.x-a.x,intruder.person.y-a.y);
  a.warningTime+=dt;
  if(a.warningTime<1.35&&a.provokedUntil<=a.clock){
    if(a.state!=='warning'&&intruder.kind==='king'&&a.noticeCool<=0){notify(s,'Territoire sauvage : ce '+def.label.toLowerCase()+' protège ses terres. Éloignez-vous pour éviter le combat.');a.noticeCool=12;}
    setState(a,'warning');return;
  }
  setState(a,'defending');
  if(!lineBlocked(s,a,intruder.person)){
    walk(s,a,intruder.person,def.speed,dt,def.attackRange*.75);
    if(dist(a,intruder.person)<=def.attackRange&&a.cool<=0){
      a.cool=def.attackInterval;a.attackPulse=.3;
      if(intruder.kind==='king'){
        if(services.hurtHero)services.hurtHero(s,def.damage);
        else if(!(s.king.invulnerable>0)){s.king.hp=Math.max(0,s.king.hp-def.damage);s.king.hitFlash=.3;s.king.invulnerable=.65;}
      }else{
        const p=intruder.person;p.maxHp??=85;p.hp=Math.max(0,(p.hp??p.maxHp)-def.damage);p.hitFlash=.3;
        p.lastAttackerId=a.id;p.motivation=Math.max(0,(p.motivation??80)-1);
      }
    }
  }
}
export function stepWildlife(s,dt,services={}){
  if(!Number.isFinite(dt)||dt<=0||s.over||!s.wildlife)return;
  const humans=people(s);
  for(const a of s.wildlife){
    if(!(a.hp>0))continue;a.clock=(a.clock||0)+dt;
    // Distant passive motion is updated at 2 Hz; close encounters retain the
    // simulation's normal rate. No meshes or timers are allocated per frame.
    const active=humans.some(p=>dist(a,p.person)<850)||a.state==='defending'||a.state==='warning'||a.relocating;
    if(!active){a.distantTime=(a.distantTime||0)+dt;if(a.distantTime<.5)continue;const elapsed=a.distantTime;a.distantTime=0;tickAnimal(s,a,elapsed,humans,services);}
    else{const elapsed=dt+(a.distantTime||0);a.distantTime=0;tickAnimal(s,a,elapsed,humans,services);}
  }
  s.wildlife=s.wildlife.filter(a=>{
    if(a.hp>0)return true;
    const food=WILDLIFE_SPECIES[a.kind]?.food||0;
    if(food&&s.resources)s.resources.food=(s.resources.food||0)+food;
    s.hunts=(s.hunts||0)+1;
    if(a.targetId==='king'||a.provokerId==='king')notify(s,food?'Un '+a.label.toLowerCase()+' a été abattu. +'+food+' nourriture.':'Le loup est abattu. Les autres animaux gardent leur territoire.');
    return false;
  });
}
