import {HOME,WORLD,HORSE_START,RESCUE_SITES,LANDMARKS,nearbyTrees} from './world-data.js';
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const RIVALS=['la Ligue des Cendres','le duché des Ronces','la Couronne carmin'];
export function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function quotas(s){return{natural:Math.round(s.capacity*.2),hired:Math.round(s.capacity*.3),rescued:Math.round(s.capacity*.5)};}
export function population(s){return s.counts.natural+s.counts.hired+s.counts.rescued;}
export function costs(s){return{recruit:25+s.counts.hired*10,fortify:80+s.fort*60,upgrade:35+(s.level-1)*25};}
export function createGame(seed=Date.now()>>>0){
  return{seed,gold:40,hp:160,maxHp:160,wave:0,day:1,level:1,fort:0,capacity:10,kills:0,
    king:{x:500,y:400,cool:0,mounted:false,aim:0},horse:{...HORSE_START,aim:0},
    allies:[],enemies:[],arrows:[],coins:[],particles:[],followers:[],caravans:[],counts:{natural:0,hired:0,rescued:0},
    camps:RESCUE_SITES.map((p,i)=>({...p,rescued:false,known:i===0})),landmarks:LANDMARKS.map(p=>({...p,known:false,looted:false})),
    phase:'peace',phaseRemaining:120,spawn:0,left:0,arrivalTimer:65,income:0,time:0,explored:[],exploredKey:'',
    rival:RIVALS[0],over:false,milestone:0,events:[]};
}
function event(s,text){s.events.push(text);if(s.events.length>12)s.events.shift();}
export function addResident(s,source){
  if(!Object.hasOwn(s.counts,source)||s.counts[source]>=quotas(s)[source])return false;
  const i=population(s),role=source==='hired'||(source==='rescued'&&i%2===0)?'archer':'builder';
  s.counts[source]++;
  s.allies.push({id:'citizen-'+i,source,role,x:HOME.x-135+(i%6)*50,y:HOME.y+100+Math.floor(i/6)*40,cool:0,workPhase:i});
  return true;
}
export function buy(s,kind){
  if(s.over)return{ok:false,text:'Le refuge est tombé.'};
  if(!['recruit','fortify','upgrade'].includes(kind))return{ok:false,text:'Action inconnue.'};
  if(distance(s.king,HOME)>210)return{ok:false,text:'Revenez au refuge pour gérer votre royaume.'};
  if(s.phase!=='peace')return{ok:false,text:'Attendez la fin de l’attaque.'};
  if(kind==='recruit'){
    if(s.counts.rescued<1)return{ok:false,text:'Ramenez d’abord un survivant pour faire renaître le refuge.'};
    if(s.counts.hired>=quotas(s).hired)return{ok:false,text:'Les places de recrutement sont occupées. Agrandissez le refuge.'};
  }
  if(kind==='fortify'&&s.capacity>=30)return{ok:false,text:'Le refuge est entièrement reconstruit pour cette région : 30 places.'};
  const price=costs(s)[kind];if(s.gold<price)return{ok:false,text:'Il manque des pièces.'};
  if(kind==='recruit'){if(!addResident(s,'hired'))return{ok:false,text:'Aucune place disponible.'};}
  if(kind==='fortify'){s.fort++;s.capacity+=10;s.maxHp+=60;s.hp=Math.min(s.maxHp,s.hp+100);}
  if(kind==='upgrade')s.level++;
  s.gold-=price;
  return{ok:true,text:kind==='recruit'?'Un archer engagé rejoint votre peuple.':kind==='fortify'?'Le refuge est reconstruit : dix nouvelles places et des défenses renforcées.':'Votre arc est amélioré.'};
}
export function interaction(s){
  if(s.over)return null;
  if(s.king.mounted)return{type:'dismount',text:'Descendre du cheval'};
  const candidates=[];
  if(distance(s.king,s.horse)<85)candidates.push({type:'mount',text:'Monter à cheval',d:distance(s.king,s.horse)});
  if(s.phase==='peace')for(const p of s.camps)if(!p.rescued&&distance(s.king,p)<85)candidates.push({type:'rescue',id:p.id,text:'Secourir le survivant',d:distance(s.king,p)});
  for(const p of s.landmarks)if(!p.looted&&distance(s.king,p)<85)candidates.push({type:'chest',id:p.id,text:'Fouiller les vestiges',d:distance(s.king,p)});
  return candidates.sort((a,b)=>(a.type==='mount'?1:0)-(b.type==='mount'?1:0)||a.d-b.d)[0]||null;
}
export function interact(s){
  const action=interaction(s);if(!action)return{ok:false,text:s.phase==='peace'?'Approchez un cheval, un survivant ou des vestiges.':'Le refuge a besoin de vous : les secours attendront.'};
  if(action.type==='mount'){Object.assign(s.king,{mounted:true,x:s.horse.x,y:s.horse.y,aim:s.horse.aim});return{ok:true,text:'En selle ! Vous vous déplacez deux fois plus vite.'};}
  if(action.type==='dismount'){s.king.mounted=false;s.king.x+=45;collide(s.king,12,s.fort);return{ok:true,text:'Vous êtes descendu. Le cheval vous attend ici.'};}
  if(action.type==='chest'){const p=s.landmarks.find(p=>p.id===action.id);p.looted=true;p.known=true;s.gold+=p.gold;return{ok:true,text:p.name+' · '+p.gold+' pièces retrouvées pour reconstruire.'};}
  const camp=s.camps.find(p=>p.id===action.id);
  if(s.counts.rescued+s.followers.length>=quotas(s).rescued)return{ok:false,text:'Agrandissez le refuge avant d’accueillir d’autres survivants.'};
  camp.rescued=true;s.followers.push({id:camp.id,x:camp.x,y:camp.y,cool:0,role:'survivor',path:[{x:s.king.x,y:s.king.y}]});
  return{ok:true,text:'Un survivant vous suit. Escortez-le jusqu’au refuge.'};
}
export function collide(p,radius=12,buildLevel=0){
  p.x=Math.max(WORLD.minX+45,Math.min(WORLD.maxX-45,p.x));p.y=Math.max(WORLD.minY+45,Math.min(WORLD.maxY-45,p.y));
  if(p.x>405-radius/2&&p.x<595+radius/2&&p.y>165-radius/2&&p.y<295+radius/2){
    const edges=[p.x-(405-radius/2),595+radius/2-p.x,p.y-(165-radius/2),295+radius/2-p.y],i=edges.indexOf(Math.min(...edges));
    if(i===0)p.x=405-radius/2;if(i===1)p.x=595+radius/2;if(i===2)p.y=165-radius/2;if(i===3)p.y=295+radius/2;
  }
  if(buildLevel>1)for(const cx of [200,800]){
    const left=cx-58-radius,right=cx+58+radius,top=450-radius,bottom=545+radius;
    if(p.x>left&&p.x<right&&p.y>top&&p.y<bottom){const ds=[p.x-left,right-p.x,p.y-top,bottom-p.y],i=ds.indexOf(Math.min(...ds));if(i===0)p.x=left;if(i===1)p.x=right;if(i===2)p.y=top;if(i===3)p.y=bottom;}
  }
  for(const t of nearbyTrees(p.x,p.y)){
    const dx=p.x-t.x,dy=p.y-t.y,d=Math.hypot(dx,dy),min=radius+9*t.size;
    if(d<min){const nx=d?dx/d:1,ny=d?dy/d:0;p.x=t.x+nx*min;p.y=t.y+ny*min;}
  }
}
function moveToward(p,target,speed,dt,stop=0){const d=distance(p,target);if(d>stop){const step=Math.min(d-stop,speed*dt);p.aim=Math.atan2(target.x-p.x,target.y-p.y);p.x+=(target.x-p.x)/d*step;p.y+=(target.y-p.y)/d*step;}}
function shoot(s,unit,dt,king=false){
  unit.cool-=dt;if(unit.cool>0)return;
  let target=null,best=king?345:340;
  for(const e of s.enemies){const d=distance(unit,e);if(d<best&&e.hp>0){target=e;best=d;}}
  if(!target)return;
  unit.cool=king?Math.max(.22,.64-s.level*.04):.9;
  const dx=target.x-unit.x,dy=target.y-unit.y,d=Math.hypot(dx,dy)||1;unit.aim=Math.atan2(dx,dy);
  s.arrows.push({x:unit.x,y:unit.y,vx:dx/d*620,vy:dy/d*620,life:.8,damage:king?24+s.level*10:30,height:king&&s.king.mounted?1.7:1});
}
function tick(s,dt,input){
  if(s.over)return;s.time+=dt;
  const k=s.king,speed=k.mounted?380:190,dx=input.x||0,dy=input.y||0,n=Math.max(1,Math.hypot(dx,dy));
  if(dx||dy){k.aim=Math.atan2(dx,dy);k.x+=dx/n*speed*dt;k.y+=dy/n*speed*dt;collide(k,k.mounted?21:12,s.fort);}
  if(k.mounted){s.horse.x=k.x;s.horse.y=k.y;s.horse.aim=k.aim;}
  shoot(s,k,dt,true);
  for(const a of s.allies){
    if(a.role==='archer')shoot(s,a,dt);
    else if(s.phase==='peace'){
      const i=a.workPhase;a.x=HOME.x-135+(i%6)*50+Math.sin(s.time*.5+i)*24;a.y=HOME.y+100+Math.floor(i/6)*40+Math.cos(s.time*.4+i)*15;
    }
  }
  for(let i=s.followers.length-1;i>=0;i--){
    const p=s.followers[i];p.path??=[];
    const last=p.path.at(-1)||p;
    if(distance(last,k)>18)p.path.push({x:k.x,y:k.y});
    while(p.path.length>1&&distance(p,p.path[0])<14)p.path.shift();
    if(p.path.length>400)p.path.shift();
    const target=p.path[0]||k;
    moveToward(p,target,k.mounted?405:210,dt,p.path.length>1?3:40+i*8);collide(p,10,s.fort);
    if(distance(p,HOME)<290&&distance(k,HOME)<210&&addResident(s,'rescued')){s.followers.splice(i,1);s.gold+=15;event(s,'Un survivant est en sécurité. Votre peuple renaît. +15 pièces');}
  }
  for(const camp of s.camps)if(distance(k,camp)<260)camp.known=true;
  for(const p of s.landmarks)if(distance(k,p)<250)p.known=true;
  const cell=Math.floor(k.x/300)+','+Math.floor(k.y/300);
  if(cell!==s.exploredKey){s.exploredKey=cell;if(!s.explored.includes(cell))s.explored.push(cell);}
  if(s.phase!=='raid'){
    s.phaseRemaining-=dt;
    if(s.phaseRemaining<=0){
      if(s.phase==='peace'){s.phase='warning';s.phaseRemaining=25;s.rival=RIVALS[Math.floor(random(s)*RIVALS.length)];event(s,'Des éclaireurs de '+s.rival+' approchent. Revenez au refuge !');}
      else{s.phase='raid';s.wave++;s.left=5+s.wave*2;s.spawn=1;event(s,'Le refuge est attaqué par '+s.rival+' !');}
    }
  }
  if(s.phase==='raid'){
    s.spawn-=dt;
    if(s.left>0&&s.spawn<=0){
      s.left--;s.spawn=1.5;const x=HOME.x+(random(s)-.5)*1000,y=HOME.y+820+random(s)*130;
      s.enemies.push({x,y,hp:48+s.wave*9,maxHp:48+s.wave*9,speed:39+s.wave*2,aim:0});
    }
    if(s.left===0&&!s.enemies.length){s.phase='peace';s.day++;s.phaseRemaining=90+random(s)*80;event(s,'L’assaut est repoussé. Une accalmie vous laisse explorer la forêt.');}
  }
  for(const e of s.enemies){
    const goal=e.y>360&&Math.abs(e.x-500)>65?{x:500,y:395}:HOME;
    if(distance(e,HOME)>92)moveToward(e,goal,e.speed,dt);
    else s.hp-=dt*(3+s.wave*.4);
  }
  for(const a of s.arrows){
    a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt;
    for(const e of s.enemies)if(e.hp>0&&distance(a,e)<25){e.hp-=a.damage;a.life=0;for(let i=0;i<4;i++)s.particles.push({x:e.x,y:e.y,life:.4,vx:(random(s)-.5)*60,vy:(random(s)-.5)*60});break;}
  }
  s.arrows=s.arrows.filter(a=>a.life>0);
  s.enemies=s.enemies.filter(e=>{if(e.hp>0)return true;s.kills++;s.coins.push({x:e.x,y:e.y,value:12,age:0});return false;});
  s.coins=s.coins.filter(c=>{c.age+=dt;const d=distance(c,k);if(d<110){c.x+=(k.x-c.x)*Math.min(1,dt*9);c.y+=(k.y-c.y)*Math.min(1,dt*9);}if(d<25){s.gold+=c.value;return false;}return true;});
  for(const p of s.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}s.particles=s.particles.filter(p=>p.life>0);
  if(s.phase==='peace'){
    if(s.counts.rescued>0&&s.counts.natural+s.caravans.length<quotas(s).natural){
      s.arrivalTimer-=dt;
      if(s.arrivalTimer<=0){s.arrivalTimer=55+random(s)*60;s.caravans.push({id:'arrival-'+s.counts.natural,x:HOME.x+Math.sin((HOME.y+700)/450)*80,y:HOME.y+700,cool:0,role:'survivor'});event(s,'Un voyageur a entendu parler du refuge. Il arrive de lui-même.');}
    }
    for(let i=s.caravans.length-1;i>=0;i--){const c=s.caravans[i];moveToward(c,{x:HOME.x,y:HOME.y+130},90,dt,20);if(distance(c,HOME)<190&&addResident(s,'natural')){s.caravans.splice(i,1);event(s,'Un habitant a rejoint votre royaume de lui-même.');}}
    s.income+=s.allies.filter(p=>p.role==='builder').length*.08*dt;
    if(s.income>=1){const n=Math.floor(s.income);s.gold+=n;s.income-=n;}
  }
  const milestone=population(s)>=20&&s.fort>=2?3:population(s)>=10&&s.fort>=1?2:s.counts.rescued?1:0;
  if(milestone>s.milestone){s.milestone=milestone;event(s,milestone===1?'Premiers serments : un survivant est devenu votre premier habitant.':milestone===2?'Un hameau renaît. Continuez de reconstruire Valdor.':'Vingt habitants et un refuge solide : votre nouveau royaume prend forme.');}
  if(s.hp<=0){s.hp=0;s.over=true;event(s,'Le refuge est tombé. Votre peuple se dispersera jusqu’à votre retour.');}
}
export function stepGame(s,seconds,input={x:0,y:0}){
  if(!Number.isFinite(seconds)||seconds<=0)return;
  const count=Math.ceil(seconds/(1/30)),dt=seconds/count;
  for(let i=0;i<count;i++)tick(s,dt,input);
}
export function objective(s){
  if(s.phase==='warning'||s.phase==='raid')return'Revenez au refuge et protégez votre peuple.';
  if(s.followers.length)return'Escortez les survivants jusqu’au refuge.';
  if(!s.counts.rescued)return'Une fumée s’élève à l’est : retrouvez un survivant en forêt.';
  if(!s.fort)return'Retrouvez des pièces dans les vestiges et reconstruisez le refuge.';
  if(population(s)<10)return'Redonnez un foyer à 10 habitants.';
  if(population(s)<20||s.fort<2)return'Agrandissez le refuge et rassemblez 20 habitants.';
  return'Valdor renaît. Explorez les bois et protégez votre nouveau royaume.';
}
