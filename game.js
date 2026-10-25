import {createWorld,CAMERA_YAW} from './world3d.js';
import {HOME,WORLD,FOREST_TREES} from './world-data.js';
import {JOBS,BUILDINGS,TECHS,RESOURCE_LABELS} from './kingdom-data.js';
import {GAME_NAME} from './brand.js';
import {createGame,stepGame,interaction,interact,buy,population,quotas,costs,distance,objective,assignJob,setWeapon,useAxe,placementStatus,placeBuilding,upgradeBuilding,demolishBuilding,research,setWage,customizeKing,kingdomStats} from './simulation.js';
const $=id=>document.getElementById(id),canvas=$('game');
let state=createGame(),paused=true,view,last=0,clock=0,noticeTime=0,sound=false,audio,tab='kingdom',placement=null,lastUI=-1,armedDemolition=null;
canvas.tabIndex=0;
const keys=new Set(),joy={x:0,y:0},pointer={id:null},joystick=$('stick');
const resourceIcons={gold:'✦',wood:'♧',stone:'◆',food:'♨',iron:'⬡',weapons:'⚔',knowledge:'✧'};
const buildingIcons={house:'⌂',wall:'▥',farm:'♧',forge:'⚒',academy:'✧',treasury:'♛'};
const jobIcons={worker:'⚒',builder:'⌂',knight:'⚔',farmer:'♧',armorer:'⚒',inventor:'✧'};
const buildingDescriptions={house:'10 places à chaque niveau achevé.',wall:'Un rempart qui protège le royaume.',farm:'Cultures et élevage pour les fermiers.',forge:'Les armuriers y forgent et réparent les armes.',academy:'Un lieu de savoir pour vos inventeurs.',treasury:'Organise la richesse de votre royaume.'};
const htmlCache=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const integer=n=>Math.floor(Number(n)||0).toLocaleString('fr-FR');
function text(id,value){const v=String(value);if($(id).textContent!==v)$(id).textContent=v;}
function html(id,value){if(htmlCache.get(id)!==value){$(id).innerHTML=value;htmlCache.set(id,value);}}
function price(cost){return Object.entries(cost||{}).map(([k,n])=>`${integer(n)} ${k==='gold'?'pièces':RESOURCE_LABELS[k]||k}`).join(' · ');}
function affordable(cost){return Object.entries(cost||{}).every(([k,n])=>(k==='gold'?state.gold:state.resources[k]||0)>=n);}
function liveAppearance(){return{name:$('king-name').value,cape:$('appearance-cape').value,hair:$('appearance-hair').value,beard:$('appearance-beard').value,skin:$('appearance-skin').value,crown:$('appearance-crown').value};}
function previewKing(){const a=liveAppearance();customizeKing(state,{...a,name:a.name.trim()||'Votre Majesté'});text('portrait-name',a.name.trim()||'Votre Majesté');if(view)view.setPortrait?.(true);ui(true);}
try{view=createWorld(canvas);view.setPortrait?.(true);}catch(error){$('graphics-error').hidden=false;console.error('Démarrage 3D impossible',error);}
function toast(message){text('notice',message);noticeTime=5;$('notice').style.opacity=1;}
function feedback(result){if(!result)return;text('menu-feedback',result.text||'');toast(result.text||'');if(result.ok)beep(630);ui(true);}
function summaryCard(title,value,note){return`<article class="summary-card"><small>${esc(title)}</small><strong>${esc(value)}</strong><em>${esc(note)}</em></article>`;}
function ui(force=false){
  const now=performance.now();if(!force&&now-lastUI<180)return;lastUI=now;
  const stats=kingdomStats(state),k=state.king;
  text('gold',integer(state.gold));text('army',stats.population+' / '+stats.capacity);text('hud-food',integer(state.resources.food));
  text('hud-king-name',k.appearance.name);text('king-level','Niveau '+k.heroLevel);text('king-xp',integer(k.xp)+' XP');
  text('hp',Math.ceil(state.hp)+' / '+state.maxHp);$('healthbar').style.width=Math.max(0,state.hp/state.maxHp)*100+'%';
  const phase=state.phase==='peace'?'Accalmie':state.phase==='warning'?'Assaut dans '+Math.ceil(state.phaseRemaining)+' s':'Royaume attaqué';
  text('wave','Jour '+state.day+' · '+phase);$('wave').classList.toggle('danger',state.phase!=='peace');text('objective',objective(state));
  const d=distance(k,HOME),angle=Math.atan2(HOME.x-k.x,HOME.y-k.y)-CAMERA_YAW,arrows=['↓','↘','→','↗','↑','↖','←','↙'];
  text('home-direction',(d<210?'⌂ Au refuge':arrows[(Math.round(angle/(Math.PI/4))+8)%8]+' Refuge · '+Math.round(d/40)+' m')+(k.mounted?' · À cheval':'')+(state.followers.length?' · '+state.followers.length+' rescapé(s) vous suivent':''));
  const a=interaction(state);$('interact').hidden=!a||paused||!!placement||state.over;if(a)text('interact-label',a.text);
  $('axe-action').hidden=k.weapon!=='axe'||paused||!!placement||state.over;
  $('weapon-bow').setAttribute('aria-pressed',String(k.weapon==='bow'));$('weapon-axe').setAttribute('aria-pressed',String(k.weapon==='axe'));
  document.querySelector('.action-dock').hidden=paused||!!placement||state.over;joystick.hidden=paused||state.over;
  document.querySelector('.arena').classList.toggle('creating',!$('intro').hidden);
  if(placement)updatePlacement();
  if($('menu').hidden)return;
  text('kingdom-level','Royaume · niv. '+stats.kingdom.level);
  if(tab==='kingdom'){
    html('kingdom-summary',summaryCard('Logements',stats.population+' / '+stats.capacity,stats.availableHousing+' place(s) libres · '+stats.pending+' en route')+summaryCard('Motivation',Math.round(stats.motivation)+' %',Math.round(stats.efficiency*100)+' % d’efficacité moyenne')+summaryCard('Métiers attribués',stats.population-stats.unassigned,stats.unassigned+' habitant(s) attendent vos ordres')+summaryCard('Chantiers',stats.buildings.construction+stats.buildings.upgrades,stats.buildings.complete+' ouvrage(s) achevés'));
    html('resources-summary',Object.entries(resourceIcons).map(([key,icon])=>`<article class="resource-card"><span>${icon}</span><strong>${integer(key==='gold'?state.gold:state.resources[key])}</strong><small>${esc(key==='gold'?'Trésor':RESOURCE_LABELS[key])}</small></article>`).join(''));
    const alerts=[...stats.alerts];if(!stats.population)alerts.unshift('Retrouvez votre premier survivant dans les bois, puis ramenez-le au refuge.');if(!stats.jobs.builder&&stats.buildings.construction)alerts.push('Affectez un constructeur pour avancer les chantiers.');if(stats.jobs.farmer&&!state.buildings.some(b=>b.type==='farm'&&b.complete&&!b.destroyed))alerts.push('Vos fermiers attendent une ferme terminée.');if(stats.jobs.armorer&&!state.buildings.some(b=>b.type==='forge'&&b.complete&&!b.destroyed))alerts.push('Vos armuriers attendent une forge.');
    if(!alerts.length)alerts.push('Le royaume fonctionne normalement. Explorez, récoltez et préparez vos défenses.');
    html('kingdom-alerts',alerts.map(a=>'<li>'+esc(a)+'</li>').join(''));
    text('hero-progress','Roi : '+integer(stats.hero.xp)+' / '+integer(stats.hero.nextXP)+' XP · niveau '+stats.hero.level);
    text('realm-progress','Royaume : '+integer(stats.kingdom.xp)+' / '+integer(stats.kingdom.nextXP)+' XP · niveau '+stats.kingdom.level);
    const pay=stats.payroll;
    text('payroll-summary',pay.enabled?`${pay.workers} travailleurs · prochaine paie : ${integer(pay.due)} pièces dans ${Math.ceil(pay.timer)} s. Dernier versement : ${integer(pay.lastPaid)}. Impayés cumulés : ${integer(pay.arrears)} pièces. ${pay.affordable?'La prochaine paie est couverte.':'Le trésor est insuffisant : la motivation baissera.'}`:'Les salaires deviennent nécessaires au niveau 3 du royaume ou à partir de 10 habitants. Préparez votre trésorerie : les impayés démotivent les travailleurs.');
    if(document.activeElement!==$('wage-input'))$('wage-input').value=String(pay.wage);
    const q=stats.quotas;for(const name of ['natural','hired','rescued'])text(name+'-count',state.counts[name]+' / '+q[name]);
    text('settlement-status',`${stats.jobs.knight} chevalier(s) · nourriture : ${stats.foodBalance>=0?'+':''}${(stats.foodBalance*60).toFixed(1)} / minute · commerce : +${Number(stats.incomePerMinute||0).toFixed(1)} pièces / minute · ${d<210?'Vous êtes au refuge.':'Revenez au refuge pour accueillir des engagés et améliorer l’arc.'}`);
    const c=costs(state);text('recruitCost','✦ '+c.recruit);text('upgradeCost','✦ '+c.upgrade);
    $('recruit').disabled=state.over||d>210||state.phase!=='peace'||!state.counts.rescued||stats.availableHousing<1||state.counts.hired>=q.hired||state.gold<c.recruit;
    $('upgrade').disabled=state.over||d>210||state.phase!=='peace'||state.gold<c.upgrade;
  }
  if(tab==='residents')renderResidents(stats);
  if(tab==='build')renderBuildings(stats);
  if(tab==='technology')renderResearch(stats);
  if(tab==='story')text('story-objective',objective(state));
  if(tab==='map')drawMap();
}
function renderResidents(stats){
  text('unassigned-count',stats.unassigned+' métier(s) à choisir');
  html('job-guide',Object.entries(JOBS).map(([key,job])=>`<article><strong>${jobIcons[key]} ${esc(job.label)}</strong><p>${esc(job.description)}${job.unlockLevel>1?' · Royaume niveau '+job.unlockLevel:''}</p></article>`).join(''));
  const sourceNames={rescued:'Survivant secouru',hired:'Habitant engagé',natural:'Arrivée spontanée'};
  const hasAcademy=state.buildings.some(b=>b.type==='academy'&&b.complete&&!b.destroyed);
  html('citizen-list',state.allies.length?state.allies.map(p=>`<article class="citizen-card"><div><strong>${esc(p.name)}</strong><small>${sourceNames[p.source]||''} · niveau ${p.level||1}<br>${integer(p.xp)} XP · ${p.equipped?'Arme équipée':'Sans arme'}</small></div><select data-citizen-id="${esc(p.id)}" aria-label="Métier de ${esc(p.name)}"><option value="unassigned" ${p.job==='unassigned'?'selected':''}>Choisir un métier</option>${Object.entries(JOBS).map(([key,j])=>`<option value="${key}" ${p.job===key?'selected':''} ${key==='inventor'&&(state.kingdomLevel<4||!hasAcademy)?'disabled':''}>${esc(j.label)}${key==='inventor'?' · niveau 4 + académie':''}</option>`).join('')}</select><div><small>Motivation ${Math.round(p.motivation)} % · ${p.wage} pièces / cycle<br>${esc(p.workStatus||'En attente')}</small><div class="motivation-bar"><i style="width:${Math.max(0,Math.min(100,p.motivation))}%"></i></div></div></article>`).join(''):'<div class="empty-state">Votre peuple n’est pas encore arrivé.<br>Secourez un survivant en forêt et ramenez-le au refuge.</div>');
}
function renderBuildings(stats){
  html('build-catalog',Object.entries(BUILDINGS).map(([key,b])=>`<button class="build-card" data-build-type="${key}" ${state.kingdomLevel<b.unlockLevel||state.phase!=='peace'||state.over?'disabled':''}><span>${buildingIcons[key]||'⌂'}</span><strong>${esc(b.label)}</strong><small>${esc(buildingDescriptions[key]||'')}${b.unlockLevel>1?' · Royaume niv. '+b.unlockLevel:''}</small><em>${esc(price(b.cost))}</em></button>`).join(''));
  html('building-list',state.buildings.map(b=>{
    const def=BUILDINGS[b.type],pct=Math.max(0,Math.min(100,100*(b.upgrading?b.upgradeProgress/(b.upgradeWork||1):b.progress/(b.work||1))));
    const status=b.destroyed?(b.demolished?'Retiré':'Détruit'):b.upgrading?'Amélioration · '+Math.floor(pct)+' %':b.complete?'Terminé · '+Math.ceil(b.hp)+' / '+b.maxHp+' PV':'Construction · '+Math.floor(pct)+' %';
    const upgradeCost=Object.fromEntries(Object.entries(def.cost).map(([k,n])=>[k,Math.ceil(n*(.8+b.level*.45))]));
    return`<article class="building-card"><div><strong>${buildingIcons[b.type]||''} ${b.isRefuge?'Refuge royal':esc(def.label)} · niv. ${b.level}</strong><p>${status}${b.complete&&def.housing?' · '+def.housing*b.level+' places':''}</p>${!b.complete||b.upgrading?`<div class="construction-bar"><i style="width:${pct}%"></i></div>`:''}<small class="explain">${!b.complete&&!stats.jobs.builder?'En attente d’un constructeur.':''}</small></div><div class="building-actions"><button data-upgrade-building="${esc(b.id)}" ${!b.complete||b.upgrading||b.destroyed||b.level>=def.maxLevel||state.phase!=='peace'||!affordable(upgradeCost)?'disabled':''}>${b.level>=def.maxLevel?'Niveau maximal':'Améliorer'}${b.level<def.maxLevel?'<br><small>'+esc(price(upgradeCost))+'</small>':''}</button>${!b.isRefuge&&!b.destroyed?`<button class="remove-building" data-demolish-building="${esc(b.id)}">${armedDemolition===b.id?'Confirmer le retrait':'Retirer · récup. 50 %'}</button>`:''}</div></article>`;
  }).join(''));
}
function renderResearch(){
  const r=state.research;
  html('research-status',r?`<h4>${esc(TECHS[r.key]?.label||'Recherche')}</h4><p>Travail des inventeurs : ${Math.floor(r.progress)} / ${r.work}</p><div class="construction-bar"><i style="width:${Math.min(100,r.progress/r.work*100)}%"></i></div>`:'<h4>Les idées deviennent un héritage.</h4><p>Affectez un inventeur à une académie terminée. Le savoir qu’il produit ouvre de nouvelles possibilités pour le royaume.</p>');
  const ready=state.kingdomLevel>=4&&state.buildings.some(b=>b.type==='academy'&&b.complete&&!b.destroyed)&&state.allies.some(p=>p.job==='inventor');
  html('research-list',Object.entries(TECHS).map(([key,t])=>`<article class="research-card"><div><strong>${esc(t.label)}</strong><p>${esc(t.description)}</p><small class="explain">${esc(price(t.cost))}</small></div><button data-tech="${key}" ${!ready||r||state.tech.includes(key)||!affordable(t.cost)?'disabled':''}>${state.tech.includes(key)?'Acquis':r?.key===key?'En cours':'Rechercher'}</button></article>`).join(''));
}
function selectTab(name){tab=name;for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===name));for(const el of document.querySelectorAll('.tab'))el.hidden=el.id!=='tab-'+name;ui(true);}
function openMenu(name){if(state.over||!$('intro').hidden)return;cancelPlacement();paused=true;clearInput();$('menu').hidden=false;$('menu-button').setAttribute('aria-expanded','true');text('menu-feedback','');if(name)selectTab(name);else ui(true);$('close-menu').focus();}
function closeMenu(){if(!$('intro').hidden||state.over)return;$('menu').hidden=true;paused=false;$('menu-button').setAttribute('aria-expanded','false');clearInput();canvas.focus({preventScroll:true});ui(true);}
function toggleMenu(){if($('menu').hidden)openMenu();else closeMenu();}
$('menu-button').onclick=()=>openMenu();$('close-menu').onclick=closeMenu;$('resume').onclick=closeMenu;
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>selectTab(b.dataset.tab);
for(const id of ['king-name','appearance-cape','appearance-hair','appearance-beard','appearance-skin','appearance-crown'])$(id).addEventListener('input',previewKing);
$('king-creation').onsubmit=e=>{e.preventDefault();const result=customizeKing(state,liveAppearance());if(!result.ok){toast(result.text);return;}$('intro').hidden=true;paused=false;view?.setPortrait?.(false);clearInput();canvas.focus({preventScroll:true});toast('Bienvenue dans '+GAME_NAME+'. Retrouvez les survivants et choisissez leur avenir.');ui(true);};
$('restart').onclick=()=>{const appearance={...state.king.appearance};state=createGame();customizeKing(state,appearance);$('overlay').hidden=true;$('menu').hidden=true;$('intro').hidden=true;paused=false;cancelPlacement();clearInput();view?.setPortrait?.(false);canvas.focus({preventScroll:true});ui(true);};
for(const kind of ['recruit','upgrade'])$(kind).onclick=()=>feedback(buy(state,kind));
$('apply-wage').onclick=()=>feedback(setWage(state,Number($('wage-input').value)));
$('citizen-list').onchange=e=>{const select=e.target.closest('[data-citizen-id]');if(select)feedback(assignJob(state,select.dataset.citizenId,select.value));};
$('build-catalog').onclick=e=>{const button=e.target.closest('[data-build-type]');if(button)beginPlacement(button.dataset.buildType);};
$('building-list').onclick=e=>{
  const remove=e.target.closest('[data-demolish-building]');
  if(remove){const id=remove.dataset.demolishBuilding;if(armedDemolition!==id){armedDemolition=id;text('menu-feedback','Retirer cet ouvrage rend 50 % de son coût initial. Les logements seront retirés de la capacité. Cliquez de nouveau pour confirmer.');ui(true);}else{armedDemolition=null;feedback(demolishBuilding(state,id));}return;}
  const button=e.target.closest('[data-upgrade-building]');if(button)feedback(upgradeBuilding(state,button.dataset.upgradeBuilding));
};
$('research-list').onclick=e=>{const button=e.target.closest('[data-tech]');if(button)feedback(research(state,button.dataset.tech));};
function equip(weapon){if(!paused&&!state.over)feedback(setWeapon(state,weapon));}
$('weapon-bow').onclick=()=>equip('bow');$('weapon-axe').onclick=()=>equip('axe');
function axe(){if(!paused&&!placement&&!state.over){feedback(useAxe(state));canvas.focus({preventScroll:true});}}
$('axe-action').onclick=axe;
function performInteract(){if(!paused&&!placement&&!state.over){feedback(interact(state));canvas.focus({preventScroll:true});}}
$('interact').onclick=performInteract;
function beginPlacement(type){if(!BUILDINGS[type])return;closeMenu();placement={type,x:state.king.x+160,y:state.king.y+150,rotation:0,valid:false};document.querySelector('.arena').classList.add('placing');$('placement-controls').hidden=false;clearInput();updatePlacement();toast('Touchez le terrain pour choisir l’emplacement, puis confirmez.');ui(true);}
function updatePlacement(){if(!placement)return;const check=placementStatus(state,placement.type,placement.x,placement.y,placement.rotation);placement.valid=check.ok;placement.message=check.text;view?.setPlacement?.(placement);text('placement-label',BUILDINGS[placement.type].label+' · '+price(BUILDINGS[placement.type].cost));text('placement-status',check.ok?'Emplacement disponible · '+Math.round(placement.rotation*180/Math.PI)+'°':check.text);$('place-confirm').disabled=!check.ok;}
function cancelPlacement(){placement=null;$('placement-controls').hidden=true;document.querySelector('.arena').classList.remove('placing');view?.setPlacement?.(null);}
function rotatePlacement(){if(!placement)return;placement.rotation=(placement.rotation+Math.PI/2)%(Math.PI*2);updatePlacement();}
function confirmPlacement(){if(!placement)return;const p={...placement},result=placeBuilding(state,p.type,p.x,p.y,p.rotation);feedback(result);if(result.ok){if(p.type==='wall'){placement.x+=Math.cos(p.rotation)*BUILDINGS.wall.width;placement.y+=Math.sin(p.rotation)*BUILDINGS.wall.width;updatePlacement();}else cancelPlacement();}canvas.focus({preventScroll:true});ui(true);}
$('place-confirm').onclick=confirmPlacement;$('place-cancel').onclick=()=>{cancelPlacement();canvas.focus({preventScroll:true});ui(true);};$('place-rotate').onclick=rotatePlacement;
function chooseWorldPoint(e){if(!placement||!view?.screenToWorld)return;const p=view.screenToWorld(e.clientX,e.clientY);if(p){placement.x=Math.round(p.x/10)*10;placement.y=Math.round(p.y/10)*10;updatePlacement();}}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')chooseWorldPoint(e);});canvas.addEventListener('pointerdown',e=>{if(placement){e.preventDefault();chooseWorldPoint(e);}});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Le terrain occupe toute la fenêtre. Sur iPhone, utilisez l’ajout à l’écran d’accueil.');}catch{toast('Le navigateur refuse ce mode. Le terrain reste adapté à toute la fenêtre.');}};
document.addEventListener('fullscreenchange',()=>text('fullscreen',document.fullscreenElement?'⛶ Quitter le plein écran':'⛶ Passer en plein écran'));
$('zoom').oninput=()=>view?.setZoom(Number($('zoom').value));
function beep(freq){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.12);}catch{}}
$('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));text('sound','Son : '+(sound?'activé':'désactivé'));beep(440);};
const movementKeys=new Set(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','z','q']);
addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  const key=e.key.toLowerCase();
  if(placement&&key==='escape'){e.preventDefault();cancelPlacement();ui(true);return;}
  if(placement&&(key==='r'||key==='enter')){e.preventDefault();if(!e.repeat)(key==='r'?rotatePlacement:confirmPlacement)();return;}
  if(key==='b'&&!e.repeat&&!$('intro').hidden)return;
  if(key==='b'&&!e.repeat){e.preventDefault();openMenu('build');return;}
  if(['escape','m'].includes(key)||(e.code==='Space'&&!e.target.closest?.('button,a'))){e.preventDefault();if(!e.repeat)toggleMenu();return;}
  if(key==='e'&&!e.repeat&&!e.target.closest?.('button,input')){e.preventDefault();performInteract();}
  if(key==='f'&&!e.repeat){e.preventDefault();axe();}
  if(key==='1'||key==='2'){e.preventDefault();equip(key==='1'?'bow':'axe');}
  if(movementKeys.has(key)&&!paused){e.preventDefault();keys.add(key);}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function releaseStick(){const id=pointer.id;pointer.id=null;joy.x=joy.y=0;$('knob').style.transform='';if(id!==null&&joystick.hasPointerCapture(id))joystick.releasePointerCapture(id);}
function clearInput(){keys.clear();releaseStick();}
function suspend(){clearInput();if(!paused&&!state.over)openMenu();}
addEventListener('blur',suspend);addEventListener('pagehide',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});addEventListener('resize',clearInput);
function stick(e){const r=joystick.getBoundingClientRect(),radius=(r.width-44)/2,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),m=Math.min(radius,d);joy.x=d?dx/d*m/radius:0;joy.y=d?dy/d*m/radius:0;$('knob').style.transform=`translate(${joy.x*radius}px,${joy.y*radius}px)`;}
joystick.addEventListener('pointerdown',e=>{if(pointer.id!==null||paused||state.over||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();pointer.id=e.pointerId;joystick.setPointerCapture(e.pointerId);stick(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer.id)stick(e);});
function endStick(e){if(e.pointerId===pointer.id)releaseStick();}joystick.addEventListener('lostpointercapture',endStick);addEventListener('pointerup',endStick);addEventListener('pointercancel',endStick);
function input(){let x=joy.x,y=joy.y;if(keys.has('arrowleft')||keys.has('q')||keys.has('a'))x--;if(keys.has('arrowright')||keys.has('d'))x++;if(keys.has('arrowup')||keys.has('z')||keys.has('w'))y--;if(keys.has('arrowdown')||keys.has('s'))y++;return{x:x*Math.cos(CAMERA_YAW)+y*Math.sin(CAMERA_YAW),y:-x*Math.sin(CAMERA_YAW)+y*Math.cos(CAMERA_YAW)};}
function update(dt){if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').style.opacity=0;}if(!paused&&!state.over){clock+=dt;stepGame(state,dt,input());if(state.events.length)toast(state.events.splice(0).at(-1));if(state.over){clearInput();cancelPlacement();$('overlay').hidden=false;text('result',population(state)+' habitants · royaume niveau '+state.kingdomLevel+' · '+state.kills+' assaillants repoussés. Votre héritage attend votre retour.');}}ui();}
function draw(){if(view)view.render(state,clock,paused);}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend();$('graphics-error').hidden=false;});canvas.addEventListener('webglcontextrestored',()=>{$('graphics-error').hidden=true;toast('La 3D est rétablie. Reprenez depuis le menu.');});
function drawMap(){const c=$('map'),g=c.getContext('2d'),w=c.width,h=c.height,sx=w/(WORLD.maxX-WORLD.minX),sy=h/(WORLD.maxY-WORLD.minY),pos=p=>({x:(p.x-WORLD.minX)*sx,y:(p.y-WORLD.minY)*sy});g.fillStyle='#80a94f';g.fillRect(0,0,w,h);g.fillStyle='#3e743b';for(const t of FOREST_TREES){const p=pos(t);g.beginPath();g.arc(p.x,p.y,4*t.size,0,7);g.fill();}const seen=new Set(state.explored);g.fillStyle='#132a20dc';for(let y=Math.floor(WORLD.minY/300);y<=Math.ceil(WORLD.maxY/300);y++)for(let x=Math.floor(WORLD.minX/300);x<=Math.ceil(WORLD.maxX/300);x++)if(!seen.has(x+','+y))g.fillRect((x*300-WORLD.minX)*sx,(y*300-WORLD.minY)*sy,300*sx+1,300*sy+1);function dot(p,color,r=5,label=''){const q=pos(p);g.fillStyle=color;g.beginPath();g.arc(q.x,q.y,r,0,7);g.fill();if(label){g.font='bold 12px sans-serif';g.textAlign='center';g.fillText(label,q.x,q.y-10);}}for(const p of state.landmarks)if(p.known)dot(p,p.looted?'#9aaa8b':'#e7d78f',4);for(const p of state.camps)if(p.known&&!p.rescued)dot(p,'#ffd969',4);for(const b of state.buildings)if(!b.isRefuge&&!b.destroyed){const p=pos(b);g.fillStyle=b.complete?'#72bdf0':'#a4a4a4';g.fillRect(p.x-3,p.y-3,6,6);}dot(HOME,'#fff3c5',7,'REFUGE');dot(state.horse,'#dbab7d',4);dot(state.king,'#59c9ff',6,'VOUS');}
function frame(t){const dt=Math.min((t-last)/1000||0,.1);last=t;update(dt);draw();if(view)requestAnimationFrame(frame);}
previewKing();ui(true);if(view)requestAnimationFrame(frame);
