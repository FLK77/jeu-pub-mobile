const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {build}=require('esbuild');
const {chromium}=require('playwright');

// These hooks and counters exist only in this in-memory test bundle. The
// production renderer and input handlers run unchanged; only their automatic
// scheduling is stopped between checks to keep software WebGL work bounded.
const root=path.resolve(__dirname,'..'),artifacts=process.env.V5_ARTIFACTS||'/tmp/cendrune-v5-qa';
const fixtureImports="import {addResident as qaAdd,assignJob as qaAssign,stepGame as qaStep,xpForLevel as qaXP,setTarget as qaAim,interact as qaInteract} from './simulation.js';import {nearbyTrees as qaNear} from './world-data.js';\n";
const hook=`
window.__v5QA={get state(){return state},get view(){return view},get placement(){return placement},get paused(){return paused},bounds:WORLD,
 draw,paint(){ui(true);draw();draw();},step(dt){qaStep(state,dt);ui(true);},cycle(dt){update(dt);ui(true);draw();},
 level(n){state.king.heroLevel=n;state.king.xp=qaXP(n,true);ui(true);},
 battle(){paused=false;state.phase='peace';state.phaseRemaining=10000;state.arrows=[];state.enemies=[{x:650,y:600,hp:100,maxHp:100,speed:0},{x:350,y:600,hp:100,maxHp:100,speed:0}];Object.assign(state.king,{x:500,y:600,cool:0,target:null,targetTTL:0,aim:Math.PI/2});ui(true);draw();draw();},
 aim:(x,y)=>qaAim(state,x,y),
 treeScene(){
   const index=FOREST_TREES.findIndex(t=>t.species==='oak'&&t.x>0&&t.x<1500&&Math.abs(t.y-HOME.y)>700&&qaNear(t.x-65,t.y+20).every(other=>other===t||Math.hypot(other.x-(t.x-65),other.y-(t.y+20))>100));
   if(index<0)throw Error('No isolated oak fixture');const tree=FOREST_TREES[index];paused=false;state.phase='peace';state.phaseRemaining=10000;state.enemies=[];state.arrows=[];state.harvested=state.harvested.filter(i=>i!==index);state.treeHealth[index]=3;
   Object.assign(state.king,{x:tree.x-65,y:tree.y+20,weapon:'axe',target:null,targetTTL:0,axeCool:0});view.setZoom(1);ui(true);draw();draw();return{index,...tree,king:{x:state.king.x,y:state.king.y}};
 },
 village(){
   paused=true;clock=0;const appearance={...state.king.appearance},realm=state.kingdomName;
   noticeTime=0;eventQueue.length=0;levelRevealTime=0;$('notice').style.opacity=0;$('level-reveal').hidden=true;
   state=createGame(20261026);customizeKing(state,appearance);customizeKingdom(state,realm);
   state.phaseRemaining=10000;state.kingdomLevel=4;state.xp=600;state.gold=1200;state.resources.weapons=8;
   const entries=[['house',220,190,2],['house',800,190,1],['academy',500,-65,1],['forge',180,490,2],['farm',815,510,1],['treasury',810,-70,2],['wall',335,440,2],['wall',415,440,2],['house',-50,190,1],['house',510,670,1]];
   for(let i=0;i<entries.length;i++){const[type,x,y,level]=entries[i],def=BUILDINGS[type];state.buildings.push({id:'qa-building-'+i,type,x,y,level,rotation:0,complete:i!==8,progress:i===8?def.work*.35:def.work,work:def.work,hp:150,maxHp:150,...(i===9?{upgrading:true,upgradeProgress:5,upgradeWork:30}:{})});}
   for(const[i,job]of ['worker','builder','knight','farmer','armorer','inventor'].entries()){
     if(!qaAdd(state,i<5?'rescued':'hired'))throw Error('Resident fixture rejected');const p=state.allies.at(-1);if(!qaAssign(state,p.id,job).ok)throw Error('Job fixture rejected');Object.assign(p,{x:340+i*65,y:355+(i%2)*70,aim:.2});
   }
   Object.assign(state.king,{x:500,y:475,aim:.2});Object.assign(state.horse,{x:650,y:460});$('intro').hidden=true;$('menu').hidden=true;$('overlay').hidden=true;view.setPortrait(false);view.setZoom(.8);ui(true);draw();draw();
 },
 appearance(value){customizeKing(state,value);ui(true);draw();draw();},
 encounter(){paused=false;state.phase='peace';state.phaseRemaining=10000;state.enemies=[];state.arrows=[];const site=state.discoveries[0];state.king.heroLevel=3;state.king.xp=qaXP(3,true);lastHeroLevel=state.king.heroLevel;Object.assign(state.king,{x:site.x-70,y:site.y,cool:0,target:null});qaStep(state,.01);const result=qaInteract(state);if(!result.ok)throw Error(result.text);update(.01);ui(true);draw();draw();return site.id;},
 stable(){draw();draw();const frames=[];for(let f=0;f<2;f++){draw();const c=canvas,gl=c.getContext('webgl2'),pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let hash=2166136261,colored=0;for(let i=0;i<pixels.length;i+=16){hash=Math.imul(hash^pixels[i],16777619);hash=Math.imul(hash^pixels[i+1],16777619);hash=Math.imul(hash^pixels[i+2],16777619);if(pixels[i]+pixels[i+1]+pixels[i+2]>70)colored++;}frames.push({hash,colored});}return frames;}
};`;
let browser,server,base,bundle;
const report={};
function checkpoint(name,value){report[name]=value;fs.writeFileSync(path.join(artifacts,'metrics.json'),JSON.stringify(report,null,2)+'\n');console.log(name+': '+JSON.stringify(value));}
async function compile(){
  const source=fs.readFileSync(path.join(root,'game.js'),'utf8').replaceAll('if(view)requestAnimationFrame(frame)','if(view&&!window.__v5Manual)requestAnimationFrame(frame)');
  const output=await build({stdin:{contents:fixtureImports+source+hook,resolveDir:root,sourcefile:'game.js'},bundle:true,write:false,format:'iife',loader:{'.png':'dataurl'},logLevel:'silent',plugins:[{name:'v5-test-counters',setup(build){
    build.onLoad({filter:/[/\\]world3d\.js$/},args=>{
      let text=fs.readFileSync(args.path,'utf8');const marker='diagnostics:()=>({';assert.ok(text.includes(marker));
      text=text.replace(marker,marker+`qa:{kingHeight:new THREE.Box3().setFromObject(king).max.y-king.position.y,portraitBounds:portraitKing?(()=>{portraitKing.updateWorldMatrix(true,true);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;portraitKing.traverseVisible(m=>{if(!m.isMesh)return;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(m.matrixWorld).project(portraitCamera);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}});return{minX,maxX,minY,maxY};})():null},`);
      return{contents:text,loader:'js',resolveDir:path.dirname(args.path)};
    });
  }}]});return output.outputFiles[0].text;
}
before(async()=>{
  fs.mkdirSync(artifacts,{recursive:true});bundle=await compile();
  server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name==='/favicon.ico'){res.writeHead(204);res.end();return;}if(name==='/')name='/index.html';const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.writeHead(404);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
  const launch={headless:true,args:['--no-sandbox']};if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;else if(fs.existsSync('/usr/bin/chromium'))launch.executablePath='/usr/bin/chromium';browser=await chromium.launch(launch);
});
after(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
async function open(t,{width=1280,height=900,mobile=false}={}){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1}),page=await context.newPage(),errors=[];page.setDefaultTimeout(45000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|GL_INVALID|3D impossible/i.test(m.text()))errors.push(m.text());});
  await page.addInitScript(()=>{window.__v5ContextLost=false;document.addEventListener('webglcontextlost',()=>window.__v5ContextLost=true,true);});
  await page.route('https://**/*',r=>r.abort());await page.route('**/game.bundle.js',r=>r.fulfill({contentType:'text/javascript',body:bundle}));
  t.after(async()=>{const lost=await page.evaluate(()=>window.__v5ContextLost).catch(()=>false);await context.close();assert.equal(lost,false,'WebGL context survived');assert.deepEqual(errors,[],'no JavaScript, shader or geometry merge errors');});
  await page.goto(base);await page.waitForFunction(()=>window.__v5QA?.view?.diagnostics().frames>1&&__v5QA.view.diagnostics().texturesReady);
  await page.evaluate(()=>{window.__v5Manual=true;});
  const art=await page.evaluate(()=>__v5QA.view.diagnostics());assert.equal(art.textureSource,'original-painted-atlas');assert.equal(art.detailSource,'original-crafted-atlas');assert.equal(art.modelVersion,5);assert.equal(art.foliageVersion,5);
  return page;
}
async function paint(page){await page.evaluate(()=>__v5QA.paint());}
async function shot(page,name){await paint(page);await page.screenshot({path:path.join(artifacts,name+'.png')});}
async function stable(page){const frames=await page.evaluate(()=>__v5QA.stable());assert.ok(frames[0].colored>1000);assert.equal(frames[0].hash,frames[1].hash,'paused geometry does not flicker');return frames[0].hash;}
async function diagnostics(page){return page.evaluate(()=>__v5QA.view.diagnostics());}
async function hud(page){
  const layout=await page.evaluate(()=>{const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};const c=document.getElementById('minimap'),g=c.getContext('2d');return{w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,resources:rect('hud-resources'),map:rect('minimap-button'),menu:rect('menu-button'),canvas:rect('game'),tiles:[...document.querySelectorAll('#hud-resources [data-resource]')].map(e=>({key:e.dataset.resource,svg:e.querySelector('svg')?.innerHTML,label:e.getAttribute('aria-label')})),mapStyle:getComputedStyle(document.getElementById('minimap-button')).borderRadius,corner:g.getImageData(0,0,1,1).data[3],centre:g.getImageData(c.width/2,c.height/2,1,1).data[3]};});
  assert.deepEqual(layout.tiles.map(t=>t.key),['gold','wood','stone','food','iron','weapons','knowledge']);assert.equal(new Set(layout.tiles.map(t=>t.svg)).size,7,'each material has a distinct actual drawing');assert.ok(layout.tiles.every(t=>t.svg&&t.label));
  assert.ok(layout.resources.x<25&&layout.resources.y<60,'resources stay at top left');assert.ok(layout.map.x>layout.w/2&&layout.map.y<60&&layout.map.right<=layout.w,'round minimap stays at top right');
  assert.ok(layout.resources.right<=layout.map.x-2,'resource strip and map do not overlap');assert.ok(Math.abs(layout.map.w-layout.map.h)<1);assert.equal(layout.corner,0,'round map has transparent corners');assert.ok(layout.centre>0,'map contains real plotted content');
  assert.ok(layout.menu.w>=44&&layout.menu.h>=44);assert.ok(layout.sw<=layout.w&&layout.sh<=layout.h+1,'no viewport overflow');assert.equal(layout.canvas.w,layout.w);assert.equal(layout.canvas.h,layout.h);
  return layout;
}

