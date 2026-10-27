import {createWorld,CAMERA_YAW} from './world3d.js';
import {HOME,WORLD,FOREST_TREES} from './world-data.js';
import {JOBS,BUILDINGS,TECHS,RESOURCE_LABELS} from './kingdom-data.js';
import {GAME_NAME,GAME_VERSION} from './brand.js';
import {icon,RESOURCE_KEYS} from './icons.js';
import {createGame,stepGame,interaction,interact,buy,population,quotas,costs,distance,objective,assignJob,setWeapon,useAxe,placementStatus,placeBuilding,upgradeBuilding,demolishBuilding,research,setWage,customizeKing,customizeKingdom,kingdomStats,attackAt,useDash,usePowerAttack,progressionState} from './simulation.js';
const $=id=>document.getElementById(id),canvas=$('game');
let state=createGame(),paused=true,view,last=0,clock=0,noticeTime=0,sound=false,audio,tab='kingdom',placement=null,lastUI=-1,armedDemolition=null;
canvas.tabIndex=0;
const keys=new Set(),joy={x:0,y:0},pointer={id:null},joystick=$('stick');
const resourceIcons=Object.fromEntries(RESOURCE_KEYS.map(key=>[key,icon(key)]));
const compact=new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1});
let targetingPointer=null,lastHeroLevel=state.king.heroLevel,levelRevealTime=0;
const eventQueue=[];
for(const element of document.querySelectorAll('[data-icon]'))element.innerHTML=icon(element.dataset.icon);
document.title=GAME_NAME+' · V'+GAME_VERSION.split('.')[0];
const buildingIcons={house:'⌂',wall:'▥',farm:'♧',forge:'⚒',academy:'✧',treasury:'♛'};
const jobIcons={worker:'⚒',builder:'⌂',knight:'⚔',farmer:'♧',armorer:'⚒',inventor:'✧'};
const buildingDescriptions={house:'10 places à chaque niveau achevé.',wall:'Un rempart qui protège le royaume.',farm:'Cultures et élevage pour les fermiers.',forge:'Les armuriers y forgent et réparent les armes.',academy:'Un lieu de savoir pour vos inventeurs.',treasury:'Organise la richesse de votre royaume.'};
const htmlCache=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const integer=n=>Math.floor(Number(n)||0).toLocaleString('fr-FR');
function text(id,value){const v=String(value);if($(id).textContent!==v)$(id).textContent=v;}
function html(id,value){if(htmlCache.get(id)!==value){$(id).innerHTML=value;htmlCache.set(id,value);}}
function price(cost){return Object.entries(cost||{}).map(([k,n])=>`${integer(n)} ${k==='gold'?'pièces':RESOURCE_LABELS[k]||k}`).join(' · ');}
function priceMarkup(cost){return Object.entries(cost||{}).map(([key,n])=>`<span class="cost-chip">${icon(key)}<b>${integer(n)}</b><small>${key==='gold'?'or':RESOURCE_LABELS[key]||key}</small></span>`).join('');}
function affordable(cost){return Object.entries(cost||{}).every(([k,n])=>(k==='gold'?state.gold:state.resources[k]||0)>=n);}
function liveAppearance(){return{name:$('king-name').value,cape:$('appearance-cape').value,hair:$('appearance-hair').value,beard:$('appearance-beard').value,skin:$('appearance-skin').value,crown:$('appearance-crown').value,outfit:$('appearance-outfit').value,emblem:$('appearance-emblem').value,hairStyle:$('appearance-hair-style').value,eye:$('appearance-eye').value,mountCoat:$('appearance-mount-coat').value};}
function previewKing(){const a=liveAppearance();customizeKing(state,{...a,name:a.name.trim()||'Votre Majesté'});customizeKingdom(state,$('kingdom-name').value||'Valdoria');text('portrait-name',a.name.trim()||'Votre Majesté');if(view)view.setPortrait?.(true);ui(true);}
try{view=createWorld(canvas);view.setPortrait?.(true);}catch(error){$('graphics-error').hidden=false;console.error('Démarrage 3D impossible',error);}
function toast(message){text('notice',message);noticeTime=5;$('notice').style.opacity=1;}
function feedback(result){if(!result)return;text('menu-feedback',result.text||'');toast(result.text||'');if(result.ok)beep(630);ui(true);}
function summaryCard(title,value,note){return`<article class="summary-card"><small>${esc(title)}</small><strong>${esc(value)}</strong><em>${esc(note)}</em></article>`;}
function ui(force=false){
  const now=performance.now();if(!force&&now-lastUI<180)return;lastUI=now;
  const stats=kingdomStats(state),k=state.king;
  for(const key of RESOURCE_KEYS){const value=key==='gold'?state.gold:state.resources[key]||0;text(key==='gold'?'gold':'hud-'+key,compact.format(Math.floor(value)));const tile=document.querySelector('.resource-tile[data-resource="'+key+'"]');tile.setAttribute('aria-label',(key==='gold'?'Or':RESOURCE_LABELS[key])+' : '+integer(value));tile.title=tile.getAttribute('aria-label');}
  text('army',stats.population+' / '+stats.capacity);text('hud-kingdom-name',state.kingdomName||'Valdoria');$('minimap-button').setAttribute('aria-label','Ouvrir la carte de '+(state.kingdomName||'votre royaume'));
  text('hero-hp',Math.ceil(k.hp??100)+' / '+(k.maxHp??100));$('hero-healthbar').style.width=Math.max(0,(k.hp??100)/(k.maxHp??100))*100+'%';
  const journey=progressionState(state);updateSkills(journey);if($('intro').hidden)drawMinimap();
  text('hud-king-name',k.appearance.name);text('king-level','Niveau '+k.heroLevel);text('king-xp',integer(k.xp)+' XP');
  text('hp',Math.ceil(state.hp)+' / '+state.maxHp);$('healthbar').style.width=Math.max(0,state.hp/state.maxHp)*100+'%';
  const phase=state.phase==='peace'?'Accalmie':state.phase==='warning'?'Assaut dans '+Math.ceil(state.phaseRemaining)+' s':'Royaume attaqué';
  text('wave','Jour '+state.day+' · '+phase);$('wave').classList.toggle('danger',state.phase!=='peace');text('objective',objective(state));
  const d=distance(k,HOME),angle=Math.atan2(HOME.x-k.x,HOME.y-k.y)-CAMERA_YAW,arrows=['↓','↘','→','↗','↑','↖','←','↙'];
  text('home-direction',(d<210?'⌂ Au refuge':arrows[(Math.round(angle/(Math.PI/4))+8)%8]+' Refuge · '+Math.round(d/40)+' m')+(k.mounted?' · À cheval':'')+(state.followers.length?' · '+state.followers.length+' rescapé(s) vous suivent':''));
  const a=interaction(state);$('interact').hidden=!a||paused||!!placement||state.over;if(a)text('interact-label',a.text);
  $('axe-action').hidden=k.weapon!=='axe'||paused||!!placement||state.over;
  $('axe-action').disabled=!k.target;html('axe-action','<b>F</b> '+(k.target?'Frapper la cible':'Visez le terrain'));
  $('weapon-bow').setAttribute('aria-pressed',String(k.weapon==='bow'));$('weapon-axe').setAttribute('aria-pressed',String(k.weapon==='axe'));
  document.querySelector('.action-dock').hidden=paused||!!placement||state.over;joystick.hidden=paused||state.over;
  document.querySelector('.arena').classList.toggle('creating',!$('intro').hidden);
  if(placement)updatePlacement();
  if($('menu').hidden)return;
  text('kingdom-level',(state.kingdomName||'Royaume')+' · niv. '+stats.kingdom.level);
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
    const c=costs(state);html('recruitCost',icon('gold')+c.recruit);html('upgradeCost',icon('gold')+c.upgrade);
    $('recruit').disabled=state.over||d>210||state.phase!=='peace'||!state.counts.rescued||stats.availableHousing<1||state.counts.hired>=q.hired||state.gold<c.recruit;
    $('upgrade').disabled=state.over||d>210||state.phase!=='peace'||state.gold<c.upgrade;
  }
  if(tab==='residents')renderResidents(stats);
  if(tab==='build')renderBuildings(stats);
  if(tab==='technology')renderResearch(stats);
  if(tab==='journey')renderJourney(journey);
  if(tab==='story'){text('story-objective',objective(state));text('chronicle-kingdom-name','La renaissance de '+(state.kingdomName||'votre royaume'));}
  if(tab==='map'){text('map-kingdom-name','Les terres de '+(state.kingdomName||'votre royaume'));drawMap();}
}
function renderResidents(stats){
  text('unassigned-count',stats.unassigned+' métier(s) à choisir');
  html('job-guide',Object.entries(JOBS).map(([key,job])=>`<article><strong>${jobIcons[key]} ${esc(job.label)}</strong><p>${esc(job.description)}${job.unlockLevel>1?' · Royaume niveau '+job.unlockLevel:''}</p></article>`).join(''));
  const sourceNames={rescued:'Survivant secouru',hired:'Habitant engagé',natural:'Arrivée spontanée'};
  const hasAcademy=state.buildings.some(b=>b.type==='academy'&&b.complete&&!b.destroyed);
  html('citizen-list',state.allies.length?state.allies.map(p=>`<article class="citizen-card"><div><strong>${esc(p.name)}</strong><small>${sourceNames[p.source]||''} · niveau ${p.level||1}<br>${integer(p.xp)} XP · ${p.equipped?'Arme équipée':'Sans arme'}</small></div><select data-citizen-id="${esc(p.id)}" aria-label="Métier de ${esc(p.name)}"><option value="unassigned" ${p.job==='unassigned'?'selected':''}>Choisir un métier</option>${Object.entries(JOBS).map(([key,j])=>`<option value="${key}" ${p.job===key?'selected':''} ${key==='inventor'&&(state.kingdomLevel<4||!hasAcademy)?'disabled':''}>${esc(j.label)}${key==='inventor'?' · niveau 4 + académie':''}</option>`).join('')}</select><div><small>Motivation ${Math.round(p.motivation)} % · ${p.wage} pièces / cycle<br>${esc(p.workStatus||'En attente')}</small><div class="motivation-bar"><i style="width:${Math.max(0,Math.min(100,p.motivation))}%"></i></div></div></article>`).join(''):'<div class="empty-state">Votre peuple n’est pas encore arrivé.<br>Secourez un survivant en forêt et ramenez-le au refuge.</div>');
}
function renderBuildings(stats){
  html('build-catalog',Object.entries(BUILDINGS).map(([key,b])=>`<button class="build-card" data-build-type="${key}" ${state.kingdomLevel<b.unlockLevel||state.phase!=='peace'||state.over?'disabled':''}><span>${buildingIcons[key]||'⌂'}</span><strong>${esc(b.label)}</strong><small>${esc(buildingDescriptions[key]||'')}${b.unlockLevel>1?' · Royaume niv. '+b.unlockLevel:''}</small><em>${priceMarkup(b.cost)}</em></button>`).join(''));
  html('building-list',state.buildings.map(b=>{
    const def=BUILDINGS[b.type],pct=Math.max(0,Math.min(100,100*(b.upgrading?b.upgradeProgress/(b.upgradeWork||1):b.progress/(b.work||1))));
    const status=b.destroyed?(b.demolished?'Retiré':'Détruit'):b.upgrading?'Amélioration · '+Math.floor(pct)+' %':b.complete?'Terminé · '+Math.ceil(b.hp)+' / '+b.maxHp+' PV':'Construction · '+Math.floor(pct)+' %';
    const upgradeCost=Object.fromEntries(Object.entries(def.cost).map(([k,n])=>[k,Math.ceil(n*(.8+b.level*.45))]));
    return`<article class="building-card"><div><strong>${buildingIcons[b.type]||''} ${b.isRefuge?'Refuge royal':esc(def.label)} · niv. ${b.level}</strong><p>${status}${b.complete&&def.housing?' · '+def.housing*b.level+' places':''}</p>${!b.complete||b.upgrading?`<div class="construction-bar"><i style="width:${pct}%"></i></div>`:''}<small class="explain">${!b.complete&&!stats.jobs.builder?'En attente d’un constructeur.':''}</small></div><div class="building-actions"><button data-upgrade-building="${esc(b.id)}" ${!b.complete||b.upgrading||b.destroyed||b.level>=def.maxLevel||state.phase!=='peace'||!affordable(upgradeCost)?'disabled':''}>${b.level>=def.maxLevel?'Niveau maximal':'Améliorer'}${b.level<def.maxLevel?'<br><small class="cost-list">'+priceMarkup(upgradeCost)+'</small>':''}</button>${!b.isRefuge&&!b.destroyed?`<button class="remove-building" data-demolish-building="${esc(b.id)}">${armedDemolition===b.id?'Confirmer le retrait':'Retirer · récup. 50 %'}</button>`:''}</div></article>`;
  }).join(''));
}
function renderResearch(){
  const r=state.research;
  html('research-status',r?`<h4>${esc(TECHS[r.key]?.label||'Recherche')}</h4><p>Travail des inventeurs : ${Math.floor(r.progress)} / ${r.work}</p><div class="construction-bar"><i style="width:${Math.min(100,r.progress/r.work*100)}%"></i></div>`:'<h4>Les idées deviennent un héritage.</h4><p>Affectez un inventeur à une académie terminée. Le savoir qu’il produit ouvre de nouvelles possibilités pour le royaume.</p>');
  const ready=state.kingdomLevel>=4&&state.buildings.some(b=>b.type==='academy'&&b.complete&&!b.destroyed)&&state.allies.some(p=>p.job==='inventor');
  html('research-list',Object.entries(TECHS).map(([key,t])=>`<article class="research-card"><div><strong>${esc(t.label)}</strong><p>${esc(t.description)}</p><small class="explain">${priceMarkup(t.cost)}</small></div><button data-tech="${key}" ${!ready||r||state.tech.includes(key)||!affordable(t.cost)?'disabled':''}>${state.tech.includes(key)?'Acquis':r?.key===key?'En cours':'Rechercher'}</button></article>`).join(''));
}
function updateSkills(journey){
  for(const [key,level,label]of[['dash',2,'Esquive'],['power',3,'Attaque puissante']]){
    const a=journey.abilities?.[key]||{unlocked:state.king.heroLevel>=level,cooldown:state.king[key+'Cool']||0},cool=Math.max(0,Number(a.cooldown)||0),ready=a.unlocked&&(a.ready??cool<=0),button=$(key+'-action');
    const mounted=key==='dash'&&state.king.mounted,needsTarget=key==='power'&&!state.king.target;
    button.disabled=!ready||needsTarget||paused||state.over||!!placement;button.dataset.ready=String(ready&&!needsTarget);button.title=label+(a.unlocked?(mounted?' · descendez du cheval pour esquiver':needsTarget?' · choisissez une cible sur le terrain':cool>0?' · disponible dans '+Math.ceil(cool)+' s':' · '+(key==='dash'?'Maj':'C')):' · niveau '+level);
    button.setAttribute('aria-label',button.title);text(key+'-status',!a.unlocked?'Niv. '+level:mounted?'À pied':needsTarget?'Visez':cool>0?Math.ceil(cool)+' s':key==='dash'?'Esquive':'Puissance');
  }
}
function renderJourney(journey){
  text('journey-level','Roi · niveau '+state.king.heroLevel);
  html('journey-unlocks',(journey.unlocks||[]).map(u=>`<article class="journey-card ${u.unlocked?'is-unlocked':''}"><span class="journey-level">${u.level}</span><div><small>${u.unlocked?'ACQUIS':'À DÉCOUVRIR'}</small><h4>${esc(u.title)}</h4><p>${esc(u.description)}</p></div></article>`).join(''));
  const d=journey.discoveries||{};text('discovery-progress',(d.known||0)+' lieu(x) révélé(s) · '+(d.cleared||0)+' épreuve(s) surmontée(s) · '+(d.total||0)+' secrets dans ces terres.');
  html('journey-relics',journey.relics?.length?journey.relics.map(r=>`<article class="relic-card"><span>${icon('knowledge')}</span><div><strong>${esc(r.name)}</strong><p>${esc(r.description)}</p></div></article>`).join(''):'<p class="explain">Vos reliques apparaîtront ici lorsque vous aurez surmonté les épreuves des lieux anciens.</p>');
}
function revealLevel(){
  const old=lastHeroLevel;lastHeroLevel=state.king.heroLevel;const journey=progressionState(state),fresh=(journey.unlocks||[]).filter(u=>u.level>old&&u.level<=lastHeroLevel);
  text('level-reveal-title','Niveau '+lastHeroLevel+' · '+(fresh.at(-1)?.title||'Votre légende grandit'));
  text('level-reveal-copy',fresh.map(u=>u.description).join(' ')||'Votre expérience vous ouvre de nouvelles possibilités. Consultez votre Destin au conseil.');
  $('level-reveal').hidden=false;levelRevealTime=8;beep(880);
}
function selectTab(name){tab=name;for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===name));for(const el of document.querySelectorAll('.tab'))el.hidden=el.id!=='tab-'+name;ui(true);}
function openMenu(name){if(state.over||!$('intro').hidden)return;cancelPlacement();paused=true;clearInput();$('menu').hidden=false;$('menu-button').setAttribute('aria-expanded','true');text('menu-feedback','');if(name)selectTab(name);else ui(true);$('close-menu').focus();}
function closeMenu(){if(!$('intro').hidden||state.over)return;$('menu').hidden=true;paused=false;$('menu-button').setAttribute('aria-expanded','false');clearInput();canvas.focus({preventScroll:true});ui(true);}
function toggleMenu(){if($('menu').hidden)openMenu();else closeMenu();}
$('menu-button').onclick=()=>openMenu();$('minimap-button').onclick=()=>openMenu('map');$('close-menu').onclick=closeMenu;$('resume').onclick=closeMenu;
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>selectTab(b.dataset.tab);
for(const id of ['king-name','kingdom-name','appearance-cape','appearance-hair','appearance-beard','appearance-skin','appearance-crown','appearance-outfit','appearance-emblem','appearance-hair-style','appearance-eye','appearance-mount-coat'])$(id).addEventListener('input',previewKing);
const appearancePresets={
  royal:{cape:'#286bc3',hair:'#3b302d',beard:'long',skin:'#efc49b',crown:'classic',outfit:'royal',emblem:'sun',hairStyle:'swept',eye:'#54737b',mountCoat:'chestnut'},
  ranger:{cape:'#26775b',hair:'#805338',beard:'short',skin:'#c58b61',crown:'classic',outfit:'ranger',emblem:'stag',hairStyle:'short',eye:'#6c874c',mountCoat:'ivory'},
  warden:{cape:'#9c2947',hair:'#d6d1c3',beard:'none',skin:'#875535',crown:'spiked',outfit:'warden',emblem:'moon',hairStyle:'braids',eye:'#7470a2',mountCoat:'night'}
};
for(const [name,preset]of Object.entries(appearancePresets))$('preset-'+name).onclick=()=>{for(const [key,value]of Object.entries(preset))$('appearance-'+({hairStyle:'hair-style',mountCoat:'mount-coat'}[key]||key)).value=value;previewKing();};
$('king-creation').onsubmit=e=>{e.preventDefault();const result=customizeKing(state,liveAppearance()),realm=customizeKingdom(state,$('kingdom-name').value);if(!result.ok||!realm.ok){toast(result.ok?realm.text:result.text);return;}$('intro').hidden=true;paused=false;view?.setPortrait?.(false);clearInput();canvas.focus({preventScroll:true});toast('Bienvenue en '+state.kingdomName+'. Touchez le terrain pour viser et attaquer.');ui(true);};
$('restart').onclick=()=>{const appearance={...state.king.appearance},realm=state.kingdomName;state=createGame();customizeKing(state,appearance);customizeKingdom(state,realm);lastHeroLevel=state.king.heroLevel;eventQueue.length=0;$('level-reveal').hidden=true;levelRevealTime=0;$('overlay').hidden=true;$('menu').hidden=true;$('intro').hidden=true;paused=false;cancelPlacement();clearInput();view?.setPortrait?.(false);canvas.focus({preventScroll:true});ui(true);};
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
function performAttack(clientX,clientY){if(paused||placement||state.over||!$('intro').hidden)return;const target=view?.targetAt?.(clientX,clientY,{trees:state.king.weapon==='axe'})||view?.screenToWorld(clientX,clientY);if(!target)return;const result=attackAt(state,target.x,target.y);if(result.ok)beep(state.king.weapon==='bow'?520:240);else if(result.text)toast(result.text);ui(true);canvas.focus({preventScroll:true});}
function performDash(){if(paused||placement||state.over)return;feedback(useDash(state,input()));canvas.focus({preventScroll:true});}
function performPower(){if(paused||placement||state.over)return;feedback(usePowerAttack(state));canvas.focus({preventScroll:true});}
$('dash-action').onclick=performDash;$('power-action').onclick=performPower;
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
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')chooseWorldPoint(e);if(targetingPointer?.id===e.pointerId&&Math.hypot(e.clientX-targetingPointer.x,e.clientY-targetingPointer.y)>12)targetingPointer.moved=true;});
canvas.addEventListener('pointerdown',e=>{if(paused||state.over||e.button!==0||!$('intro').hidden)return;if(placement){e.preventDefault();chooseWorldPoint(e);return;}if(targetingPointer)return;e.preventDefault();targetingPointer={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{const down=targetingPointer;if(!down||down.id!==e.pointerId)return;targetingPointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!down.moved&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<=12&&e.timeStamp-down.time<650)performAttack(e.clientX,e.clientY);});
canvas.addEventListener('pointercancel',e=>{if(targetingPointer?.id===e.pointerId)targetingPointer=null;});canvas.addEventListener('lostpointercapture',e=>{if(targetingPointer?.id===e.pointerId)targetingPointer=null;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
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
  if(key==='shift'&&!e.repeat){e.preventDefault();performDash();}
  if(key==='c'&&!e.repeat){e.preventDefault();performPower();}
  if(key==='f'&&!e.repeat){e.preventDefault();axe();}
  if(key==='1'||key==='2'){e.preventDefault();equip(key==='1'?'bow':'axe');}
  if(movementKeys.has(key)&&!paused){e.preventDefault();keys.add(key);}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function releaseStick(){const id=pointer.id;pointer.id=null;joy.x=joy.y=0;$('knob').style.transform='';if(id!==null&&joystick.hasPointerCapture(id))joystick.releasePointerCapture(id);}
function clearInput(){keys.clear();releaseStick();const id=targetingPointer?.id;targetingPointer=null;if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
function suspend(){clearInput();if(!paused&&!state.over)openMenu();}
addEventListener('blur',suspend);addEventListener('pagehide',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});addEventListener('resize',clearInput);
function stick(e){const r=joystick.getBoundingClientRect(),radius=(r.width-44)/2,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),m=Math.min(radius,d);joy.x=d?dx/d*m/radius:0;joy.y=d?dy/d*m/radius:0;$('knob').style.transform=`translate(${joy.x*radius}px,${joy.y*radius}px)`;}
joystick.addEventListener('pointerdown',e=>{if(pointer.id!==null||paused||state.over||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();pointer.id=e.pointerId;joystick.setPointerCapture(e.pointerId);stick(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer.id)stick(e);});
function endStick(e){if(e.pointerId===pointer.id)releaseStick();}joystick.addEventListener('lostpointercapture',endStick);addEventListener('pointerup',endStick);addEventListener('pointercancel',endStick);
function input(){let x=joy.x,y=joy.y;if(keys.has('arrowleft')||keys.has('q')||keys.has('a'))x--;if(keys.has('arrowright')||keys.has('d'))x++;if(keys.has('arrowup')||keys.has('z')||keys.has('w'))y--;if(keys.has('arrowdown')||keys.has('s'))y++;return{x:x*Math.cos(CAMERA_YAW)+y*Math.sin(CAMERA_YAW),y:-x*Math.sin(CAMERA_YAW)+y*Math.cos(CAMERA_YAW)};}
function update(dt){if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').style.opacity=0;}if(levelRevealTime>0){levelRevealTime-=dt;if(levelRevealTime<=0)$('level-reveal').hidden=true;}if(!paused&&!state.over){clock+=dt;stepGame(state,dt,input());if(state.events.length){let urgent=null;for(const message of state.events.splice(0)){if(/attaqué|Revenez au refuge|Surprise !|Repli :|Secret révélé|gardiens sont vaincus/i.test(message))urgent=message;else eventQueue.push(message);}if(urgent)toast(urgent);}if(eventQueue.length>12)eventQueue.splice(0,eventQueue.length-12);if(noticeTime<=0&&eventQueue.length)toast(eventQueue.shift());if(state.king.heroLevel>lastHeroLevel)revealLevel();if(state.over){clearInput();cancelPlacement();$('overlay').hidden=false;text('result',population(state)+' habitants · royaume niveau '+state.kingdomLevel+' · '+state.kills+' assaillants repoussés. Votre héritage attend votre retour.');}}ui();}
function draw(){if(view)view.render(state,clock,paused);}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend();$('graphics-error').hidden=false;});canvas.addEventListener('webglcontextrestored',()=>{$('graphics-error').hidden=true;toast('La 3D est rétablie. Reprenez depuis le menu.');});
let chart=null,chartStamp='',chartState=null;
function mapChart(){
  const stamp=state.explored.length+':'+(state.harvested?.length||0);
  if(chart&&chartState===state&&stamp===chartStamp)return chart;
  chartStamp=stamp;chartState=state;chart??=document.createElement('canvas');chart.width=chart.height=768;
  const g=chart.getContext('2d'),sx=768/(WORLD.maxX-WORLD.minX),sy=768/(WORLD.maxY-WORLD.minY),pos=p=>({x:(p.x-WORLD.minX)*sx,y:(p.y-WORLD.minY)*sy});
  g.fillStyle='#a6d564';g.fillRect(0,0,768,768);const cut=new Set(state.harvested||[]);
  for(let i=0;i<FOREST_TREES.length;i++){if(cut.has(i))continue;const tree=FOREST_TREES[i],p=pos(tree);g.fillStyle=tree.species==='pine'?'#387c55':'#4d9c53';g.beginPath();g.arc(p.x,p.y,3.3*tree.size,0,Math.PI*2);g.fill();}
  const seen=new Set(state.explored);g.fillStyle='#102c3aeb';
  for(let y=Math.floor(WORLD.minY/300);y<=Math.ceil(WORLD.maxY/300);y++)for(let x=Math.floor(WORLD.minX/300);x<=Math.ceil(WORLD.maxX/300);x++)if(!seen.has(x+','+y))g.fillRect((x*300-WORLD.minX)*sx,(y*300-WORLD.minY)*sy,300*sx+.4,300*sy+.4);
  return chart;
}
function mapMarkers(g,project,small=false){
  function dot(p,color,r=small?4:5){const q=project(p);g.fillStyle=color;g.strokeStyle='#142d3c';g.lineWidth=small?1.4:2;g.beginPath();g.arc(q.x,q.y,r,0,Math.PI*2);g.fill();g.stroke();return q;}
  for(const p of state.landmarks)if(p.known)dot(p,p.looted?'#9caea1':'#f2d187',small?3:4);
  for(const p of state.discoveries||[])if(p.known){const q=dot(p,p.rewardClaimed?'#8b9c9f':p.cleared?'#ffdb77':p.triggered?'#f479ba':'#bc94ff',small?4:6);if(!small){g.fillStyle='#f5e8cc';g.font='11px sans-serif';g.textAlign='center';g.fillText(p.name,q.x,q.y-10);}}
  for(const p of state.camps)if(p.known&&!p.rescued)dot(p,'#ffcf5a',small?3.5:5);
  for(const b of state.buildings)if(!b.isRefuge&&!b.destroyed){const p=project(b);g.fillStyle=b.complete?'#8bdbf1':'#adb9b0';g.fillRect(p.x-2,p.y-2,4,4);}
  const explored=new Set(state.explored);for(const e of state.enemies)if(explored.has(Math.floor(e.x/300)+','+Math.floor(e.y/300)))dot(e,e.elite?'#fc80ab':'#ff7263',small?3:4);
  dot(state.horse,'#c79b76',small?4:5);dot(HOME,'#fff4cf',small?5:7);
  const p=project(state.king);g.save();g.translate(p.x,p.y);g.rotate(Math.PI-(state.king.aim||0));g.fillStyle='#b7f0ff';g.strokeStyle='#1f536c';g.lineWidth=1.5;g.beginPath();g.moveTo(0,-(small?8:10));g.lineTo(small?5:6,small?6:8);g.lineTo(0,small?3:4);g.lineTo(small?-5:-6,small?6:8);g.closePath();g.fill();g.stroke();g.restore();
}
function drawMinimap(){
  const c=$('minimap'),g=c.getContext('2d'),size=c.width,mid=size/2,range=1050,scale=size/(range*2),k=state.king;
  g.clearRect(0,0,size,size);g.save();g.beginPath();g.arc(mid,mid,mid-3,0,Math.PI*2);g.clip();g.fillStyle='#143341';g.fillRect(0,0,size,size);
  const chart=mapChart(),sx=chart.width/(WORLD.maxX-WORLD.minX),sy=chart.height/(WORLD.maxY-WORLD.minY);
  g.drawImage(chart,(k.x-range-WORLD.minX)*sx,(k.y-range-WORLD.minY)*sy,range*2*sx,range*2*sy,0,0,size,size);
  const project=p=>({x:mid+(p.x-k.x)*scale,y:mid+(p.y-k.y)*scale});mapMarkers(g,project,true);
  const d=Math.hypot(HOME.x-k.x,HOME.y-k.y);if(d>range*.82){const x=mid+(HOME.x-k.x)/d*(mid-16),y=mid+(HOME.y-k.y)/d*(mid-16);g.fillStyle='#ffe4a1';g.beginPath();g.arc(x,y,5,0,Math.PI*2);g.fill();}
  g.restore();g.strokeStyle='#edcf83';g.lineWidth=5;g.beginPath();g.arc(mid,mid,mid-3,0,Math.PI*2);g.stroke();g.strokeStyle='#a9dbc06b';g.lineWidth=1;g.beginPath();g.arc(mid,mid,mid*.53,0,Math.PI*2);g.stroke();
}
function drawMap(){const c=$('map'),g=c.getContext('2d');g.drawImage(mapChart(),0,0,c.width,c.height);mapMarkers(g,p=>({x:(p.x-WORLD.minX)/(WORLD.maxX-WORLD.minX)*c.width,y:(p.y-WORLD.minY)/(WORLD.maxY-WORLD.minY)*c.height}));}
function frame(t){const dt=Math.min((t-last)/1000||0,.1);last=t;update(dt);draw();if(view)requestAnimationFrame(frame);}
previewKing();ui(true);if(view)requestAnimationFrame(frame);
