import {HOME,WORLD,HORSE_START,RESCUE_SITES,LANDMARKS,DISCOVERY_SITES,FOREST_TREES,nearbyTrees} from './world-data.js';
import {JOBS,BUILDINGS,TECHS,RESOURCE_NODES,DEFAULT_APPEARANCE,RESOURCE_LABELS} from './kingdom-data.js';
import {HERO_UNLOCKS,RELICS} from './progression-data.js';
export {JOBS,BUILDINGS,TECHS,HERO_UNLOCKS,RELICS};
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const RIVALS=['la Ligue des Cendres','le duché des Ronces','la Couronne carmin'];
export function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
const ok=text=>({ok:true,text}),fail=text=>({ok:false,text});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const event=(s,text)=>{s.events.push(text);if(s.events.length>12)s.events.shift();};
const names=['Éloi','Alix','Maël','Léa','Basile','Nora','Hugo','Ysée','Gaspard','Rose','Soren','Mila'];
const treeIds=new Map(FOREST_TREES.map((tree,i)=>[tree,i]));
export const xpForLevel=(level,hero=false)=>(hero?50:100)*(level-1)*level/2;
function levelFromXP(xp,hero=false){let level=1;while(level<30&&xp>=xpForLevel(level+1,hero))level++;return level;}
function heroMaximum(s){return 100+Math.max(0,s.king.heroLevel-1)*8+(s.relics?.includes('verdant-heart')?20:0);}
function gainXP(s,amount,hero=false){
  if(hero){
    const old=s.king.heroLevel;s.king.xp+=amount;s.king.heroLevel=Math.max(old,levelFromXP(s.king.xp,true));
    if(s.king.heroLevel>old){
      s.king.maxHp=heroMaximum(s);s.king.hp=s.king.maxHp;s.king.levelUpPulse=1.2;
      for(let level=old+1;level<=s.king.heroLevel;level++){
        const unlock=HERO_UNLOCKS.find(u=>u.level===level);
        event(s,'Niveau '+level+' ! '+(unlock?unlock.title+' : '+unlock.description:'Votre expérience renforce votre royaume.'));
      }
    }
  }else{const old=s.kingdomLevel;s.xp+=amount;s.kingdomLevel=levelFromXP(s.xp);if(s.kingdomLevel>old)event(s,'Le royaume atteint le niveau '+s.kingdomLevel+' !');}
}
export function progressionState(s){
  const level=s.king.heroLevel;
  return{unlocks:HERO_UNLOCKS.map(u=>({...u,unlocked:level>=u.level})),nextUnlock:HERO_UNLOCKS.find(u=>u.level>level)||null,
    abilities:{dash:{unlocked:level>=2,cooldown:s.king.dashCool||0,ready:level>=2&&!(s.king.dashCool>0)&&!s.king.mounted},power:{unlocked:level>=3,cooldown:s.king.powerCool||0,ready:level>=3&&!(s.king.powerCool>0)}},
    discoveries:{known:s.discoveries.filter(d=>d.known).length,cleared:s.discoveries.filter(d=>d.rewardClaimed).length,total:s.discoveries.length},
    relics:(s.relics||[]).map(id=>({id,...RELICS[id]}))};
}
function residentXP(p,amount){p.xp+=amount;p.level=1+Math.floor(Math.sqrt(p.xp/80));}
export function population(s){return s.allies.length;}
function pending(s,source){return source==='rescued'?s.followers.length:source==='natural'?s.caravans.length:0;}
function reservations(s){return s.followers.length+s.caravans.length;}
export function quotas(s){return{natural:Math.floor(s.capacity*.2),hired:Math.floor(s.capacity*.3),rescued:s.capacity-Math.floor(s.capacity*.2)-Math.floor(s.capacity*.3)};}
export function costs(s){return{recruit:25+s.counts.hired*10,fortify:80+s.fort*60,upgrade:35+(s.level-1)*25};}
function activeBuildings(s,type){return s.buildings.filter(b=>b.type===type&&b.complete&&!b.destroyed&&b.hp>0);}
function recalculateCapacity(s){s.capacity=s.buildings.reduce((sum,b)=>sum+(b.complete&&!b.destroyed&&b.hp>0?(BUILDINGS[b.type]?.housing||0)*b.level:0),0);s.fort=Math.max(0,(s.buildings.find(b=>b.isRefuge)?.level||1)-1);}
export function createGame(seed=Date.now()>>>0){
  const refuge={id:'refuge',type:'house',isRefuge:true,x:HOME.x,y:HOME.y,rotation:0,width:190,depth:150,level:1,progress:0,work:0,complete:true,hp:160,maxHp:160};
  return{seed,kingdomName:'Valdoria',relics:[],gold:140,hp:160,maxHp:160,wave:0,day:1,level:1,fort:0,capacity:10,kills:0,xp:0,kingdomLevel:1,
    king:{x:500,y:400,cool:0,mounted:false,aim:0,weapon:'bow',axeCool:0,axeSwing:0,xp:0,heroLevel:1,hp:100,maxHp:100,hitFlash:0,invulnerable:0,target:null,targetTTL:0,attackPulse:0,attackKind:'normal',dashCool:0,dashTime:0,dashDirection:{x:0,y:1},powerCool:0,powerTime:0,levelUpPulse:0,appearance:{...DEFAULT_APPEARANCE}},horse:{...HORSE_START,aim:0},
    resources:{wood:140,stone:110,food:120,iron:25,weapons:2,knowledge:0},resourceNodes:RESOURCE_NODES.map(p=>({...p})),
    buildings:[refuge],nextBuildingId:1,nextCitizenId:0,nextEscortId:0,refugeeRefreshTimer:45,harvested:[],treeHealth:{},tech:[],research:null,
    payroll:{enabled:false,interval:60,timer:60,wage:2,lastPaid:0,due:0,totalPaid:0,arrears:0},
    allies:[],enemies:[],arrows:[],coins:[],particles:[],followers:[],caravans:[],counts:{natural:0,hired:0,rescued:0},
    camps:RESCUE_SITES.map((p,i)=>({...p,rescued:false,known:i===0,visits:0,nextRefugeeAt:0})),landmarks:LANDMARKS.map(p=>({...p,known:false,looted:false})),
    discoveries:DISCOVERY_SITES.map(p=>({...p,reward:{...p.reward},known:false,triggered:false,cleared:false,rewardClaimed:false})),
    phase:'peace',phaseRemaining:120,spawn:0,left:0,arrivalTimer:65,income:0,time:0,explored:[],exploredKey:'',
    rival:RIVALS[0],over:false,milestone:0,events:[]};
}
export function customizeKing(s,appearance){
  if(!appearance||typeof appearance!=='object')return fail('Personnalisation invalide.');
  const next={...s.king.appearance};
  if(appearance.name!==undefined){const value=String(appearance.name).replace(/[<>\x00-\x1f]/g,'').trim().slice(0,24);if(!value)return fail('Choisissez un nom pour votre roi.');next.name=value;}
  for(const key of ['cape','hair','skin'])if(appearance[key]!==undefined){if(!/^#[0-9a-f]{6}$/i.test(appearance[key]))return fail('Couleur invalide.');next[key]=appearance[key];}
  if(appearance.beard!==undefined){if(!['none','short','long'].includes(appearance.beard))return fail('Style de barbe invalide.');next.beard=appearance.beard;}
  if(appearance.crown!==undefined){if(!['classic','spiked'].includes(appearance.crown))return fail('Couronne invalide.');next.crown=appearance.crown;}
  const styles={outfit:['royal','ranger','warden'],emblem:['sun','stag','moon'],hairStyle:['swept','braids','short'],mountCoat:['chestnut','ivory','night'],eye:['#54737b','#6c874c','#a27042','#7470a2']};
  for(const [key,values]of Object.entries(styles))if(appearance[key]!==undefined){if(!values.includes(appearance[key]))return fail('Personnalisation inconnue : '+key+'.');next[key]=appearance[key];}
  s.king.appearance=next;return ok('Votre roi est prêt à relever le royaume.');
}
export function customizeKingdom(s,name){
  if(typeof name!=='string')return fail('Choisissez un nom pour votre royaume.');
  const value=name.replace(/[<>\x00-\x1f]/g,'').trim().slice(0,24);
  if(!value)return fail('Choisissez un nom pour votre royaume.');
  s.kingdomName=value;return ok('Bienvenue au royaume de '+value+'.');
}
export function addResident(s,source,reserved=false){
  recalculateCapacity(s);
  if(!Object.hasOwn(s.counts,source))return false;
  if(reserved&&pending(s,source)===0)return false;
  const remainingReservations=reservations(s)-(reserved?1:0);
  if(population(s)+remainingReservations>=s.capacity||s.counts[source]+pending(s,source)-(reserved?1:0)>=quotas(s)[source])return false;
  const id=s.nextCitizenId++,i=s.allies.length;
  s.counts[source]++;
  s.allies.push({id:'citizen-'+id,name:names[id%names.length]+(id>=names.length?' '+(1+Math.floor(id/names.length)):''),source,job:'unassigned',role:'survivor',x:HOME.x-135+(i%6)*50,y:HOME.y+110+Math.floor(i/6)*40,cool:0,workPhase:id,xp:0,level:1,motivation:80,wage:s.payroll.wage,equipped:false,equipmentDurability:0,workTimer:0,workCycles:0,leaveTimer:0,workStatus:'Métier à choisir'});
  gainXP(s,20);return true;
}
export function assignJob(s,id,job){
  const p=s.allies.find(p=>p.id===id);if(!p)return fail('Habitant introuvable.');
  if(job!=='unassigned'&&!JOBS[job])return fail('Métier inconnu.');
  if(job==='inventor'&&(s.kingdomLevel<4||!activeBuildings(s,'academy').length))return fail('L’inventeur exige le niveau 4 du royaume et une académie achevée.');
  if(p.job===job)return ok('Ce métier est déjà attribué.');
  p.job=job;p.role=job==='unassigned'?'survivor':job;p.workTimer=0;p.target=null;p.workStatus=job==='unassigned'?'Métier à choisir':'En poste';
  if(job==='knight'&&!p.equipped&&s.resources.weapons>=1){s.resources.weapons--;p.equipped=true;p.equipmentDurability=100;}
  return ok(p.name+' devient '+(JOBS[job]?.label.toLowerCase()||'sans métier')+'.');
}
export function setWage(s,amount){const wage=Number(amount);if(!Number.isInteger(wage)||wage<1||wage>20)return fail('Le salaire doit être compris entre 1 et 20 pièces par période.');s.payroll.wage=wage;for(const p of s.allies)p.wage=wage;return ok('Salaire fixé à '+wage+' pièces par habitant actif et par minute.');}
export function setWeapon(s,weapon){if(!['bow','axe'].includes(weapon))return fail('Arme inconnue.');s.king.weapon=weapon;return ok(weapon==='axe'?'Hache équipée : cliquez ou touchez le terrain pour choisir où frapper.':'Arc équipé : cliquez ou touchez le terrain pour choisir votre cible et tirer.');}
function affordability(s,cost){for(const [key,n]of Object.entries(cost)){const value=key==='gold'?s.gold:s.resources[key]||0;if(value<n)return fail('Il manque '+Math.ceil(n-value)+' '+(key==='gold'?'pièces':RESOURCE_LABELS[key]||key)+'.');}return ok('Ressources disponibles.');}
function spend(s,cost){for(const [key,n]of Object.entries(cost))if(key==='gold')s.gold-=n;else s.resources[key]-=n;}
function rectangle(type,x,y,rotation=0,building=null){const def=BUILDINGS[type],swap=Math.abs(Math.sin(rotation))>.5,w=building?.width||def.width,d=building?.depth||def.depth;return{x,y,halfW:(swap?d:w)/2,halfD:(swap?w:d)/2};}
function insideRect(p,r,padding=0){return Math.abs(p.x-r.x)<r.halfW+padding&&Math.abs(p.y-r.y)<r.halfD+padding;}
function rectDistance(p,r){return Math.hypot(Math.max(0,Math.abs(p.x-r.x)-r.halfW),Math.max(0,Math.abs(p.y-r.y)-r.halfD));}
export function placementStatus(s,type,x,y,rotation=0){
  if(!BUILDINGS[type]||![x,y,rotation].every(Number.isFinite))return fail('Placement invalide.');
  if(s.over)return fail('Le refuge est tombé.');if(s.phase!=='peace')return fail('Construisez pendant une accalmie.');
  const def=BUILDINGS[type];if(s.kingdomLevel<def.unlockLevel)return fail('Ce bâtiment exige le niveau '+def.unlockLevel+' du royaume.');
  const r=rectangle(type,x,y,rotation);
  if(x-r.halfW<WORLD.minX+35||x+r.halfW>WORLD.maxX-35||y-r.halfD<WORLD.minY+35||y+r.halfD>WORLD.maxY-35)return fail('Le bâtiment dépasse les limites de la région.');
  for(const b of s.buildings){if(b.destroyed)continue;const o=rectangle(b.type,b.x,b.y,b.rotation,b),gap=type==='wall'&&b.type==='wall'?0:14;if(Math.abs(x-b.x)<r.halfW+o.halfW+gap&&Math.abs(y-b.y)<r.halfD+o.halfD+gap)return fail('Cet emplacement recouvre un bâtiment ou un chantier.');}
  if(insideRect(s.king,r,23)||insideRect(s.horse,r,25))return fail('Éloignez le roi ou son cheval de l’emplacement.');
  for(const n of s.resourceNodes)if(rectDistance(n,r)<45)return fail('Laissez ce gisement accessible aux ouvriers.');
  for(const c of [...s.camps,...s.landmarks])if(rectDistance(c,r)<65)return fail('Laissez libre ce camp ou ces vestiges.');
  for(const d of s.discoveries)if(rectDistance(d,r)<110)return fail('Laissez l’entrée et les abords de ce lieu mystérieux accessibles.');
  for(const t of nearbyTrees(x,y))if(!s.harvested.includes(treeIds.get(t))&&rectDistance(t,r)<10*t.size)return fail('Un arbre gêne le chantier : dégagez-le à la hache.');
  return affordability(s,def.cost);
}
export function placeBuilding(s,type,x,y,rotation=0){
  const check=placementStatus(s,type,x,y,rotation);if(!check.ok)return check;
  const def=BUILDINGS[type],angle=Math.round(rotation/(Math.PI/2))*(Math.PI/2);
  // Revalidate the snapped footprint before spending anything.
  const snapped=placementStatus(s,type,x,y,angle);if(!snapped.ok)return snapped;
  spend(s,def.cost);const hp=Math.round((type==='wall'?190:150)*(s.tech.includes('architecture')?1.25:1));
  const b={id:'building-'+s.nextBuildingId++,type,x,y,rotation:angle,level:1,progress:0,work:def.work,complete:false,hp,maxHp:hp};s.buildings.push(b);
  return{...ok(def.label+' placé : '+(s.allies.some(p=>p.job==='builder')?'vos constructeurs vont réaliser le chantier.':'affectez un constructeur pour commencer.')),id:b.id,building:b};
}
export function upgradeBuilding(s,id){
  const b=s.buildings.find(b=>b.id===id);if(!b||b.destroyed)return fail('Bâtiment introuvable.');
  if(s.phase!=='peace')return fail('Attendez la fin de l’attaque.');
  if(!b.complete||b.upgrading)return fail('Terminez le chantier en cours.');
  const def=BUILDINGS[b.type];if(b.level>=def.maxLevel)return fail('Ce bâtiment a atteint son niveau maximal.');
  const cost=Object.fromEntries(Object.entries(def.cost).map(([key,n])=>[key,Math.ceil(n*(.8+b.level*.45))]));
  const check=affordability(s,cost);if(!check.ok)return check;spend(s,cost);
  b.upgrading=true;b.upgradeProgress=0;b.upgradeWork=Math.ceil(def.work*(1+b.level*.55));
  return ok('Amélioration planifiée : les constructeurs doivent terminer les travaux.');
}
export function demolishBuilding(s,id){
  const b=s.buildings.find(b=>b.id===id);
  if(!b||b.destroyed)return fail('Ce bâtiment est déjà retiré ou introuvable.');
  if(b.isRefuge)return fail('Le refuge royal ne peut pas être retiré.');
  if(s.over)return fail('Le refuge est tombé.');
  const def=BUILDINGS[b.type],refund=Object.fromEntries(Object.entries(def.cost).map(([key,n])=>[key,Math.floor(n*.5)]));
  for(const [key,n]of Object.entries(refund))if(key==='gold')s.gold+=n;else s.resources[key]=(s.resources[key]||0)+n;
  b.destroyed=true;b.demolished=true;b.complete=false;b.upgrading=false;b.hp=0;recalculateCapacity(s);
  const housingWarning=population(s)+reservations(s)>s.capacity?' Attention : les logements restants ne suffisent plus à tous les habitants et arrivées.':'';
  return{...ok(def.label+' retiré. Récupération de 50 % du coût initial, arrondi à l’inférieur ; les améliorations ne sont pas remboursées. Capacité : '+s.capacity+' habitants.'+housingWarning),refund};
}
export function research(s,key){
  const def=TECHS[key];if(!def)return fail('Recherche inconnue.');
  if(s.kingdomLevel<4||!activeBuildings(s,'academy').length)return fail('Les recherches exigent un royaume de niveau 4 et une académie.');
  if(s.tech.includes(key))return fail('Cette technologie est déjà connue.');if(s.research)return fail('Une recherche est déjà en cours.');
  if(!s.allies.some(p=>p.job==='inventor'))return fail('Affectez un inventeur à l’académie.');
  const check=affordability(s,def.cost);if(!check.ok)return check;spend(s,def.cost);s.research={key,progress:0,work:def.work};return ok('Recherche lancée : '+def.label+'.');
}
export function buy(s,kind){
  if(s.over)return fail('Le refuge est tombé.');if(distance(s.king,HOME)>210)return fail('Revenez au refuge pour gérer votre royaume.');if(s.phase!=='peace')return fail('Attendez la fin de l’attaque.');
  if(kind==='fortify')return upgradeBuilding(s,'refuge');
  if(!['recruit','upgrade'].includes(kind))return fail('Action inconnue.');
  if(kind==='recruit'&&s.counts.rescued<1)return fail('Ramenez d’abord un survivant pour faire renaître le refuge.');
  const price=costs(s)[kind];if(s.gold<price)return fail('Il manque des pièces.');
  if(kind==='recruit'&&!addResident(s,'hired'))return fail('Aucune place disponible pour un engagement. Construisez des logements.');
  if(kind==='upgrade')s.level++;s.gold-=price;
  return ok(kind==='recruit'?'Un habitant engagé est arrivé. Choisissez son métier.':'L’arc royal est amélioré.');
}
function treeAvailable(s,tree){return !s.harvested.includes(treeIds.get(tree));}
function chop(s,index,power=1,hero=false){
  const tree=FOREST_TREES[index];if(!tree||s.harvested.includes(index))return false;
  const remaining=(s.treeHealth[index]??3)-power;s.treeHealth[index]=remaining;s.resources.wood+=3;
  if(hero)gainXP(s,5,true);
  if(remaining<=0){s.harvested.push(index);s.resources.wood+=Math.round(14+tree.size*6);gainXP(s,5);if(hero)gainXP(s,15,true);}
  return true;
}
export function setTarget(s,x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<WORLD.minX||x>WORLD.maxX||y<WORLD.minY||y>WORLD.maxY)return fail('Choisissez une cible sur le terrain.');
  if(Math.hypot(x-s.king.x,y-s.king.y)<1)return fail('Visez devant votre roi.');
  s.king.target={x,y};s.king.targetTTL=2.5;s.king.aim=Math.atan2(x-s.king.x,y-s.king.y);return ok('Cible choisie.');
}
function inAttackArc(s,p,range,dot=.25){
  const dx=p.x-s.king.x,dy=p.y-s.king.y,d=Math.hypot(dx,dy);
  return d<range&&(d<1||(dx*Math.sin(s.king.aim)+dy*Math.cos(s.king.aim))/d>=dot);
}
function axeStrike(s,power=false){
  const k=s.king;if(k.axeCool>0)return fail('La hache reprend son élan.');
  k.axeCool=power?.7:.55;k.axeSwing=.32;k.attackPulse=.24;k.attackKind=power?'power':'normal';
  const range=power?128:88,dot=power?-.12:.25,damage=(36+k.heroLevel*4)*(s.tech.includes('weaponry')?1.25:1)*(power?1.9:1);
  const targets=s.enemies.filter(e=>e.hp>0&&inAttackArc(s,e,range,dot));
  for(const e of targets)e.hp-=damage;
  const trees=nearbyTrees(k.x,k.y).filter(t=>treeAvailable(s,t)&&inAttackArc(s,t,range,dot)).sort((a,b)=>distance(a,k)-distance(b,k));
  let chopped=false;for(const tree of trees.slice(0,power?3:1))chopped=chop(s,treeIds.get(tree),power?3:1,true)||chopped;
  return ok(targets.length?'Coup de hache !':chopped?(power?'La frappe royale abat les arbres dans son arc !':'Du bois rejoint les réserves. Visez encore l’arbre pour l’abattre.'):'Coup de hache : approchez et visez un arbre ou un ennemi.');
}
function fireArrow(s,power=false){
  const k=s.king;if(k.cool>0)return fail('L’arc reprend son élan.');
  k.cool=Math.max(.25,.62-s.level*.04);k.attackPulse=.24;k.attackKind=power?'power':'normal';
  const speed=power?760:620,range=power?900:560;
  s.arrows.push({x:k.x,y:k.y,vx:Math.sin(k.aim)*speed,vy:Math.cos(k.aim)*speed,life:range/speed,
    damage:(24+s.level*10+(k.heroLevel-1)*2)*(s.tech.includes('weaponry')?1.25:1)*(power?1.9:1),height:k.mounted?1.9:1,
    pierce:power?(k.heroLevel>=5?4:2):1,hitTargets:[],power,owner:'king'});
  return ok(power?'Le tir royal traverse ses cibles !':'Flèche décochée.');
}
export function attackAt(s,x,y){
  if(s.over)return fail('Le refuge est tombé.');
  const target=setTarget(s,x,y);if(!target.ok)return target;
  return s.king.weapon==='axe'?axeStrike(s,false):fireArrow(s,false);
}
export function useAxe(s){
  if(s.over)return fail('Le refuge est tombé.');if(s.king.weapon!=='axe')return fail('Équipez la hache avant de frapper.');
  if(!s.king.target)return fail('Choisissez une cible sur le terrain.');
  s.king.aim=Math.atan2(s.king.target.x-s.king.x,s.king.target.y-s.king.y);
  return axeStrike(s,false);
}
export function useDash(s,input={}){
  const k=s.king;if(s.over)return fail('Le refuge est tombé.');if(k.heroLevel<2)return fail('L’Élan se débloque au niveau 2 du roi.');
  if(k.mounted)return fail('Descendez du cheval pour esquiver.');if(k.dashCool>0)return fail('L’Élan se recharge.');
  if(!input||typeof input!=='object'||[input.x,input.y].some(v=>v!==undefined&&!Number.isFinite(v)))return fail('Direction d’Élan invalide.');
  let x=input.x||0,y=input.y||0;
  if(!x&&!y){x=k.target?k.target.x-k.x:Math.sin(k.aim);y=k.target?k.target.y-k.y:Math.cos(k.aim);}
  const length=Math.hypot(x,y)||1;k.dashDirection={x:x/length,y:y/length};k.aim=Math.atan2(x,y);
  k.dashCool=k.heroLevel>=5?3:4;k.dashTime=.22;k.invulnerable=Math.max(k.invulnerable||0,.3);return ok('Élan royal !');
}
export function usePowerAttack(s,x=s.king.target?.x,y=s.king.target?.y){
  const k=s.king;if(s.over)return fail('Le refuge est tombé.');if(k.heroLevel<3)return fail('La frappe royale se débloque au niveau 3 du roi.');
  if(k.powerCool>0)return fail('La frappe royale se recharge.');
  if(x===undefined||y===undefined)return fail('Choisissez une cible sur le terrain.');
  if(!Number.isFinite(x)||!Number.isFinite(y))return fail('Choisissez une cible valide pour la frappe royale.');
  const target=setTarget(s,x,y);if(!target.ok)return target;
  const result=k.weapon==='axe'?axeStrike(s,true):fireArrow(s,true);if(!result.ok)return result;
  k.powerCool=(k.heroLevel>=5?7:8)-(s.relics.includes('storm-sigil')?2:0);k.powerTime=.42;return result;
}
export function interaction(s){
  if(s.over)return null;if(s.king.mounted)return{type:'dismount',text:'Descendre du cheval'};
  const candidates=[];if(distance(s.king,s.horse)<85)candidates.push({type:'mount',text:'Monter à cheval',d:distance(s.king,s.horse)});
  for(const d of s.discoveries)if(!d.rewardClaimed&&distance(s.king,d)<85)candidates.push({type:'discovery',id:d.id,text:d.cleared?'Ouvrir le coffre ancien':d.triggered?'Vaincre les gardiens':s.king.heroLevel<d.requiredLevel?'Roi niveau '+d.requiredLevel+' requis':'Examiner le lieu mystérieux',d:distance(s.king,d)});
  if(s.phase==='peace')for(const p of s.camps)if(!p.rescued&&distance(s.king,p)<85)candidates.push({type:'rescue',id:p.id,text:'Secourir le survivant',d:distance(s.king,p)});
  for(const p of s.landmarks)if(!p.looted&&distance(s.king,p)<85)candidates.push({type:'chest',id:p.id,text:'Fouiller les vestiges',d:distance(s.king,p)});
  return candidates.sort((a,b)=>(a.type==='mount'?1:0)-(b.type==='mount'?1:0)||a.d-b.d)[0]||null;
}
export function interact(s){
  const action=interaction(s);if(!action)return fail(s.phase==='peace'?'Approchez un cheval, un survivant ou des vestiges.':'Le refuge a besoin de vous : les secours attendront.');
  if(action.type==='mount'){Object.assign(s.king,{mounted:true,x:s.horse.x,y:s.horse.y,aim:s.horse.aim});return ok('En selle ! Vous vous déplacez deux fois plus vite.');}
  if(action.type==='dismount'){s.king.mounted=false;s.king.x+=45;collide(s.king,12,s);return ok('Vous êtes descendu. Le cheval vous attend ici.');}
  if(action.type==='discovery')return discover(s,action.id);
  if(action.type==='chest'){const p=s.landmarks.find(p=>p.id===action.id);p.looted=true;p.known=true;s.gold+=p.gold;s.resources.stone+=8;s.resources.iron+=3;gainXP(s,25,true);gainXP(s,10);return ok(p.name+' · '+p.gold+' pièces et des matériaux retrouvés.');}
  const camp=s.camps.find(p=>p.id===action.id);recalculateCapacity(s);
  if(population(s)+reservations(s)>=s.capacity||s.counts.rescued+s.followers.length>=quotas(s).rescued)return fail('Construisez et terminez de nouveaux logements avant d’accueillir ce survivant.');
  camp.rescued=true;camp.visits=(camp.visits||0)+1;camp.nextRefugeeAt=s.time+150+random(s)*60;s.followers.push({id:camp.id+'-escort-'+s.nextEscortId++,campId:camp.id,x:camp.x,y:camp.y,cool:0,role:'survivor',path:[{x:s.king.x,y:s.king.y}]});return ok('Un survivant vous suit. Escortez-le au refuge, puis choisissez son métier.');
}
function discover(s,id){
  const d=s.discoveries.find(d=>d.id===id);if(!d||d.rewardClaimed)return fail('Ce lieu a déjà livré son secret.');
  d.known=true;
  if(s.king.heroLevel<d.requiredLevel)return fail('Ce lieu appelle un roi de niveau '+d.requiredLevel+'.');
  if(s.phase!=='peace')return fail('Revenez pendant une accalmie pour éveiller ce lieu.');
  if(d.cleared){
    d.rewardClaimed=true;for(const [key,n]of Object.entries(d.reward))if(key==='gold')s.gold+=n;else s.resources[key]=(s.resources[key]||0)+n;
    if(!s.relics.includes(d.relic))s.relics.push(d.relic);s.king.maxHp=heroMaximum(s);s.king.hp=s.king.maxHp;
    gainXP(s,65+d.requiredLevel*10,true);gainXP(s,35);s.king.levelUpPulse=1.2;
    const relic=RELICS[d.relic];event(s,'Secret révélé : '+relic.name+' ! '+relic.description);
    return ok(d.name+' : '+relic.name+' retrouvé ! '+relic.description);
  }
  if(d.triggered)return fail('Les gardiens protègent encore le coffre. Battez-les avec votre visée et vos capacités.');
  d.triggered=true;
  const count=d.kind==='beacon'?3:2;
  for(let i=0;i<count;i++){
    const angle=(i/count)*Math.PI*2+.65,warden=d.kind==='beacon'&&i===0,hp=warden?260:60+d.requiredLevel*12;
    s.enemies.push({id:d.id+'-guardian-'+i,encounterId:d.id,kind:warden?'warden':'guardian',elite:true,
      homeX:d.x,homeY:d.y,x:d.x+Math.sin(angle)*90,y:d.y+Math.cos(angle)*90,hp,maxHp:hp,speed:warden?42:58,aim:angle,cool:.6+i*.25});
  }
  event(s,'Surprise ! Les gardiens de '+d.name.toLowerCase()+' s’éveillent. Esquivez et visez leurs défenses !');
  return ok('Les anciens gardiens s’éveillent ! Le coffre ne s’ouvrira qu’après votre victoire.');
}
function hurtHero(s,damage){
  const k=s.king;if(k.invulnerable>0)return;
  k.hp=Math.max(0,k.hp-damage);k.hitFlash=.3;k.invulnerable=.65;
  if(k.hp>0)return;
  const loss=Math.min(25,Math.floor(s.gold));s.gold-=loss;k.x=500;k.y=400;k.mounted=false;k.hp=k.maxHp;k.invulnerable=3;k.dashTime=0;k.target=null;k.targetTTL=0;
  event(s,'Vos éclaireurs vous ont ramené au refuge. Repli : '+loss+' pièces perdues. Les gardiens vous attendent encore.');
}
function pushFromRect(p,r,radius){if(!insideRect(p,r,radius))return;const left=r.x-r.halfW-radius,right=r.x+r.halfW+radius,top=r.y-r.halfD-radius,bottom=r.y+r.halfD+radius,edges=[p.x-left,right-p.x,p.y-top,bottom-p.y],i=edges.indexOf(Math.min(...edges));if(i===0)p.x=left;if(i===1)p.x=right;if(i===2)p.y=top;if(i===3)p.y=bottom;}
export function collide(p,radius=12,stateOrLevel=0){
  p.x=clamp(p.x,WORLD.minX+45,WORLD.maxX-45);p.y=clamp(p.y,WORLD.minY+45,WORLD.maxY-45);
  const s=typeof stateOrLevel==='object'?stateOrLevel:null;
  if(s){for(const b of s.buildings)if(!b.destroyed)pushFromRect(p,rectangle(b.type,b.x,b.y,b.rotation,b),radius);}
  else pushFromRect(p,{x:500,y:230,halfW:95,halfD:65},radius/2);
  for(const t of nearbyTrees(p.x,p.y)){
    if(s?.harvested.includes(treeIds.get(t)))continue;
    const dx=p.x-t.x,dy=p.y-t.y,d=Math.hypot(dx,dy),min=radius+9*t.size;if(d<min){p.x=t.x+(d?dx/d:1)*min;p.y=t.y+(d?dy/d:0)*min;}
  }
}
function moveToward(p,target,speed,dt,stop=0){const d=distance(p,target);if(d>stop){const step=Math.min(d-stop,speed*dt);p.aim=Math.atan2(target.x-p.x,target.y-p.y);p.x+=(target.x-p.x)/d*step;p.y+=(target.y-p.y)/d*step;}}
function efficiency(p){return p.motivation<15?.12:(.25+.75*p.motivation/100)*(1+(p.level-1)*.06);}
function updatePayroll(s,dt){
  const workers=s.allies.filter(p=>p.job!=='unassigned');s.payroll.enabled=s.kingdomLevel>=3||population(s)>=10;
  s.payroll.due=workers.reduce((sum,p)=>sum+p.wage,0);
  const foodNeed=population(s)*.012*dt,foodRatio=foodNeed?Math.min(1,s.resources.food/foodNeed):1;s.resources.food=Math.max(0,s.resources.food-foodNeed);
  for(const p of s.allies){p.motivation=clamp(p.motivation+(foodRatio<1?-.2*dt:.015*dt),0,100);if(population(s)>s.capacity)p.motivation=clamp(p.motivation-.08*dt,0,100);}
  if(!s.payroll.enabled){s.payroll.timer=s.payroll.interval;return;}
  s.payroll.timer-=dt;
  if(s.payroll.timer>0)return;s.payroll.timer+=s.payroll.interval;
  const due=s.payroll.due,paid=Math.min(s.gold,due),ratio=due?paid/due:1;s.gold-=paid;s.payroll.lastPaid=paid;s.payroll.totalPaid+=paid;s.payroll.arrears+=due-paid;
  for(const p of workers){p.lastPaid=p.wage*ratio;p.motivation=clamp(p.motivation+(ratio===1?7:-24*(1-ratio)),0,100);}
  if(due)event(s,ratio===1?'Les salaires ont été versés. Vos habitants restent motivés.':'La trésorerie ne couvre pas les salaires. La motivation diminue.');
}
function buildingWork(s,p,dt){
  const target=s.buildings.find(b=>!b.destroyed&&(!b.complete||b.upgrading));
  if(!target){p.workStatus='Aucun chantier';return;}
  const r=rectangle(target.type,target.x,target.y,target.rotation,target),point={x:r.x,y:r.y+r.halfD+32};
  moveToward(p,point,100,dt,12);if(distance(p,point)>40){p.workStatus='Rejoint le chantier';return;}
  p.workStatus='Construit';const work=efficiency(p)*dt*(s.tech.includes('architecture')?1.3:1);residentXP(p,work*.6);
  if(target.upgrading){target.upgradeProgress+=work;if(target.upgradeProgress>=target.upgradeWork){target.upgrading=false;target.level++;target.maxHp=Math.round(target.maxHp*1.4);target.hp=target.maxHp;gainXP(s,70);gainXP(s,15,true);event(s,BUILDINGS[target.type].label+' amélioré au niveau '+target.level+'.');}}
  else{target.progress+=work;if(target.progress>=target.work){target.progress=target.work;target.complete=true;target.hp=target.maxHp;gainXP(s,45);gainXP(s,12,true);event(s,BUILDINGS[target.type].label+' terminé.');}}
  recalculateCapacity(s);const refuge=s.buildings.find(b=>b.isRefuge);if(refuge&&refuge.maxHp>s.maxHp){const delta=refuge.maxHp-s.maxHp;s.maxHp=refuge.maxHp;s.hp=Math.min(s.maxHp,s.hp+delta);}
}
function workerWork(s,p,dt){
  const kind=['wood','stone','iron'][((p.workCycles||0)+p.workPhase)%3];let target;
  if(kind==='wood'){
    if(p.targetTree===undefined||s.harvested.includes(p.targetTree)){
      let best=Infinity,id=-1;for(let i=0;i<FOREST_TREES.length;i++)if(!s.harvested.includes(i)){const d=distance(p,FOREST_TREES[i]);if(d<best){best=d;id=i;}}p.targetTree=id;
    }
    target=FOREST_TREES[p.targetTree];
  }else target=s.resourceNodes.find(n=>n.kind===kind);
  if(!target){p.workStatus='Plus de ressources accessibles';return;}
  moveToward(p,target,100,dt,65);collide(p,10,s);
  if(distance(p,target)>85){p.workStatus='Rejoint les ressources';return;}
  p.workStatus='Récupère du '+RESOURCE_LABELS[kind];p.workTimer+=dt*efficiency(p);
  if(p.workTimer>=3){p.workTimer-=3;p.workCycles=(p.workCycles||0)+1;if(kind==='wood')chop(s,p.targetTree,1,false);else s.resources[kind]+=kind==='stone'?4:2;residentXP(p,5);gainXP(s,1);}
}
function productiveWork(s,p,dt){
  const eff=efficiency(p);if(!eff){p.workStatus='Démotivé : travail interrompu';return;}
  if(p.job==='worker'){workerWork(s,p,dt);return;}
  if(p.job==='builder'){buildingWork(s,p,dt);return;}
  if(p.job==='farmer'){
    const farms=activeBuildings(s,'farm'),farm=farms[p.workPhase%farms.length];if(!farm){p.workStatus='Ferme requise';return;}
    const target={x:farm.x,y:farm.y+BUILDINGS.farm.depth/2+25};moveToward(p,target,90,dt,35);if(distance(p,target)>80){p.workStatus='Rejoint la ferme';return;}
    p.workStatus='Cultures et élevage';s.resources.food+=dt*.42*eff*farm.level*(s.tech.includes('agriculture')?1.5:1);residentXP(p,dt*.5);gainXP(s,dt*.07);return;
  }
  if(p.job==='armorer'){
    const forges=activeBuildings(s,'forge'),forge=forges[p.workPhase%forges.length];if(!forge){p.workStatus='Forge requise';return;}
    const target={x:forge.x,y:forge.y+BUILDINGS.forge.depth/2+25};moveToward(p,target,90,dt,30);if(distance(p,target)>75){p.workStatus='Rejoint la forge';return;}
    if(s.resources.iron<2||s.resources.wood<2){p.workStatus='Fer et bois requis';return;}
    p.workStatus='Forge et ravitaillement';p.workTimer+=dt*eff*forge.level;
    if(p.workTimer>=9){p.workTimer-=9;s.resources.iron-=2;s.resources.wood-=2;s.resources.weapons++;residentXP(p,10);gainXP(s,6);}
    return;
  }
  if(p.job==='inventor'){
    const academies=activeBuildings(s,'academy'),academy=academies[p.workPhase%academies.length];if(!academy){p.workStatus='Académie requise';return;}
    const target={x:academy.x,y:academy.y+BUILDINGS.academy.depth/2+25};moveToward(p,target,90,dt,30);if(distance(p,target)>75){p.workStatus='Rejoint l’académie';return;}
    p.workStatus=s.research?'Développe une technologie':'Rédige des instructions';s.resources.knowledge+=dt*.25*eff*academy.level;residentXP(p,dt*.7);gainXP(s,dt*.09);
    if(s.research){s.research.progress+=dt*eff*academy.level;if(s.research.progress>=s.research.work){const key=s.research.key;s.tech.push(key);s.research=null;gainXP(s,100);event(s,'Recherche achevée : '+TECHS[key].label+'.');if(key==='architecture'){for(const b of s.buildings){b.maxHp=Math.round(b.maxHp*1.25);b.hp=Math.min(b.maxHp,b.hp*1.25);}const refuge=s.buildings.find(b=>b.isRefuge);if(refuge){s.maxHp=refuge.maxHp;s.hp=Math.min(s.maxHp,s.hp*1.25);}}}}
  }
}
function knightWork(s,p,dt){
  p.cool-=dt;if(!p.equipped&&s.resources.weapons>=1){s.resources.weapons--;p.equipped=true;p.equipmentDurability=100;}
  let target=null,best=420;for(const e of s.enemies){const d=distance(p,e);if(e.hp>0&&d<best){target=e;best=d;}}
  if(!target){p.workStatus=p.equipped?'Garde équipée':'Garde sans arme';return;}
  p.workStatus='Défend le royaume';moveToward(p,target,110,dt,55);collide(p,10,s);
  if(distance(p,target)<86&&p.cool<=0){p.cool=.8;target.hp-=(p.equipped?34:13)*efficiency(p)*(s.tech.includes('weaponry')?1.25:1);residentXP(p,3);if(p.equipped){p.equipmentDurability-=1;if(p.equipmentDurability<=0)p.equipped=false;}}
}
function tick(s,dt,input){
  if(s.over)return;s.time+=dt;recalculateCapacity(s);const k=s.king;
  for(const key of ['cool','axeCool','axeSwing','targetTTL','attackPulse','dashCool','dashTime','powerCool','powerTime','hitFlash','invulnerable','levelUpPulse'])k[key]=Math.max(0,(k[key]||0)-dt);
  const atHome=distance(k,HOME)<220;
  if(atHome&&s.phase==='peace')k.hp=Math.min(k.maxHp,k.hp+dt*8);
  else if(s.relics.includes('verdant-heart')&&k.hitFlash<=0)k.hp=Math.min(k.maxHp,k.hp+dt*2);
  if(k.dashTime>0){k.x+=k.dashDirection.x*660*dt;k.y+=k.dashDirection.y*660*dt;collide(k,12,s);}
  const speed=k.mounted?380:190,dx=input.x||0,dy=input.y||0,n=Math.max(1,Math.hypot(dx,dy));
  if(dx||dy){k.aim=Math.atan2(dx,dy);k.x+=dx/n*speed*dt;k.y+=dy/n*speed*dt;collide(k,k.mounted?21:12,s);}
  if(k.mounted){s.horse.x=k.x;s.horse.y=k.y;s.horse.aim=k.aim;}
  updatePayroll(s,dt);
  for(const p of s.allies){
    if(p.job==='knight')knightWork(s,p,dt);
    else if(p.job==='unassigned')p.workStatus='Métier à choisir';
    else if(s.phase==='peace')productiveWork(s,p,dt);
    else p.workStatus='À l’abri pendant l’assaut';
  }
  for(let i=s.followers.length-1;i>=0;i--){
    const p=s.followers[i];p.path??=[];const last=p.path.at(-1)||p;
    if(distance(last,k)>18)p.path.push({x:k.x,y:k.y});while(p.path.length>1&&distance(p,p.path[0])<14)p.path.shift();if(p.path.length>400)p.path.shift();
    const target=p.path[0]||k;moveToward(p,target,k.mounted?405:210,dt,p.path.length>1?3:40+i*8);collide(p,10,s);
    if(distance(p,HOME)<290&&distance(k,HOME)<210&&addResident(s,'rescued',true)){s.followers.splice(i,1);s.gold+=15;gainXP(s,35,true);event(s,'Un survivant est en sécurité. Choisissez son métier dans le menu. +15 pièces');}
  }
  if(s.phase==='peace'){
    s.refugeeRefreshTimer-=dt;
    if(s.refugeeRefreshTimer<=0){
      s.refugeeRefreshTimer=45;
      if(s.camps.every(c=>(c.visits||0)>0)&&s.counts.rescued+s.followers.length<quotas(s).rescued&&population(s)+reservations(s)<s.capacity){
        const camp=s.camps.filter(c=>c.rescued&&s.time>=c.nextRefugeeAt&&!s.followers.some(p=>p.campId===c.id||p.id===c.id)).sort((a,b)=>a.nextRefugeeAt-b.nextRefugeeAt)[0];
        if(camp){camp.rescued=false;camp.known=true;event(s,'De nouveaux rescapés ont rejoint le camp '+camp.name+'.');}
      }
    }
    if(s.counts.rescued>0&&s.counts.natural+s.caravans.length<quotas(s).natural&&population(s)+reservations(s)<s.capacity){
      s.arrivalTimer-=dt;
      if(s.arrivalTimer<=0){s.arrivalTimer=55+random(s)*60;s.caravans.push({id:'arrival-'+Math.round(s.time*1000),x:HOME.x+Math.sin((HOME.y+700)/450)*80,y:HOME.y+700,cool:0,role:'survivor'});event(s,'Un voyageur a entendu parler du refuge. Il arrive de lui-même.');}
    }
    for(let i=s.caravans.length-1;i>=0;i--){const c=s.caravans[i];moveToward(c,{x:HOME.x,y:HOME.y+130},90,dt,20);if(distance(c,HOME)<190&&addResident(s,'natural',true)){s.caravans.splice(i,1);event(s,'Un habitant a rejoint le royaume. Choisissez son métier.');}}
  }
  const reveal=k.heroLevel>=4?440:260;
  for(const camp of s.camps)if(distance(k,camp)<reveal)camp.known=true;for(const p of s.landmarks)if(distance(k,p)<reveal)p.known=true;
  for(const d of s.discoveries)if(!d.known&&distance(k,d)<reveal+60){d.known=true;event(s,'Une lueur inconnue révèle '+d.name.toLowerCase()+'. Approchez pour découvrir son secret.');}
  const cell=Math.floor(k.x/300)+','+Math.floor(k.y/300);if(cell!==s.exploredKey){s.exploredKey=cell;if(!s.explored.includes(cell))s.explored.push(cell);}
  if(s.phase!=='raid'){s.phaseRemaining-=dt;if(s.phaseRemaining<=0){if(s.phase==='peace'){s.phase='warning';s.phaseRemaining=25;s.rival=RIVALS[Math.floor(random(s)*RIVALS.length)];event(s,'Des éclaireurs de '+s.rival+' approchent. Revenez au refuge !');}else{s.phase='raid';s.wave++;s.left=5+s.wave*2;s.spawn=1;event(s,'Le refuge est attaqué par '+s.rival+' !');}}}
  if(s.phase==='raid'){
    s.spawn-=dt;if(s.left>0&&s.spawn<=0){s.left--;s.spawn=1.5;const x=HOME.x+(random(s)-.5)*1000,y=HOME.y+820+random(s)*130;s.enemies.push({x,y,hp:48+s.wave*9,maxHp:48+s.wave*9,speed:39+s.wave*2,aim:0});}
    if(s.left===0&&!s.enemies.some(e=>!e.encounterId&&e.hp>0)){s.phase='peace';s.day++;s.phaseRemaining=90+random(s)*80;gainXP(s,25);event(s,'L’assaut est repoussé. Profitez de l’accalmie pour reconstruire.');}
  }
  for(const e of s.enemies){
    if(e.hp<=0)continue;
    if(e.encounterId){
      const home={x:e.homeX,y:e.homeY};e.cool=Math.max(0,(e.cool||0)-dt);
      if(distance(k,home)<540){moveToward(e,k,e.speed,dt,46);collide(e,10,s);if(distance(e,k)<64&&e.cool<=0){e.cool=e.kind==='warden'?1.7:1.3;hurtHero(s,e.kind==='warden'?22:12);}}
      else moveToward(e,home,e.speed,dt,28);
      continue;
    }
    const goal=e.y>360&&Math.abs(e.x-500)>65?{x:500,y:395}:HOME;
    if(distance(e,HOME)>102){
      const old={x:e.x,y:e.y};moveToward(e,goal,e.speed,dt);const obstruction=s.buildings.find(b=>!b.isRefuge&&b.complete&&!b.destroyed&&insideRect(e,rectangle(b.type,b.x,b.y,b.rotation,b),18));
      if(obstruction){e.x=old.x;e.y=old.y;obstruction.hp-=dt*(6+s.wave);if(obstruction.hp<=0){obstruction.hp=0;obstruction.destroyed=true;obstruction.complete=false;event(s,BUILDINGS[obstruction.type].label+' détruit !');}}
    }else s.hp-=dt*(3+s.wave*.4)*(s.relics.includes('founders-banner')?.9:1);
  }
  for(const a of s.arrows){
    a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt;if(a.life<=0)continue;a.hitTargets??=[];
    for(const e of s.enemies)if(e.hp>0&&!a.hitTargets.includes(e)&&distance(a,e)<25){
      e.hp-=a.damage;a.hitTargets.push(e);a.pierce=(a.pierce??1)-1;
      for(let i=0;i<4;i++)s.particles.push({x:e.x,y:e.y,life:.4,vx:(random(s)-.5)*60,vy:(random(s)-.5)*60});
      if(a.pierce<=0){a.life=0;break;}
    }
  }
  s.arrows=s.arrows.filter(a=>a.life>0);s.enemies=s.enemies.filter(e=>{if(e.hp>0)return true;s.kills++;gainXP(s,e.kind==='warden'?65:e.elite?28:20,true);gainXP(s,e.elite?12:8);s.coins.push({x:e.x,y:e.y,value:e.elite?18:12,age:0});return false;});
  for(const d of s.discoveries)if(d.triggered&&!d.cleared&&!s.enemies.some(e=>e.encounterId===d.id&&e.hp>0)){d.cleared=true;event(s,'Les gardiens sont vaincus ! Le coffre de '+d.name.toLowerCase()+' peut être ouvert.');}
  s.coins=s.coins.filter(c=>{c.age+=dt;const d=distance(c,k);if(d<110){c.x+=(k.x-c.x)*Math.min(1,dt*9);c.y+=(k.y-c.y)*Math.min(1,dt*9);}if(d<25){s.gold+=c.value;return false;}return true;});
  for(const p of s.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}s.particles=s.particles.filter(p=>p.life>0);
  if(s.phase==='peace'){
    if(s.relics.includes('founders-banner'))s.resources.food+=.12*dt;
    const commerce=activeBuildings(s,'treasury').reduce((n,b)=>n+b.level,0);
    s.income+=commerce*population(s)*.012*dt;
    if(s.income>=1){const amount=Math.floor(s.income);s.gold+=amount;s.income-=amount;}
  }
  const refuge=s.buildings.find(b=>b.isRefuge);if(refuge)refuge.hp=Math.max(0,s.hp);
  const milestone=population(s)>=20&&s.kingdomLevel>=4?3:population(s)>=10?2:s.counts.rescued?1:0;if(milestone>s.milestone){s.milestone=milestone;event(s,milestone===1?'Votre premier habitant attend un métier.':milestone===2?'Le hameau grandit : les habitants attendent désormais un salaire.':s.kingdomName+' renaît : votre civilisation entre dans un nouvel âge.');}
  if(s.hp<=0){s.hp=0;s.over=true;event(s,'Le refuge est tombé. Votre peuple se disperse.');}
}
export function stepGame(s,seconds,input={x:0,y:0}){if(!Number.isFinite(seconds)||seconds<=0)return;const count=Math.ceil(seconds/(1/30)),dt=seconds/count;for(let i=0;i<count;i++)tick(s,dt,input);}
export function objective(s){
  if(s.phase==='warning'||s.phase==='raid')return'Revenez au refuge et défendez votre peuple.';
  if(s.followers.length)return'Escortez les survivants jusqu’au refuge.';
  if(s.king.hp<s.king.maxHp*.25)return'Repliez-vous au refuge pour récupérer votre vitalité.';
  const nearbySecret=s.discoveries.find(d=>d.known&&!d.rewardClaimed&&distance(s.king,d)<550);
  if(nearbySecret?.cleared)return'Les gardiens sont vaincus : ouvrez le coffre ancien.';
  if(nearbySecret?.triggered)return'Visez les gardiens et esquivez leurs attaques pour libérer le coffre.';
  if(nearbySecret&&s.king.heroLevel>=nearbySecret.requiredLevel)return'Une lueur ancienne vous appelle. Examinez le lieu mystérieux.';
  if(!s.counts.rescued)return'Retrouvez un survivant dans la forêt à l’est.';
  if(s.allies.some(p=>p.job==='unassigned'))return'Choisissez un métier pour vos nouveaux habitants.';
  if(!s.allies.some(p=>p.job==='builder'))return'Affectez un constructeur pour développer le royaume.';
  if(s.buildings.some(b=>!b.complete&&!b.destroyed))return'Vos constructeurs réalisent les chantiers placés par le roi.';
  if(!activeBuildings(s,'farm').length)return'Placez une ferme et affectez un fermier pour nourrir le peuple.';
  if(s.kingdomLevel<4)return'Explorez, construisez et développez les métiers pour faire progresser le royaume.';
  if(!activeBuildings(s,'academy').length)return'Bâtissez une académie pour accueillir vos inventeurs.';
  return'Développez les technologies, équipez vos chevaliers et faites prospérer '+s.kingdomName+'.';
}
export function kingdomStats(s){
  recalculateCapacity(s);
  const count=population(s),assigned=s.allies.filter(p=>p.job!=='unassigned'),jobs=Object.fromEntries(Object.keys(JOBS).map(k=>[k,s.allies.filter(p=>p.job===k).length]));
  const motivation=count?s.allies.reduce((n,p)=>n+p.motivation,0)/count:100,eff=assigned.length?assigned.reduce((n,p)=>n+efficiency(p),0)/assigned.length:0;
  const due=assigned.reduce((n,p)=>n+p.wage,0),heroNext=xpForLevel(s.king.heroLevel+1,true),kingdomNext=xpForLevel(s.kingdomLevel+1),farms=activeBuildings(s,'farm'),alerts=[];
  const foodProduction=s.phase==='peace'?s.allies.filter(p=>p.job==='farmer').reduce((n,p)=>{
    const farm=farms[p.workPhase%farms.length];if(!farm)return n;
    const target={x:farm.x,y:farm.y+BUILDINGS.farm.depth/2+25};
    return n+(distance(p,target)<=80?.42*efficiency(p)*farm.level*(s.tech.includes('agriculture')?1.5:1):0);
  },s.relics.includes('founders-banner')?.12:0):0;
  if(count+reservations(s)>=s.capacity)alerts.push('Capacité de logement atteinte.');
  if(count>s.capacity)alerts.push('Le royaume manque de logements.');
  if(s.allies.some(p=>p.job==='unassigned'))alerts.push('Des habitants attendent un métier.');
  if(s.buildings.some(b=>!b.destroyed&&(!b.complete||b.upgrading))&&!jobs.builder)alerts.push('Des chantiers attendent un constructeur.');
  if(jobs.farmer&&!farms.length)alerts.push('Les fermiers ont besoin d’une ferme achevée.');
  if(jobs.armorer&&!activeBuildings(s,'forge').length)alerts.push('Les armuriers ont besoin d’une forge achevée.');
  if(s.allies.some(p=>p.job==='knight'&&!p.equipped))alerts.push('Des chevaliers attendent une arme de l’armurier.');
  if(s.resources.food<20)alerts.push('Les réserves de nourriture sont basses.');
  if((s.kingdomLevel>=3||count>=10)&&s.gold<due)alerts.push('La trésorerie ne couvre pas la prochaine paie.');
  if(motivation<40)alerts.push('La motivation est basse : l’efficacité du travail diminue.');
  return{population:count,capacity:s.capacity,pending:reservations(s),availableHousing:Math.max(0,s.capacity-count-reservations(s)),unassigned:s.allies.filter(p=>p.job==='unassigned').length,jobs,motivation,efficiency:eff,resources:{...s.resources},gold:s.gold,sources:{...s.counts},quotas:quotas(s),
    payroll:{...s.payroll,enabled:s.kingdomLevel>=3||count>=10,workers:assigned.length,due,nextDue:due,affordable:s.gold>=due},
    progression:progressionState(s),hero:{level:s.king.heroLevel,xp:s.king.xp,nextXP:heroNext,hp:s.king.hp,maxHp:s.king.maxHp,progress:(s.king.xp-xpForLevel(s.king.heroLevel,true))/(heroNext-xpForLevel(s.king.heroLevel,true))},
    kingdom:{level:s.kingdomLevel,xp:s.xp,nextXP:kingdomNext,progress:(s.xp-xpForLevel(s.kingdomLevel))/(kingdomNext-xpForLevel(s.kingdomLevel))},
    kingLevel:s.king.heroLevel,kingXP:s.king.xp,kingNextXP:heroNext,kingdomLevel:s.kingdomLevel,kingdomXP:s.xp,kingdomNextXP:kingdomNext,
    buildings:{complete:s.buildings.filter(b=>b.complete&&!b.destroyed).length,construction:s.buildings.filter(b=>!b.complete&&!b.destroyed).length,upgrades:s.buildings.filter(b=>b.upgrading&&!b.destroyed).length},foodBalance:foodProduction-count*.012,incomePerMinute:s.phase==='peace'?activeBuildings(s,'treasury').reduce((n,b)=>n+b.level,0)*count*.012*60:0,alerts};
}