test('V5 desktop: authored sovereigns, material HUD, click targeting, skills and populated forest',async t=>{
  const page=await open(t);assert.equal(await page.title(),'Orvécendre · V'+(()=>{const [major,minor]=require('../package.json').version.split('.');return minor==='0'?major:major+'.'+minor;})());
  await shot(page,'v5-portrait-royal-desktop');
  await page.locator('#kingdom-name').fill('Les Aulnes');await page.locator('#king-name').fill('Élyne');
  await page.locator('#preset-ranger').click();await shot(page,'v5-portrait-ranger-desktop');
  await page.locator('#preset-warden').click();await shot(page,'v5-portrait-warden-desktop');
  await page.locator('#preset-ranger').click();await page.locator('#customization-details').evaluate(e=>e.open=true);
  await page.locator('#appearance-hair-style').selectOption('braids');await page.locator('#appearance-eye').selectOption('#7470a2');await page.locator('#appearance-mount-coat').selectOption('ivory');
  await page.locator('#start').click();await paint(page);
  const identity=await page.evaluate(()=>({kingdom:__v5QA.state.kingdomName,...__v5QA.state.king.appearance}));
  assert.equal(identity.kingdom,'Les Aulnes');assert.equal(identity.name,'Élyne');assert.equal(identity.outfit,'ranger');assert.equal(identity.hairStyle,'braids');assert.equal(identity.eye,'#7470a2');assert.equal(identity.mountCoat,'ivory');
  assert.equal(await page.locator('#hud-kingdom-name').textContent(),'Les Aulnes');await hud(page);
  assert.equal(await page.locator('#dash-action').isDisabled(),true);assert.equal(await page.locator('#power-action').isDisabled(),true);
  await page.evaluate(()=>{__v5QA.battle();__v5QA.step(1);});assert.equal(await page.evaluate(()=>__v5QA.state.arrows.length),0,'near enemies never cause automatic firing');
  const target=await page.evaluate(()=>__v5QA.view.project(650,600));await page.mouse.click(target.x,target.y);await paint(page);
  const attack=await page.evaluate(()=>({arrows:__v5QA.state.arrows.length,target:__v5QA.state.king.target,diag:__v5QA.view.diagnostics()}));
  assert.equal(attack.arrows,1);assert.ok(Math.abs(attack.target.x-650)<1&&Math.abs(attack.target.y-600)<1);assert.equal(attack.diag.targetVisible,true);assert.ok(Math.abs(attack.diag.targetWorld.x-650)<1);await shot(page,'v5-aim-desktop');
  await page.evaluate(()=>__v5QA.step(1));await page.mouse.move(target.x,target.y);await page.mouse.down();await page.mouse.move(target.x+45,target.y+25);await page.mouse.up();assert.equal(await page.evaluate(()=>__v5QA.state.arrows.length),0,'dragging terrain does not fire');
  await page.locator('#menu-button').click();assert.equal(await page.evaluate(()=>__v5QA.state.arrows.length),0,'menu is not a target');await page.locator('[data-tab=journey]').click();
  assert.deepEqual(await page.locator('#journey-unlocks .journey-level').allTextContents(),['1','2','3','4','5']);assert.equal(await page.locator('#journey-unlocks .is-unlocked').count(),1);assert.match(await page.locator('#journey-unlocks').textContent(),/Pas du souverain/);assert.match(await page.locator('#journey-unlocks').textContent(),/frappe royale/);
  await page.locator('[data-tab=settings]').click();assert.ok(Number(await page.locator('#zoom').getAttribute('min'))<=.5);await page.locator('#zoom').fill('0.45');await page.locator('#resume').click();await paint(page);assert.equal((await diagnostics(page)).zoom,.45);
  await page.evaluate(()=>{__v5QA.view.setZoom(1);__v5QA.level(2);});assert.equal(await page.locator('#dash-action').isDisabled(),false);
  await page.evaluate(()=>__v5QA.cycle(.01));assert.equal(await page.locator('#level-reveal').isVisible(),true);assert.match(await page.locator('#level-reveal-title').textContent(),/Niveau 2/);assert.match(await page.locator('#level-reveal-copy').textContent(),/Esquivez/);await shot(page,'v5-level-unlock-desktop');await page.evaluate(()=>__v5QA.cycle(8.1));assert.equal(await page.locator('#level-reveal').isVisible(),false);
  const before=await page.evaluate(()=>__v5QA.state.king.x);await page.keyboard.press('Shift');await page.evaluate(()=>{__v5QA.step(.18);__v5QA.paint();});assert.ok(await page.evaluate(x=>__v5QA.state.king.x>x+60,before));
  await page.evaluate(()=>{__v5QA.level(3);__v5QA.state.king.target=null;__v5QA.state.king.cool=0;__v5QA.paint();});assert.equal(await page.locator('#power-action').isDisabled(),true,'power also waits for a selected target');
  const aim=await page.evaluate(()=>__v5QA.view.project(__v5QA.state.king.x+200,__v5QA.state.king.y));await page.mouse.click(aim.x,aim.y);await page.evaluate(()=>__v5QA.step(.7));await page.locator('#power-action').click();assert.ok(await page.evaluate(()=>__v5QA.state.arrows.some(a=>a.power)&&__v5QA.state.king.powerCool>0));
  await page.evaluate(()=>__v5QA.village());await stable(page);await shot(page,'v5-village-desktop');
  const base=await diagnostics(page);checkpoint('desktop-village',{drawCalls:base.drawCalls,triangles:base.triangles,memory:base.memory});assert.equal(base.actors,7);assert.equal(base.placedBuildings,10);assert.ok(base.forestTrees>1000);assert.equal(base.animalCoat,'ivory');assert.ok(base.drawCalls<900,'desktop scene remains under its draw-call budget: '+base.drawCalls);
  for(const [outfit,emblem]of [['royal','sun'],['warden','moon'],['ranger','stag']])await page.evaluate(value=>{__v5QA.appearance(value);__v5QA.view.setPlacement({type:'house',x:620,y:630,rotation:0,valid:true});__v5QA.draw();__v5QA.view.setPlacement(null);__v5QA.draw();},{outfit,emblem});
  const rebuilt=await diagnostics(page);assert.ok(rebuilt.memory.geometries<=base.memory.geometries+24,'owned geometry remains bounded after rebuilt costumes and placement');assert.ok(rebuilt.memory.textures<=base.memory.textures+3);await stable(page);
  checkpoint('desktop',{drawCalls:base.drawCalls,triangles:base.triangles,memory:base.memory,rebuiltMemory:rebuilt.memory,textureSource:base.textureSource,detailSource:base.detailSource});
  await page.evaluate(()=>__v5QA.encounter());assert.ok(await page.evaluate(()=>__v5QA.state.enemies.some(e=>e.encounterId)));await shot(page,'v5-surprise-desktop');checkpoint('encounter',{guardians:await page.evaluate(()=>__v5QA.state.enemies.filter(e=>e.encounterId).length)});
});

