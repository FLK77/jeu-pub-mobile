const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');
const playwright=require('playwright');
const browserName=process.env.BROWSER||'chromium',root=path.join(__dirname,'..'),base='http://127.0.0.1:3103';
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
// Test-only state access is inserted before bundling; the shipped bundle has no hooks.
const fixtureImports="import {addResident as qaAdd,assignJob as qaAssign,placementStatus as qaStatus,placeBuilding as qaPlace,stepGame as qaStep} from './simulation.js';import {FOREST_TREES as qaTrees} from './world-data.js';import {BUILDINGS as qaBuildings} from './kingdom-data.js';\n";
const hook=`
window.__gameTest={get state(){return state},get paused(){return paused},get input(){return{x:joy.x,y:joy.y,pointer:pointer.id,keys:[...keys]}},get view(){return view},get placement(){return placement},ui:()=>ui(true),draw,step:dt=>qaStep(state,dt),openMenu,closeMenu,
add:source=>qaAdd(state,source),assign:(id,job)=>qaAssign(state,id,job),
prepare:()=>{state.gold=10000;for(const k of Object.keys(state.resources))state.resources[k]=10000;state.phase='peace';state.phaseRemaining=10000;},
firstTree:()=>qaTrees.findIndex((t,i)=>t.x>0&&t.x<1500&&!state.harvested.includes(i)),tree:i=>qaTrees[i],
queue:type=>{for(const [x,y]of[[650,600],[850,460],[1100,350],[500,-100],[-100,200],[100,230],[1000,-100],[300,800],[750,800]]){if(qaStatus(state,type,x,y).ok)return qaPlace(state,type,x,y);}throw Error('No fixture placement for '+type);},
finishWork:seconds=>{for(const p of state.allies)if(p.job==='builder'){const b=state.buildings.find(b=>!b.complete||b.upgrading);if(b){p.x=b.x;p.y=b.y+qaBuildings[b.type].depth/2+32;}}qaStep(state,seconds);},
placeStatus:(type,x,y,rotation=0)=>qaStatus(state,type,x,y,rotation),
prepareInventor:()=>{state.kingdomLevel=4;state.xp=600;const person=state.allies.find(p=>p.job==='inventor'),b=state.buildings.find(b=>b.type==='academy'&&b.complete);if(person&&b){person.x=b.x;person.y=b.y+qaBuildings.academy.depth/2+25;}}
};`;
const bundle=require('esbuild').buildSync({stdin:{contents:fixtureImports+source+hook,resolveDir:root,sourcefile:'game.js'},bundle:true,write:false,format:'iife',logLevel:'silent'}).outputFiles[0].text;
let browser,server;
before(async()=>{
  server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'3103'}});
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await delay(50);}assert.ok(ready,'browser-test server started');
  const launch={headless:true};if(browserName==='chromium'){launch.args=['--no-sandbox'];if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;else if(fs.existsSync('/usr/bin/chromium'))launch.executablePath='/usr/bin/chromium';}
  browser=await playwright[browserName].launch(launch);
});
after(async()=>{if(browser)await browser.close();if(server)server.kill();});
async function open(t,{width=390,height=844,mobile=true,start=true}={}){
  const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());await page.route('**/game.bundle.js',r=>r.fulfill({contentType:'text/javascript',body:bundle}));
  t.after(async()=>{await context.close();assert.deepEqual(errors,[],'no JavaScript exceptions');});
  await page.goto(base);await page.waitForFunction(()=>window.__gameTest&&__gameTest.view?.diagnostics().frames>0);
  if(start)await page.locator('#start').click();
  return page;
}
async function hold(page){const r=await page.locator('#stick').boundingBox();await page.mouse.move(r.x+r.width/2+24,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+25,r.y+r.height/2);await page.waitForFunction(()=>__gameTest.input.x>.5);}
async function layout(page,ids=['menu-button','stick']){
  const m=await page.evaluate(ids=>{const c=document.getElementById('game').getBoundingClientRect();return{w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,canvas:{x:c.x,y:c.y,w:c.width,h:c.height},controls:ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};})};},ids);
  assert.equal(m.canvas.x,0);assert.equal(m.canvas.y,0);assert.equal(m.canvas.w,m.w);assert.equal(m.canvas.h,m.h);assert.ok(m.sw<=m.w&&m.sh<=m.h+1);
  for(const r of m.controls)assert.ok(r.x>=0&&r.y>=0&&r.right<=m.w+1&&r.bottom<=m.h+1&&r.w>=44&&r.h>=44,JSON.stringify(r));
}
async function tab(page,key){await page.locator('[data-tab="'+key+'"]').click();}

