import {createWorld, CAMERA_YAW} from './world3d.js';
const $=id=>document.getElementById(id),canvas=$('game');
let view;
try{view=createWorld(canvas);}catch(error){$('graphics-error').hidden=false;console.error('Impossible de démarrer la 3D :',error);}
const W=1000,H=650,home={x:500,y:240};let state,paused=false,last=0,clock=0,noticeTime=0,sound=false,audio;
const keys=new Set(),joy={x:0,y:0},pointer={id:null};
const joystick=$('stick');
function reset(){clearInput();state={gold:0,hp:100,maxHp:100,wave:1,kills:0,level:1,fort:0,king:{x:500,y:360,cool:0},allies:[],enemies:[],arrows:[],coins:[],particles:[],spawn:2,left:7,rest:0,over:false};paused=false;syncPauseButton();$('overlay').hidden=true;toast('Protégez votre maison !');ui();}
function toast(t){$('notice').textContent=t;noticeTime=3;$('notice').style.opacity=1;}
function costs(){return{recruit:20+state.allies.length*10,fortify:30+state.fort*20,upgrade:25+(state.level-1)*20};}
function setText(id,text){const el=$(id),value=String(text);if(el.textContent!==value)el.textContent=value;}
function ui(){
  const c=costs();
  setText('gold',state.gold);
  setText('hp',`${Math.ceil(state.hp)} / ${state.maxHp}`);
  const width=`${Math.max(0,state.hp/state.maxHp)*100}%`;
  if($('healthbar').style.width!==width)$('healthbar').style.width=width;
  setText('wave',`VAGUE ${state.wave}`);
  setText('army',`♟ ${state.allies.length} ARCHER${state.allies.length>1?'S':''}`);
  for(const k of Object.keys(c)){
    setText(k+'Cost','✦ '+c[k]);
    const disabled=state.gold<c[k]||state.over;
    if($(k).disabled!==disabled)$(k).disabled=disabled;
  }
}
for(const kind of ['recruit','fortify','upgrade'])$(kind).onclick=()=>{const c=costs()[kind];if(state.over||state.gold<c)return;state.gold-=c;if(kind==='recruit'){const i=state.allies.length;state.allies.push({x:350+(i%6)*60,y:295+Math.floor(i/6)*35,cool:.2});toast('Un archer rejoint votre défense');}if(kind==='fortify'){state.fort++;state.maxHp+=40;state.hp=Math.min(state.maxHp,state.hp+70);toast('Maison renforcée et réparée');}if(kind==='upgrade'){state.level++;toast('Arc amélioré · niveau '+state.level);}beep(620);ui();};
function beep(f){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.12);}catch{}}
$('sound').onclick=()=>{sound=!sound;$('sound').textContent='SON : '+(sound?'ON':'OFF');$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Couper le son':'Activer le son');beep(440);};
function syncPauseButton(){
  $('pause').setAttribute('aria-pressed',String(paused));$('pause-screen').hidden=!paused;
  $('pause').setAttribute('aria-label',paused?'Reprendre':'Mettre en pause');
}
function pause(){
  if(state.over)return;
  paused=!paused;
  clearInput();
  syncPauseButton();
  toast(paused?'Partie en pause':'Défendez le royaume !');
}
$('pause').onclick=pause;$('restart').onclick=reset;
const movementKeys=new Set(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','z','q']);
addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  if(e.code==='Space'){
    // Preserve native Space activation of shop, sound and pause buttons.
    if(e.target.closest?.('button,a'))return;
    e.preventDefault();if(!e.repeat)pause();return;
  }
  const key=e.key.toLowerCase();
  if(movementKeys.has(key)){e.preventDefault();keys.add(key);}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function releaseStick(){
  const id=pointer.id;
  pointer.id=null;joy.x=joy.y=0;$('knob').style.transform='';
  if(id!==null&&joystick.hasPointerCapture(id))joystick.releasePointerCapture(id);
}
function clearInput(){keys.clear();releaseStick();}
function suspend(){clearInput();if(state&&!paused&&!state.over)pause();}
addEventListener('blur',suspend);
addEventListener('pagehide',suspend);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
function stick(e){
  const r=joystick.getBoundingClientRect(),radius=(r.width-40)/2;
  const dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
  const len=Math.hypot(dx,dy),m=Math.min(radius,len);
  joy.x=len?dx/len*m/radius:0;joy.y=len?dy/len*m/radius:0;
  $('knob').style.transform=`translate(${joy.x*radius}px,${joy.y*radius}px)`;
}
joystick.addEventListener('pointerdown',e=>{
  if(pointer.id!==null||paused||state.over||(e.pointerType==='mouse'&&e.button!==0))return;
  e.preventDefault();pointer.id=e.pointerId;joystick.setPointerCapture(e.pointerId);stick(e);
});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer.id)stick(e);});
function endStick(e){if(e.pointerId===pointer.id)releaseStick();}
joystick.addEventListener('lostpointercapture',endStick);
addEventListener('pointerup',endStick);
addEventListener('pointercancel',endStick);
// A rotated device must not keep the old joystick direction or a held keyboard key.
addEventListener('resize',clearInput);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function shoot(unit,dt,king){unit.cool-=dt;if(unit.cool>0)return;let target=null,best=king?340:310;for(const e of state.enemies){const d=dist(unit,e);if(d<best){target=e;best=d;}}if(target){unit.cool=king?Math.max(.22,.65-state.level*.045):.95;const dx=target.x-unit.x,dy=target.y-unit.y,d=Math.hypot(dx,dy)||1;unit.aim=Math.atan2(dx,dy);state.arrows.push({x:unit.x,y:unit.y-12,vx:dx/d*510,vy:dy/d*510,life:1.1,damage:king?20+state.level*10:25});}}
function update(dt){clock+=dt;if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').style.opacity=0;}if(paused||state.over)return;const s=state,k=s.king;let dx=joy.x,dy=joy.y;if(keys.has('arrowleft')||keys.has('a')||keys.has('q'))dx--;if(keys.has('arrowright')||keys.has('d'))dx++;if(keys.has('arrowup')||keys.has('w')||keys.has('z'))dy--;if(keys.has('arrowdown')||keys.has('s'))dy++;const inputX=dx,inputY=dy;dx=inputX*Math.cos(CAMERA_YAW)+inputY*Math.sin(CAMERA_YAW);dy=-inputX*Math.sin(CAMERA_YAW)+inputY*Math.cos(CAMERA_YAW);const len=Math.hypot(dx,dy);if(len){k.aim=Math.atan2(dx,dy);k.x=Math.max(40,Math.min(960,k.x+dx/Math.max(1,len)*190*dt));k.y=Math.max(120,Math.min(610,k.y+dy/Math.max(1,len)*190*dt));}resolveHouse(k);shoot(k,dt,true);s.allies.forEach(a=>shoot(a,dt,false));
if(s.left>0){s.spawn-=dt;if(s.spawn<=0){s.spawn=Math.max(.55,1.7-s.wave*.09);s.left--;const side=Math.random();s.enemies.push({x:side<.18?30:side>.82?970:90+Math.random()*820,y:side<.18||side>.82?410+Math.random()*150:690,hp:45+s.wave*9,maxHp:45+s.wave*9,speed:24+s.wave*3,hit:0});}}else if(!s.enemies.length){s.rest+=dt;if(s.rest>5){s.wave++;s.left=5+s.wave*2;s.rest=0;s.spawn=1;toast('Vague '+s.wave+' · Préparez vos archers !');}}
for(const e of s.enemies){const d=dist(e,home);if(d>88){e.x+=(home.x-e.x)/d*e.speed*dt;e.y+=(home.y-e.y)/d*e.speed*dt;}else{s.hp-=dt*(4+s.wave*.7);e.hit+=dt;}if(dist(e,k)<24){const d2=dist(e,k)||1;k.x=Math.max(35,Math.min(965,k.x+(k.x-e.x)/d2*70*dt));k.y=Math.max(120,Math.min(615,k.y+(k.y-e.y)/d2*70*dt));}}
for(const a of s.arrows){a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt;for(const e of s.enemies){if(e.hp>0&&dist(a,e)<24){e.hp-=a.damage;a.life=0;for(let i=0;i<4;i++)s.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*70,vy:-Math.random()*65,life:.4});break;}}}s.arrows=s.arrows.filter(a=>a.life>0);s.enemies=s.enemies.filter(e=>{if(e.hp>0)return true;s.kills++;s.coins.push({x:e.x,y:e.y,value:10,age:0});beep(200);return false;});
s.coins=s.coins.filter(c=>{c.age+=dt;const d=dist(c,k);if(d<105){c.x+=(k.x-c.x)*dt*9;c.y+=(k.y-c.y)*dt*9;}if(d<24){s.gold+=c.value;beep(820);return false;}return true;});for(const p of s.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}s.particles=s.particles.filter(p=>p.life>0);if(s.hp<=0){s.hp=0;s.over=true;clearInput();$('overlay').hidden=false;$('result').textContent=`${s.kills} ennemis vaincus · Vague ${s.wave}. Votre prochaine armée sera plus forte.`;}ui();}
function resolveHouse(k){
  if(k.x<=410||k.x>=590||k.y<=175||k.y>=295)return;
  const sides=[k.x-410,590-k.x,k.y-175,295-k.y],nearest=sides.indexOf(Math.min(...sides));
  if(nearest===0)k.x=410;if(nearest===1)k.x=590;if(nearest===2)k.y=175;if(nearest===3)k.y=295;
}
function draw(){if(view)view.render(state,clock,paused);}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend();$('graphics-error').hidden=false;});
canvas.addEventListener('webglcontextrestored',()=>{$('graphics-error').hidden=true;toast('La 3D est rétablie · reprenez avec le bouton de pause');});
function frame(t){const dt=Math.min((t-last)/1000||0,.04);last=t;update(dt);draw();if(view)requestAnimationFrame(frame);}
reset();if(view)requestAnimationFrame(frame);