test('V5 mobile: round minimap, seven resources, touch targets, customization and zoom framing',async t=>{
  const page=await open(t,{width:390,height:844,mobile:true});
  await page.locator('#preset-warden').click();await paint(page);const portrait=(await diagnostics(page)).qa.portraitBounds;
  assert.ok(portrait.minX>-1&&portrait.maxX<1&&portrait.minY>-1&&portrait.maxY<.99,'mobile costume and crown remain inside portrait');await shot(page,'v5-portrait-mobile');
  await page.locator('#kingdom-name').fill('Les Cimes');await page.locator('#start').click();await paint(page);
  for(const [width,height]of [[390,844],[320,568],[568,320],[844,390]]){await page.setViewportSize({width,height});await paint(page);await hud(page);}
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>__v5QA.battle());const target=await page.evaluate(()=>__v5QA.view.project(650,600,1.1));
  await page.touchscreen.tap(target.x,target.y);assert.equal(await page.evaluate(()=>__v5QA.state.arrows.length),1,'a genuine touch tap on the visible torso issues one directed attack');assert.ok(await page.evaluate(()=>Math.abs(__v5QA.state.king.target.x-650)<1&&Math.abs(__v5QA.state.king.target.y-600)<1),'touch also targets the visible enemy rather than the ground behind it');await paint(page);assert.equal((await diagnostics(page)).targetVisible,true);
  await page.evaluate(()=>__v5QA.step(1));assert.ok(await page.evaluate(()=>__v5QA.state.enemies[0].hp<100),'the touch-directed shot reaches that enemy');const r=await page.locator('#stick').boundingBox();await page.mouse.move(r.x+r.width/2+25,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+28,r.y+r.height/2);await page.mouse.up();assert.equal(await page.evaluate(()=>__v5QA.state.arrows.length),0,'joystick input does not shoot');
  await page.locator('#minimap-button').click();assert.equal(await page.locator('#tab-map').isVisible(),true);assert.match(await page.locator('#map-kingdom-name').textContent(),/Les Cimes/);assert.equal(await page.evaluate(()=>__v5QA.state.arrows.length),0);await page.locator('#resume').click();
  await page.evaluate(()=>__v5QA.village());await stable(page);await shot(page,'v5-village-mobile');const mobile=await diagnostics(page);checkpoint('mobile-village',{drawCalls:mobile.drawCalls,triangles:mobile.triangles,memory:mobile.memory});assert.ok(mobile.drawCalls<750,'mobile scene remains under its draw-call budget: '+mobile.drawCalls);assert.ok(mobile.triangles<1800000,'detail remains bounded on the mobile view');
  for(const [width,height]of [[390,844],[844,390],[320,568]]){
    await page.setViewportSize({width,height});
    const framed=await page.evaluate(()=>{const probes=[],bounds=__v5QA.bounds;__v5QA.view.setZoom(1);for(const[x,y,mounted]of[[500,475,false],[500,475,true],[bounds.minX+100,bounds.minY+100,false],[bounds.maxX-100,bounds.maxY-100,false]]){Object.assign(__v5QA.state.king,{x,y,mounted});__v5QA.draw();__v5QA.draw();const d=__v5QA.view.diagnostics();probes.push({top:__v5QA.view.project(x,y,d.qa.kingHeight+(mounted?1.15:0)),feet:__v5QA.view.project(x,y)});}return probes;});
    for(const p of framed)assert.ok(p.top.x>0&&p.top.x<width&&p.top.y>0&&p.feet.y<height,'the full king fits after riding, rotation or world-edge travel: '+JSON.stringify(p));
  }
  await page.evaluate(()=>{__v5QA.state.king.mounted=false;__v5QA.view.setZoom(.45);__v5QA.paint();});assert.equal((await diagnostics(page)).zoom,.45);await stable(page);await shot(page,'v5-forest-zoomout-mobile');
  checkpoint('mobile',{drawCalls:mobile.drawCalls,triangles:mobile.triangles,memory:mobile.memory,portraitBounds:portrait,textureSource:mobile.textureSource,detailSource:mobile.detailSource});
});