// Keep related checks in shared contexts to avoid recompiling the large 3D scene
// for every small assertion on software-only CI graphics.
test('V6 customization persists; the full viewport and management tabs work on nine sizes',async t=>{
  const page=await open(t,{width:1280,height:900,mobile:false,start:false});
  assert.equal(await page.evaluate(()=>__gameTest.state.time),0,'creation screen freezes the expedition');
  await page.locator('#king-name').fill('Aelys');await page.locator('#appearance-beard').selectOption('long');await page.locator('#appearance-crown').selectOption('spiked');
  const cape=await page.locator('#appearance-cape option').last().getAttribute('value');
  await page.locator('#appearance-cape').selectOption(cape);
  await page.waitForFunction(cape=>__gameTest.state.king.appearance.cape===cape,cape);
  await page.locator('#start').click();
  assert.deepEqual(await page.evaluate(()=>{const a=__gameTest.state.king.appearance;return[a.name,a.beard,a.crown,a.cape];}),['Aelys','long','spiked',cape]);
  for(const [width,height]of[[320,568],[375,667],[390,844],[412,915],[768,1024],[1024,768],[844,390],[667,375],[568,320]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(60);await layout(page);assert.equal(await page.locator('#citizen-list').isVisible(),false);
  }
  await page.locator('#menu-button').click();assert.equal(await page.evaluate(()=>__gameTest.paused),true);
  await tab(page,'kingdom');assert.equal(await page.locator('#kingdom-summary').isVisible(),true);assert.equal(await page.locator('#resources-summary').isVisible(),true);assert.equal(await page.locator('#payroll-summary').isVisible(),true);
  await tab(page,'map');assert.equal(await page.locator('#map').isVisible(),true);
  await tab(page,'story');assert.match(await page.locator('#tab-story').textContent(),/guerre|défaite|Valdor/i);
  await tab(page,'settings');await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
  await page.locator('#zoom').fill('1.2');await page.locator('#resume').click();assert.equal(await page.evaluate(()=>__gameTest.paused),false);
});

test('residents get chosen jobs, wages affect the dashboard, and placed housing needs real construction',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{__gameTest.prepare();__gameTest.add('rescued');__gameTest.add('rescued');__gameTest.add('hired');__gameTest.ui();});
  assert.ok(await page.evaluate(()=>__gameTest.state.allies.every(p=>p.job==='unassigned')));
  await page.locator('#menu-button').click();await tab(page,'residents');
  const selectors=page.locator('#citizen-list select[data-citizen-id]');assert.equal(await selectors.count(),3);
  await selectors.nth(0).selectOption('worker');await selectors.nth(1).selectOption('builder');
  assert.deepEqual(await page.evaluate(()=>__gameTest.state.allies.slice(0,2).map(p=>p.job)),['worker','builder']);
  assert.notEqual(await selectors.nth(2).locator('option[value=inventor]').getAttribute('disabled'),null,'inventor is unavailable at the beginning');
  await page.evaluate(()=>{__gameTest.state.kingdomLevel=3;__gameTest.state.xp=300;__gameTest.ui();});
  await tab(page,'kingdom');await page.locator('#wage-input').fill('3');await page.locator('#apply-wage').click();assert.equal(await page.evaluate(()=>__gameTest.state.payroll.wage),3);
  await page.evaluate(()=>{__gameTest.step(61);__gameTest.ui();});assert.ok(await page.evaluate(()=>__gameTest.state.payroll.totalPaid)>0);
  assert.match(await page.locator('#payroll-summary').textContent(),/paie|salaire|motivation/i);
  await tab(page,'build');const count=await page.evaluate(()=>__gameTest.state.buildings.length),capacity=await page.evaluate(()=>__gameTest.state.capacity);
  await page.locator('#build-catalog button[data-build-type=house]').click();assert.equal(await page.locator('#placement-controls').isVisible(),true);
  for(const [width,height]of[[320,568],[568,320],[390,844]]){await page.setViewportSize({width,height});await layout(page,['place-confirm','place-cancel','place-rotate']);}
  const point=await page.evaluate(()=>{for(const [x,y]of[[650,600],[500,650],[350,650],[650,700],[400,650]]){if(__gameTest.placeStatus('house',x,y,0).ok){const p=__gameTest.view.project(x,y);if(p.x>15&&p.x<p.width-15&&p.y>180&&p.y<p.height-160)return{worldX:x,worldY:y,screenX:p.x,screenY:p.y};}}return null;});
  assert.ok(point,'a valid, visible construction site exists');
  await page.mouse.click(point.screenX,point.screenY); // projected pixel coordinates exercise screenToWorld
  await page.locator('#place-confirm').click();
  const queued=await page.evaluate(()=>({n:__gameTest.state.buildings.length,capacity:__gameTest.state.capacity,building:__gameTest.state.buildings.at(-1)}));
  assert.equal(queued.n,count+1);assert.equal(queued.capacity,capacity);assert.equal(queued.building.complete,false);
  assert.ok(Math.abs(queued.building.x-point.worldX)<=15&&Math.abs(queued.building.y-point.worldY)<=15,'canvas click maps back to the intended world location');
  await page.evaluate(()=>{__gameTest.finishWork(120);__gameTest.ui();});
  assert.equal(await page.evaluate(()=>__gameTest.state.buildings.at(-1).complete),true);assert.ok(await page.evaluate(()=>__gameTest.state.capacity)>capacity);
  await page.locator('#menu-button').click();await tab(page,'build');
  const beforeCancel=await page.evaluate(()=>[__gameTest.state.gold,__gameTest.state.buildings.length]);
  await page.locator('#build-catalog button[data-build-type=wall]').click();await page.locator('#place-rotate').click();await page.locator('#place-cancel').click();
  assert.deepEqual(await page.evaluate(()=>[__gameTest.state.gold,__gameTest.state.buildings.length]),beforeCancel,'cancelling a preview costs nothing');
  // Public model functions arrange late-game prerequisites; the actual assignment
  // and research action below still pass through the player-facing menu.
  await page.evaluate(()=>{const s=__gameTest.state;__gameTest.prepare();s.kingdomLevel=4;s.xp=600;const r=__gameTest.queue('academy');if(!r.ok)throw Error(r.text);__gameTest.finishWork(150);__gameTest.ui();});
  await page.locator('#menu-button').click();await tab(page,'residents');
  await page.locator('#citizen-list select[data-citizen-id]').nth(2).selectOption('inventor');
  assert.equal(await page.evaluate(()=>__gameTest.state.allies[2].job),'inventor');
  await page.evaluate(()=>{__gameTest.prepareInventor();__gameTest.ui();});await tab(page,'technology');
  await page.locator('#research-list button[data-tech=weaponry]').click();assert.equal(await page.evaluate(()=>__gameTest.state.research?.key),'weaponry');
  await page.evaluate(()=>{__gameTest.step(75);__gameTest.ui();});assert.ok(await page.evaluate(()=>__gameTest.state.tech.includes('weaponry')));
});

