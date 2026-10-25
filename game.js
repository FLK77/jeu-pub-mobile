import {createWorld,CAMERA_YAW} from './world3d.js';
import {HOME,WORLD,FOREST_TREES} from './world-data.js';
import {createGame,stepGame,interaction,interact,buy,population,quotas,costs,distance,objective} from './simulation.js';
const $=id=>document.getElementById(id),canvas=$('game');
let state=createGame(),paused=true,view,last=0,clock=0,noticeTime=0,sound=false,audio,tab='kingdom';
canvas.tabIndex=0;
const keys=new Set(),joy={x:0,y:0},pointer={id:null},joystick=$('stick');
try{view=createWorld(canvas);}catch(e){$('graphics-error').hidden=false;console.error('Démarrage 3D impossible',e);}
function text(id,value){const s=String(value);if($(id).textContent!==s)$(id).textContent=s;}
function toast(message){text('notice',message);noticeTime=5;$('notice').style.opacity=1;}
function feedback(result){text('menu-feedback',result.text);toast(result.text);if(result.ok)beep(630);ui();}
function ui(){
  text('gold',Math.floor(state.gold));text('army',population(state)+' / '+state.capacity);text('hp',Math.ceil(state.hp)+' / '+state.maxHp);
  $('healthbar').style.width=Math.max(0,state.hp/state.maxHp)*100+'%';
  const phase=state.phase==='peace'?'Accalmie':state.phase==='warning'?'Assaut dans '+Math.ceil(state.phaseRemaining)+' s':'Refuge attaqué';
  text('wave','Jour '+state.day+' · '+phase);$('wave').classList.toggle('danger',state.phase!=='peace');
  text('objective',objective(state));
  const d=distance(state.king,HOME),angle=Math.atan2(HOME.x-state.king.x,HOME.y-state.king.y)-CAMERA_YAW;
  const arrows=['↓','↘','→','↗','↑','↖','←','↙'];const direction=arrows[(Math.round(angle/(Math.PI/4))+8)%8];
  text('home-direction',(d<210?'⌂ Au refuge':direction+' Refuge · '+Math.round(d/40)+' m')+(state.king.mounted?' · À cheval':'')+(state.followers.length?' · '+state.followers.length+' rescapé(s) vous suivent':''));
  const a=interaction(state);$('interact').hidden=!a||paused||state.over;if(a)text('interact-label',a.text);
  if(!$('menu').hidden){
    const q=quotas(state),c=costs(state);
    for(const name of ['natural','hired','rescued'])text(name+'-count',state.counts[name]+' / '+q[name]);
    text('settlement-status','Refuge niveau '+(state.fort+1)+' · '+population(state)+' habitants · '+state.allies.filter(p=>p.role==='archer').length+' archers · '+(d<210?'Vous êtes au refuge.':'Revenez au refuge pour construire et engager.'));
    for(const name of ['recruit','fortify','upgrade']){text(name+'Cost','✦ '+c[name]);$(name).disabled=state.gold<c[name]||d>210||state.phase!=='peace'||state.over||(name==='fortify'&&state.capacity>=30)||(name==='recruit'&&(!state.counts.rescued||state.counts.hired>=q.hired));}
    text('story-objective',objective(state));if(tab==='map')drawMap();
  }
}
function openMenu(){if(state.over||!$('intro').hidden)return;paused=true;clearInput();$('menu').hidden=false;$('menu-button').setAttribute('aria-expanded','true');text('menu-feedback','');ui();$('close-menu').focus();}
function closeMenu(){if(! $('intro').hidden||state.over)return;$('menu').hidden=true;paused=false;$('menu-button').setAttribute('aria-expanded','false');clearInput();canvas.focus({preventScroll:true});}
function toggleMenu(){if($('menu').hidden)openMenu();else closeMenu();}
$('menu-button').onclick=openMenu;$('close-menu').onclick=closeMenu;$('resume').onclick=closeMenu;
$('start').onclick=()=>{$('intro').hidden=true;paused=false;clearInput();canvas.focus({preventScroll:true});toast('Valdor n’est pas perdu. Retrouvez un survivant dans les bois à l’est.');};
$('restart').onclick=()=>{state=createGame();$('overlay').hidden=true;$('menu').hidden=true;$('intro').hidden=true;paused=false;clearInput();canvas.focus({preventScroll:true});ui();};
for(const name of ['recruit','fortify','upgrade'])$(name).onclick=()=>feedback(buy(state,name));
function performInteract(){if(!paused&&!state.over){feedback(interact(state));canvas.focus({preventScroll:true});}}
$('interact').onclick=performInteract;
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{tab=button.dataset.tab;for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b===button));for(const el of document.querySelectorAll('.tab'))el.hidden=el.id!=='tab-'+tab;ui();};
$('fullscreen').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Le terrain occupe déjà toute la fenêtre. Ajoutez le site à l’écran d’accueil sur iPhone.');}
  catch{toast('Le navigateur a refusé le plein écran. Le jeu reste adapté à toute la fenêtre.');}
};
document.addEventListener('fullscreenchange',()=>text('fullscreen',document.fullscreenElement?'⛶ Quitter le plein écran':'⛶ Passer en plein écran'));
$('zoom').oninput=()=>{if(view)view.setZoom(Number($('zoom').value));};
function beep(freq){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.12);}catch{}}
$('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));text('sound','Son : '+(sound?'activé':'désactivé'));beep(440);};
const movementKeys=new Set(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','z','q']);
addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  const key=e.key.toLowerCase();
  if(['escape','m'].includes(key)||(e.code==='Space'&&!e.target.closest?.('button,a'))){e.preventDefault();if(!e.repeat)toggleMenu();return;}
  if(key==='e'&&!e.repeat&&!e.target.closest?.('button,input')){e.preventDefault();performInteract();}
  if(movementKeys.has(key)&&!paused){e.preventDefault();keys.add(key);}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function releaseStick(){const id=pointer.id;pointer.id=null;joy.x=joy.y=0;$('knob').style.transform='';if(id!==null&&joystick.hasPointerCapture(id))joystick.releasePointerCapture(id);}
function clearInput(){keys.clear();releaseStick();}
function suspend(){clearInput();if(!paused&&!state.over)openMenu();}
addEventListener('blur',suspend);addEventListener('pagehide',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});addEventListener('resize',clearInput);
function stick(e){const r=joystick.getBoundingClientRect(),radius=(r.width-44)/2,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),m=Math.min(radius,d);joy.x=d?dx/d*m/radius:0;joy.y=d?dy/d*m/radius:0;$('knob').style.transform=`translate(${joy.x*radius}px,${joy.y*radius}px)`;}
joystick.addEventListener('pointerdown',e=>{if(pointer.id!==null||paused||state.over||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();pointer.id=e.pointerId;joystick.setPointerCapture(e.pointerId);stick(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer.id)stick(e);});
function endStick(e){if(e.pointerId===pointer.id)releaseStick();}joystick.addEventListener('lostpointercapture',endStick);addEventListener('pointerup',endStick);addEventListener('pointercancel',endStick);
function input(){let x=joy.x,y=joy.y;if(keys.has('arrowleft')||keys.has('q')||keys.has('a'))x--;if(keys.has('arrowright')||keys.has('d'))x++;if(keys.has('arrowup')||keys.has('z')||keys.has('w'))y--;if(keys.has('arrowdown')||keys.has('s'))y++;return{x:x*Math.cos(CAMERA_YAW)+y*Math.sin(CAMERA_YAW),y:-x*Math.sin(CAMERA_YAW)+y*Math.cos(CAMERA_YAW)};}
function update(dt){if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').style.opacity=0;}if(!paused&&!state.over){clock+=dt;stepGame(state,dt,input());if(state.events.length)toast(state.events.splice(0).at(-1));if(state.over){clearInput();$('overlay').hidden=false;text('result',population(state)+' habitants rassemblés · '+state.kills+' assaillants repoussés. Valdor attend votre retour.');}}ui();}
function draw(){if(view)view.render(state,clock,paused);}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend();$('graphics-error').hidden=false;});canvas.addEventListener('webglcontextrestored',()=>{$('graphics-error').hidden=true;toast('La 3D est rétablie. Reprenez depuis le menu.');});
function drawMap(){
  const c=$('map'),g=c.getContext('2d'),w=c.width,h=c.height,sx=w/(WORLD.maxX-WORLD.minX),sy=h/(WORLD.maxY-WORLD.minY);
  const pos=p=>({x:(p.x-WORLD.minX)*sx,y:(p.y-WORLD.minY)*sy});
  g.fillStyle='#80a94f';g.fillRect(0,0,w,h);g.fillStyle='#3e743b';for(const t of FOREST_TREES){const p=pos(t);g.beginPath();g.arc(p.x,p.y,4*t.size,0,7);g.fill();}
  const seen=new Set(state.explored);g.fillStyle='#132a20dc';for(let y=Math.floor(WORLD.minY/300);y<=Math.ceil(WORLD.maxY/300);y++)for(let x=Math.floor(WORLD.minX/300);x<=Math.ceil(WORLD.maxX/300);x++){if(seen.has(x+','+y))continue;g.fillRect((x*300-WORLD.minX)*sx,(y*300-WORLD.minY)*sy,300*sx+1,300*sy+1);}
  function dot(p,color,r=5,label=''){const q=pos(p);g.fillStyle=color;g.beginPath();g.arc(q.x,q.y,r,0,7);g.fill();if(label){g.font='bold 12px sans-serif';g.textAlign='center';g.fillText(label,q.x,q.y-10);}}
  for(const p of state.landmarks)if(p.known)dot(p,p.looted?'#9aaa8b':'#e7d78f',4);
  for(const p of state.camps)if(p.known&&!p.rescued)dot(p,'#ffd969',4);
  dot(HOME,'#fff3c5',7,'REFUGE');dot(state.horse,'#dbab7d',4);dot(state.king,'#59c9ff',6,'VOUS');
}
function frame(t){const dt=Math.min((t-last)/1000||0,.1);last=t;update(dt);draw();if(view)requestAnimationFrame(frame);}
ui();if(view)requestAnimationFrame(frame);
