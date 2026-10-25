const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
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
  $('pause').setAttribute('aria-pressed',String(paused));
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
function shoot(unit,dt,king){unit.cool-=dt;if(unit.cool>0)return;let target=null,best=king?340:310;for(const e of state.enemies){const d=dist(unit,e);if(d<best){target=e;best=d;}}if(target){unit.cool=king?Math.max(.22,.65-state.level*.045):.95;const dx=target.x-unit.x,dy=target.y-unit.y,d=Math.hypot(dx,dy);state.arrows.push({x:unit.x,y:unit.y-12,vx:dx/d*510,vy:dy/d*510,life:1.1,damage:king?20+state.level*10:25});}}
function update(dt){clock+=dt;if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').style.opacity=0;}if(paused||state.over)return;const s=state,k=s.king;let dx=joy.x,dy=joy.y;if(keys.has('arrowleft')||keys.has('a')||keys.has('q'))dx--;if(keys.has('arrowright')||keys.has('d'))dx++;if(keys.has('arrowup')||keys.has('w')||keys.has('z'))dy--;if(keys.has('arrowdown')||keys.has('s'))dy++;const len=Math.hypot(dx,dy);if(len){k.x=Math.max(40,Math.min(960,k.x+dx/Math.max(1,len)*190*dt));k.y=Math.max(120,Math.min(610,k.y+dy/Math.max(1,len)*190*dt));}shoot(k,dt,true);s.allies.forEach(a=>shoot(a,dt,false));
if(s.left>0){s.spawn-=dt;if(s.spawn<=0){s.spawn=Math.max(.55,1.7-s.wave*.09);s.left--;const side=Math.random();s.enemies.push({x:side<.18?30:side>.82?970:90+Math.random()*820,y:side<.18||side>.82?410+Math.random()*150:690,hp:45+s.wave*9,maxHp:45+s.wave*9,speed:24+s.wave*3,hit:0});}}else if(!s.enemies.length){s.rest+=dt;if(s.rest>5){s.wave++;s.left=5+s.wave*2;s.rest=0;s.spawn=1;toast('Vague '+s.wave+' · Préparez vos archers !');}}
for(const e of s.enemies){const d=dist(e,home);if(d>65){e.x+=(home.x-e.x)/d*e.speed*dt;e.y+=(home.y-e.y)/d*e.speed*dt;}else{s.hp-=dt*(4+s.wave*.7);e.hit+=dt;}if(dist(e,k)<24){const d2=dist(e,k)||1;k.x=Math.max(35,Math.min(965,k.x+(k.x-e.x)/d2*70*dt));k.y=Math.max(120,Math.min(615,k.y+(k.y-e.y)/d2*70*dt));}}
for(const a of s.arrows){a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt;for(const e of s.enemies){if(e.hp>0&&dist(a,e)<24){e.hp-=a.damage;a.life=0;for(let i=0;i<4;i++)s.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*70,vy:-Math.random()*65,life:.4});break;}}}s.arrows=s.arrows.filter(a=>a.life>0);s.enemies=s.enemies.filter(e=>{if(e.hp>0)return true;s.kills++;s.coins.push({x:e.x,y:e.y,value:10,age:0});beep(200);return false;});
s.coins=s.coins.filter(c=>{c.age+=dt;const d=dist(c,k);if(d<105){c.x+=(k.x-c.x)*dt*9;c.y+=(k.y-c.y)*dt*9;}if(d<24){s.gold+=c.value;beep(820);return false;}return true;});for(const p of s.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}s.particles=s.particles.filter(p=>p.life>0);if(s.hp<=0){s.hp=0;s.over=true;clearInput();$('overlay').hidden=false;$('result').textContent=`${s.kills} ennemis vaincus · Vague ${s.wave}. Votre prochaine armée sera plus forte.`;}ui();}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function tree(x,y,size=1){ellipse(x+10,y+15,25*size,10*size,'#425b3e35');rect(x-4,y-25*size,8,35*size,'#6d6043');for(let i=0;i<3;i++){poly([[x-25*size+i*4,y-i*18*size],[x,y-65*size-i*12],[x+25*size-i*4,y-i*18*size]],i%2?'#426b4d':'#507f52');}}
function fence(x1,y1,x2,y2){ctx.strokeStyle='#69523b';ctx.lineWidth=6;for(const off of [3,17]){ctx.beginPath();ctx.moveTo(x1,y1-off);ctx.lineTo(x2,y2-off);ctx.stroke();}const len=Math.hypot(x2-x1,y2-y1);for(let i=0;i<=len;i+=15){const t=i/len,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;poly([[x-4,y+7],[x-4,y-26],[x,y-33],[x+4,y-26],[x+4,y+7]],'#a08055');rect(x-2,y-25,2,28,'#c2a16a');}}
function person(p,type){const enemy=type==='enemy',king=type==='king',x=p.x,y=p.y,bob=Math.sin(clock*7+x)*1.4;ellipse(x,y+8,14,6,'#314b3940');rect(x-7,y-3,5,12,'#35413c');rect(x+2,y-3,5,12,'#35413c');poly([[x-10,y-22+bob],[x+9,y-22+bob],[x+12,y+1],[x-11,y+1]],enemy?'#ad4743':king?'#437fba':'#e9d4a2');if(king)poly([[x-9,y-22],[x-16,y+6],[x-4,y+3]],'#315a9b');ellipse(x,y-29+bob,8,9,'#edc494');if(enemy){ellipse(x,y-34+bob,9,6,'#7d343a');rect(x-9,y-33+bob,18,4,'#c05a4f');}else if(king){poly([[x-9,y-35+bob],[x-10,y-45+bob],[x-4,y-41+bob],[x,y-48+bob],[x+4,y-41+bob],[x+10,y-45+bob],[x+9,y-35+bob]],'#f6cf62');rect(x-7,y-37+bob,14,3,'#b88e3e');}else{ellipse(x,y-35+bob,9,6,'#344b43');}if(!enemy){ctx.strokeStyle='#725139';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x+12,y-14,12,-1.3,1.3);ctx.stroke();ctx.strokeStyle='#f5e3b4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+15,y-26);ctx.lineTo(x+15,y-2);ctx.stroke();}else{ctx.strokeStyle='#d7c9ae';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+12,y-1);ctx.lineTo(x+19,y-25);ctx.stroke();if(p.hp<p.maxHp){rect(x-14,y-50,28,4,'#493c32');rect(x-14,y-50,28*p.hp/p.maxHp,4,'#df7660');}}}
function draw(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(r.width*dpr)||canvas.height!==Math.round(r.height*dpr)){canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}const scale=Math.max(canvas.width/W,canvas.height/H),viewWidth=canvas.width/scale,viewHeight=canvas.height/scale,cameraX=Math.max(0,Math.min(W-viewWidth,state.king.x-viewWidth/2)),cameraY=Math.max(0,Math.min(H-viewHeight,state.king.y-viewHeight*.6));ctx.setTransform(scale,0,0,scale,-cameraX*scale,-cameraY*scale);rect(0,0,W,H,'#8fa769');
for(let i=0;i<100;i++){const x=(i*137.3)%W,y=(i*83.7)%H;ellipse(x,y,18+i%15,8,'#9fb97940');if(i%3===0){ctx.strokeStyle='#718c5060';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y-6);ctx.moveTo(x,y);ctx.lineTo(x+3,y-4);ctx.stroke();}}
ctx.strokeStyle='#c5b589';ctx.lineWidth=85;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(510,700);ctx.bezierCurveTo(470,530,570,430,500,245);ctx.stroke();ctx.strokeStyle='#d1bf9340';ctx.lineWidth=60;ctx.stroke();ellipse(500,255,195,120,'#b7bc8460');
for(const [x,y,s]of[[65,130,1.4],[150,85,1],[870,125,1.5],[940,220,.9],[70,420,.8],[910,560,1.3],[170,590,.9],[790,70,1]])tree(x,y,s);
for(const [x,y]of[[210,380],[820,350],[130,500],[740,595]]){ellipse(x,y,18,10,'#4b63422a');poly([[x-15,y],[x-9,y-15],[x+5,y-19],[x+17,y-7],[x+12,y+4]],'#a2a58c');poly([[x-9,y-15],[x+5,y-19],[x+17,y-7],[x,y-5]],'#bdc0a7');}
fence(290,205,290,365);fence(710,205,710,365);fence(290,365,435,365);fence(565,365,710,365);
ellipse(510,260,90,25,'#3e513a35');poly([[430,193],[500,157],[570,193],[570,258],[430,258]],'#e1cc9b');poly([[500,157],[570,193],[570,258],[500,225]],'#b49a70');rect(465,211,29,47,'#5b5642');rect(469,215,21,43,'#424d3d');rect(525,207,24,21,'#5b715b');rect(535,207,3,21,'#dabd88');rect(525,216,24,3,'#dabd88');poly([[417,194],[497,134],[583,190],[566,205],[497,157],[431,208]],'#6f6154');poly([[417,194],[497,134],[506,142],[435,201]],'#a6896a');for(let i=0;i<5;i++){ctx.strokeStyle='#574f47';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(503+i*12,150+i*7);ctx.lineTo(484+i*14,166+i*8);ctx.stroke();}rect(542,133,15,32,'#867861');rect(539,130,21,8,'#b3a281');rect(498,112,3,31,'#6d614c');poly([[501,111],[531,117],[501,128]],'#d9bd66');ellipse(500,272,55,11,'#c7b88c');
ctx.strokeStyle='#f9e5a34a';ctx.lineWidth=2;ctx.setLineDash([5,9]);ctx.beginPath();ctx.ellipse(state.king.x,state.king.y,100,58,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
for(const c of state.coins){const b=Math.sin(clock*5+c.x)*3;ellipse(c.x,c.y+4,10,4,'#65553535');ellipse(c.x,c.y-4+b,9,10,'#ba872e');ellipse(c.x,c.y-6+b,8,9,'#f1d16c');ctx.fillStyle='#b88a31';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('✦',c.x,c.y-2+b);}
const actors=[...state.allies.map(p=>({p,t:'ally'})),...state.enemies.map(p=>({p,t:'enemy'})),{p:state.king,t:'king'}].sort((a,b)=>a.p.y-b.p.y);actors.forEach(a=>person(a.p,a.t));
for(const a of state.arrows){const n=Math.hypot(a.vx,a.vy),dx=a.vx/n,dy=a.vy/n;ctx.strokeStyle='#fff0c3';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(a.x-dx*15,a.y-dy*15);ctx.lineTo(a.x,a.y);ctx.stroke();poly([[a.x+dx*5,a.y+dy*5],[a.x-dy*3,a.y+dx*3],[a.x+dy*3,a.y-dx*3]],'#e7f6f3');}for(const p of state.particles)ellipse(p.x,p.y,2,2,'#f3d79b');if(paused){ctx.setTransform(1,0,0,1,0,0);rect(0,0,canvas.width,canvas.height,'#14291eaa');ctx.fillStyle='#f8ecd0';ctx.font=`500 ${26*dpr}px sans-serif`;ctx.textAlign='center';ctx.fillText('PAUSE',canvas.width/2,canvas.height/2);}}
function frame(t){const dt=Math.min((t-last)/1000||0,.04);last=t;update(dt);draw();requestAnimationFrame(frame);}reset();requestAnimationFrame(frame);