test('touch, axe, horse, exploration camera and restart remain playable together',async t=>{
  const page=await open(t),before=await page.evaluate(()=>__gameTest.state.king.x);await hold(page);await page.waitForFunction(x=>__gameTest.state.king.x>x+10,before);
  const id=await page.evaluate(()=>__gameTest.input.pointer);await page.dispatchEvent('#stick','pointerdown',{pointerId:999,pointerType:'touch'});await page.dispatchEvent('#stick','pointerup',{pointerId:999,pointerType:'touch'});assert.equal(await page.evaluate(()=>__gameTest.input.pointer),id);
  await page.dispatchEvent('#stick','pointercancel',{pointerId:id});await page.mouse.up();assert.equal(await page.evaluate(()=>__gameTest.input.pointer),null);
  if(browserName==='chromium'){
    const cdp=await page.context().newCDPSession(page),r=await page.locator('#stick').boundingBox(),touch={id:1,x:r.x+r.width/2+23,y:r.y+r.height/2},x=await page.evaluate(()=>__gameTest.state.king.x);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await page.waitForFunction(x=>__gameTest.state.king.x>x+8,x);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touch,x:touch.x+60,y:touch.y-30}]});assert.equal(await page.evaluate(()=>scrollY),0);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForFunction(()=>__gameTest.input.pointer===null);await cdp.detach();
  }
  await hold(page);await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>__gameTest.input.pointer===null);await page.mouse.up();await layout(page);
  await hold(page);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();assert.equal(await page.locator('#menu').isVisible(),true);await page.locator('#resume').click();
  const stopped=await page.evaluate(()=>__gameTest.state.king.x);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__gameTest.state.king.x),stopped);
  await page.evaluate(()=>{Object.assign(__gameTest.state.king,__gameTest.state.horse);__gameTest.ui();});await page.keyboard.press('e');await page.waitForFunction(()=>__gameTest.state.king.mounted&&__gameTest.view.diagnostics().mounted);
  await page.locator('#interact').click();assert.equal(await page.evaluate(()=>__gameTest.state.king.mounted),false);
  const tree=await page.evaluate(()=>{const i=__gameTest.firstTree(),t=__gameTest.tree(i);Object.assign(__gameTest.state.king,{x:t.x-50,y:t.y});__gameTest.ui();return i;});
  await page.locator('#weapon-axe').click();assert.equal(await page.evaluate(()=>__gameTest.state.king.weapon),'axe');
  const wood=await page.evaluate(()=>__gameTest.state.resources.wood),xp=await page.evaluate(()=>__gameTest.state.king.xp);
  for(let i=0;i<3;i++){await page.locator('#axe-action').click();await page.evaluate(()=>{__gameTest.step(.6);__gameTest.ui();});}
  assert.ok(await page.evaluate(i=>__gameTest.state.harvested.includes(i),tree));assert.ok(await page.evaluate(()=>__gameTest.state.resources.wood)>wood);assert.ok(await page.evaluate(()=>__gameTest.state.king.xp)>xp);
  await page.locator('#weapon-bow').click();assert.equal(await page.evaluate(()=>__gameTest.state.king.weapon),'bow');
  assert.ok(await page.evaluate(()=>__gameTest.view.diagnostics().forestTrees)>500);
  for(const [x,y]of[[-1700,-1800],[2700,-1800],[-1700,2400],[2700,2400]]){
    const p=await page.evaluate(([x,y])=>{Object.assign(__gameTest.state.king,{x,y});__gameTest.draw();const top=__gameTest.view.project(x,y,2.8),bottom=__gameTest.view.project(x,y);return{...top,bottom:bottom.y};},[x,y]);
    assert.ok(p.x>0&&p.x<p.width&&p.y>0&&p.bottom<p.height,JSON.stringify(p));
  }
  await page.locator('#menu-button').click();const hashes=await page.evaluate(()=>{
    __gameTest.draw();const result=[];for(let f=0;f<2;f++){__gameTest.draw();const c=document.getElementById('game'),gl=c.getContext('webgl2'),p=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,p);let hash=2166136261,visible=0;for(let i=0;i<p.length;i+=16){hash=Math.imul(hash^p[i],16777619);hash=Math.imul(hash^p[i+1],16777619);if(p[i]+p[i+1]+p[i+2]>50)visible++;}if(visible<1000)throw Error('empty paused frame');result.push(hash);}return result;});assert.equal(hashes[0],hashes[1],'paused scene does not flicker');
  await page.locator('#resume').click();await page.evaluate(()=>{const s=__gameTest.state;s.phase='raid';s.left=1;s.hp=.01;s.enemies=[{x:500,y:330,hp:999,maxHp:999,speed:0}];});await page.waitForFunction(()=>!document.getElementById('overlay').hidden);
  await page.locator('#restart').click();assert.equal(await page.evaluate(()=>__gameTest.state.over),false);assert.equal(await page.evaluate(()=>__gameTest.state.phase),'peace');assert.equal(await page.evaluate(()=>__gameTest.state.allies.length),0);
});