test('V5 visible-object picking uses the visible torso and canopy rather than the ground behind them',async t=>{
  const page=await open(t);await page.locator('#start').click();await paint(page);
  await t.test('a click on an enemy torso selects that enemy and a real arrow reaches it',async()=>{
    await page.evaluate(()=>__v5QA.battle());
    const target=await page.evaluate(()=>{const enemy=__v5QA.state.enemies[0];return{world:{x:enemy.x,y:enemy.y},pixel:__v5QA.view.project(enemy.x,enemy.y,1.1),hp:enemy.hp};});
    await page.mouse.click(target.pixel.x,target.pixel.y);
    const aim=await page.evaluate(()=>__v5QA.state.king.target);
    assert.ok(Math.abs(aim.x-target.world.x)<1&&Math.abs(aim.y-target.world.y)<1,'clicking the visible torso resolves to the enemy position, not the ground plane behind it');
    assert.equal(await page.evaluate(()=>__v5QA.state.arrows.length),1);await page.evaluate(()=>__v5QA.step(.4));
    assert.ok(await page.evaluate(hp=>__v5QA.state.enemies[0].hp<hp,target.hp),'the aimed arrow damages the visible enemy');
    assert.equal(await page.evaluate(()=>__v5QA.state.enemies[1].hp),100,'the unselected enemy remains unharmed');
    await shot(page,'v5-torso-target-desktop');checkpoint('torso-picking',{passed:true,target:aim});
  });
  await t.test('clicking visible leaves selects their real trunk while clicking empty ground does not pick a nearby tree',async()=>{
    const tree=await page.evaluate(()=>__v5QA.treeScene());
    const canopy=await page.evaluate(tree=>{
      const view=__v5QA.view,centre=view.project(tree.x,tree.y,3.5*tree.size);
      for(const dy of[0,-14,14,-28,28])for(const dx of[0,-14,14,-28,28]){
        const x=centre.x+dx,y=centre.y+dy,hit=view.targetAt(x,y,{trees:true});
        if(hit?.kind==='tree')return{x,y,hit};
      }
      return null;
    },tree);
    assert.ok(canopy,'a visibly filled canopy patch is available despite gaps between individual leaves');
    assert.equal(canopy.hit.treeIndex,tree.index,'instance picking retains the original forest tree index');
    const wood=await page.evaluate(()=>__v5QA.state.resources.wood);
    await page.mouse.click(canopy.x,canopy.y);
    const selected=await page.evaluate(index=>({target:__v5QA.state.king.target,health:__v5QA.state.treeHealth[index],wood:__v5QA.state.resources.wood}),tree.index);
    assert.ok(Math.abs(selected.target.x-tree.x)<1&&Math.abs(selected.target.y-tree.y)<1,'visible leaves select their trunk position');
    assert.equal(selected.health,2,'the selected tree takes a real axe cut');assert.ok(selected.wood>wood);
    await shot(page,'v5-canopy-target-desktop');await page.evaluate(()=>__v5QA.step(.6));
    const empty=await page.evaluate(tree=>{
      for(const[dx,dy]of[[-80,80],[-100,50],[-80,0],[0,100],[0,140]]){
        const x=tree.king.x+dx,y=tree.king.y+dy,pixel=__v5QA.view.project(x,y),hit=__v5QA.view.targetAt(pixel.x,pixel.y,{trees:true});
        if(hit&&!hit.kind)return{x,y,pixel,hit};
      }
      return null;
    },tree);
    assert.ok(empty,'an empty patch does not snap to the nearby tree');
    await page.mouse.click(empty.pixel.x,empty.pixel.y);
    const missed=await page.evaluate(index=>({target:__v5QA.state.king.target,health:__v5QA.state.treeHealth[index],wood:__v5QA.state.resources.wood}),tree.index);
    assert.ok(Math.abs(missed.target.x-empty.x)<1&&Math.abs(missed.target.y-empty.y)<1);assert.equal(missed.health,2);assert.equal(missed.wood,selected.wood,'a swing into empty ground does not auto-select the nearby trunk');
    for(let i=0;i<2;i++){await page.evaluate(()=>__v5QA.step(.6));await page.mouse.click(canopy.x,canopy.y);}
    assert.ok(await page.evaluate(index=>__v5QA.state.harvested.includes(index),tree.index),'repeated canopy clicks fell the intended tree');await paint(page);
    const after=await page.evaluate(p=>__v5QA.view.targetAt(p.x,p.y,{trees:true}),canopy);
    assert.notEqual(after?.treeIndex,tree.index,'the harvested tree is no longer pickable');
    checkpoint('canopy-picking',{passed:true,treeIndex:tree.index,trunk:{x:tree.x,y:tree.y}});
  });
});
