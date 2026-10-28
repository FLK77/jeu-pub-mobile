const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {build}=require('esbuild');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),artifacts=process.env.V6_ARTIFACTS||'/tmp/cendrune-v6-qa';
const baseline=process.env.V6_BASELINE==='1';
function readSource(file){if(baseline){try{return execFileSync('git',['show','ebd96e988f4cabe5b7be92bcddac42a2c3cf82b4:'+path.relative(root,file)],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']});}catch{}}return fs.readFileSync(file,'utf8');}
const sourceImports="import {addResident as qaAdd,assignJob as qaAssign,stepGame as qaStep} from './simulation.js';\n"+(baseline?'':"import {enemyProfile as qaEnemy} from './enemy-data.js';\n");
const controllerHook=`
window.__v6QA={get state(){return state},get view(){return view},get paused(){return paused},
 draw,paint(){ui(true);draw();draw();},step(dt){qaStep(state,dt);ui(true);},
 village(){paused=true;clock=0;state=createGame(20261026);state.phaseRemaining=10000;state.kingdomLevel=4;state.xp=600;state.gold=1200;state.resources.weapons=8;
 for(const[i,e]of [['house',220,190,2],['house',800,190,1],['academy',500,-65,1],['forge',180,490,2],['farm',815,510,1],['treasury',810,-70,2],['wall',335,440,2],['wall',415,440,2],['house',-50,190,1],['house',510,670,1]].entries()){const[type,x,y,level]=e,def=BUILDINGS[type];state.buildings.push({id:'art-'+i,type,x,y,level,rotation:0,complete:true,progress:def.work,work:def.work,hp:150,maxHp:150});}
 for(const[i,job]of ['worker','builder','knight','farmer','armorer','inventor'].entries()){if(!qaAdd(state,i<5?'rescued':'hired'))throw Error('Resident rejected');const p=state.allies.at(-1);if(!qaAssign(state,p.id,job).ok)throw Error('Job rejected');Object.assign(p,{x:340+i*65,y:355+(i%2)*70,aim:.2});}
 Object.assign(state.king,{x:500,y:475,aim:.2});Object.assign(state.horse,{x:650,y:460});$('intro').hidden=true;$('menu').hidden=true;$('overlay').hidden=true;view.setPortrait(false);view.setZoom(.8);ui(true);draw();draw();
 },
 battle(){paused=false;clock=0;state=createGame(20261026);state.phase='peace';state.phaseRemaining=10000;state.arrows=[];state.enemies=[{id:'qa-raider',kind:'raider',tier:1,x:650,y:600,hp:100,maxHp:100,speed:0,cool:10},{id:'qa-brute',kind:'brute',tier:2,x:350,y:600,hp:180,maxHp:180,speed:0,cool:10}];Object.assign(state.king,{x:500,y:600,cool:0,target:null,targetTTL:0,aim:Math.PI/2});$('intro').hidden=true;$('menu').hidden=true;view.setPortrait(false);view.setZoom(1);ui(true);draw();draw();},
 defenseScene(){
   paused=false;clock=0;state=createGame(20261026);state.phase='warning';state.phaseRemaining=10000;state.wildlife=[];state.buildings.push({id:'qa-neighbor',type:'house',x:310,y:240,rotation:0,level:1,complete:true,progress:24,work:24,hp:150,maxHp:150});
   if(!qaAdd(state,'rescued'))throw Error('Civilian rejected');const p=state.allies[0];qaAssign(state,p.id,'worker');Object.assign(p,{x:500,y:100,homeId:'refuge'});Object.assign(state.king,{x:500,y:500});$('intro').hidden=true;$('menu').hidden=true;view.setPortrait(false);view.setZoom(1);qaStep(state,8);ui(true);draw();draw();return p.id;
 },
 siegeScene(){
   paused=false;clock=0;state=createGame(20261026);state.phase='raid';state.phaseRemaining=10000;state.wave=3;state.left=1;state.spawn=10000;state.wildlife=[];Object.assign(state.king,{x:500,y:1100});
   for(const[id,type,x,y]of [['qa-forge','forge',180,490],['qa-farm','farm',815,510]])state.buildings.push({id,type,x,y,rotation:0,complete:true,level:1,progress:100,work:100,hp:150,maxHp:150});
   state.enemies=[{...qaEnemy('breaker',2),id:'qa-left-breaker',x:180,y:600,hp:140,cool:0,aim:0},{...qaEnemy('breaker',2),id:'qa-right-breaker',x:815,y:620,hp:140,cool:0,aim:0}];ui(true);draw();draw();
 },
 rosterScene(){
   paused=true;clock=0;state=createGame(20261026);state.phaseRemaining=10000;state.wildlife=[];Object.assign(state.king,{x:500,y:750});state.enemies=['raider','skirmisher','breaker','brute','captain'].map((kind,i)=>({...qaEnemy(kind,1+i%4),id:'qa-roster-'+i,x:280+i*110,y:610,hp:1000,aim:0,cool:10}));view.setZoom(.75);ui(true);draw();draw();
 },
 forestScene(){
   paused=false;clock=0;state=createGame(20261026);state.phaseRemaining=10000;state.enemies=[];const animal=state.wildlife?.find(a=>a.kind==='deer');if(!animal)throw Error('No live deer');state.wildlife=[animal];Object.assign(state.king,{x:animal.x-135,y:animal.y,weapon:'bow',cool:0,aim:Math.PI/2,target:null});view.setZoom(1);$('intro').hidden=true;$('menu').hidden=true;view.setPortrait(false);ui(true);draw();draw();return{id:animal.id,x:animal.x,y:animal.y,hp:animal.hp};
 },
 stable(){const result=[];for(let f=0;f<2;f++){draw();const c=canvas,gl=c.getContext('webgl2'),pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let hash=2166136261,colored=0;for(let i=0;i<pixels.length;i+=16){hash=Math.imul(hash^pixels[i],16777619);hash=Math.imul(hash^pixels[i+1],16777619);hash=Math.imul(hash^pixels[i+2],16777619);if(pixels[i]+pixels[i+1]+pixels[i+2]>70)colored++;}result.push({hash,colored});}return result;}
};`;
const rendererHook=`
function qaModelMetrics(object){if(!object)return null;object.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(object),size=b.getSize(new THREE.Vector3());let meshes=0,triangles=0;object.traverseVisible(m=>{if(m.isMesh){meshes++;triangles+=(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;}});return{size:{x:size.x,y:size.y,z:size.z},minY:b.min.y,meshes,triangles,modelStyle:object.userData.modelStyle,designRevision:object.userData.designRevision,anatomySource:object.userData.anatomySource};}
window.__v6Models={
 stats(){return{king:qaModelMetrics(king),horse:qaModelMetrics(mount),allies:[...collections.allies].map(([p,m])=>({id:p.id,visible:m.visible,sheltered:p.sheltered,hidden:p.hidden,position:{x:m.position.x,y:m.position.y,z:m.position.z}})),enemies:[...collections.enemies].map(([p,m])=>({id:p.id,kind:p.kind,tier:p.tier,visible:m.visible,metrics:qaModelMetrics(m)})),wildlife:collections.wildlife?[...collections.wildlife].map(([p,m])=>({id:p.id,kind:p.kind,visible:m.visible,metrics:qaModelMetrics(m)})):[]};},
 portraitBounds(){if(!portraitKing)return null;portraitKing.updateWorldMatrix(true,true);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;portraitKing.traverseVisible(m=>{if(!m.isMesh)return;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(m.matrixWorld).project(portraitCamera);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}});return{minX,minY,maxX,maxY};},
 studio(kind,animated=false){
  const studio=new THREE.Scene();studio.background=new THREE.Color('#66736a');studio.environment=skyEnvironment.texture;studio.environmentIntensity=.5;studio.add(new THREE.HemisphereLight('#e4ecfa','#a58c74',1.2));const light=new THREE.DirectionalLight('#fff1dd',3.1);light.position.set(-4,7,5);light.castShadow=true;Object.assign(light.shadow.camera,{left:-7,right:7,top:5,bottom:-3,near:.5,far:20});light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0001;studio.add(light);const rim=new THREE.DirectionalLight('#afcff4',1.4);rim.position.set(4,3,-4);studio.add(rim);
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#65765a',roughness:1}));plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;studio.add(plane);const models=[];
  if(kind==='enemies')for(const[i,kind]of ['raider','skirmisher','breaker','brute','captain'].entries()){const m=enemyCharacter({kind,tier:1+i%4,elite:kind==='captain'});studio.add(m);pose(m,{x:500,y:325,hp:100,maxHp:100,aim:.12,job:'enemy'},0);if(animated)pose(m,{x:515,y:325,hp:100,maxHp:100,aim:.12,job:'enemy'},.14);m.position.x=(i-2)*1.65;models.push(m);}
  else if(kind==='ranks')for(const[i,tier]of [1,4].entries()){const m=enemyCharacter({kind:'raider',tier});studio.add(m);pose(m,{x:500,y:325,hp:100,maxHp:100,aim:.25},0);m.position.x=(i-.5)*1.7;models.push(m);}
  else if(kind==='wildlife')for(const[i,kind]of ['deer','rabbit','boar','wolf'].entries()){const rig=wildlifeModels.create(kind),m=rig.root;batchRig(m);studio.add(m);m.position.x=(i-1.5)*1.8;m.rotation.y=.8;if(animated)for(let j=0;j<rig.legs.length;j++)rig.legs[j].rotation.x=Math.sin(.8+j*Math.PI)*.3;models.push(m);}
  else throw Error('Unknown art lineup');
  const aspect=canvas.clientWidth/canvas.clientHeight,height=kind==='ranks'?4.2:6.7,camera=new THREE.OrthographicCamera(-height*aspect/2,height*aspect/2,height/2,-height/2,.1,60);camera.position.set(0,2.9,10);camera.lookAt(0,1.25,0);camera.updateMatrixWorld();renderer.render(studio,camera);const png=canvas.toDataURL('image/png'),metrics=models.map(qaModelMetrics);for(const m of models)disposeTree(m);plane.geometry.dispose();plane.material.dispose();light.shadow.dispose();return{png,metrics};
 },
 profile(){
  const categories=new Map([[king,'king'],[mount,'horse']]);for(const [name,map]of Object.entries(collections))for(const model of map.values())categories.set(model,name);for(const chunk of forestChunks)categories.set(chunk,'forest');for(const c of camps.values())categories.set(c.root,'camp');
  const values={},saved=[];const classify=m=>{for(let p=m;p;p=p.parent)if(categories.has(p))return categories.get(p);return'scenery';};
  const count=(m,geometry,group,pass)=>{const name=classify(m),n=values[name]||(values[name]={colorCalls:0,colorTriangles:0,shadowCalls:0,shadowTriangles:0});n[pass+'Calls']++;n[pass+'Triangles']+=(group?.count??geometry.index?.count??geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1);};
  scene.traverse(m=>{if(!m.isMesh)return;const color=m.onBeforeRender,shadow=m.onBeforeShadow;saved.push({m,color,shadow});m.onBeforeRender=function(r,s,c,g,mat,group){count(m,g,group,'color');return color.apply(this,arguments);};m.onBeforeShadow=function(r,o,c,sc,g,mat,group){count(m,g,group,'shadow');return shadow.apply(this,arguments);};});
  window.__v6QA.draw();for(const{m,color,shadow}of saved){m.onBeforeRender=color;m.onBeforeShadow=shadow;}return{categories:values,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio()};
 }
};`;
let browser,server,base,bundle;
const report={baseline};
function record(key,value){report[key]=value;fs.writeFileSync(path.join(artifacts,'metrics.json'),JSON.stringify(report,null,2)+'\n');console.log(key+': '+JSON.stringify(value));}
before(async()=>{
 fs.mkdirSync(artifacts,{recursive:true});
 const files=['package.json','package-lock.json','index.html','style.css','tests/v6.browser.cjs',...fs.readdirSync(root).filter(n=>n.endsWith('.js')&&n!=='game.bundle.js').sort(),...fs.readdirSync(path.join(root,'assets')).filter(n=>/\.(png|json)$/.test(n)).sort().map(n=>'assets/'+n)];fs.writeFileSync(path.join(artifacts,'source-manifest.json'),JSON.stringify({files:files.map(name=>({path:name,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')}))},null,2)+'\n');
 const source=readSource(path.join(root,'game.js')).replaceAll('if(view)requestAnimationFrame(frame)','if(view&&!window.__v6Manual)requestAnimationFrame(frame)');
 const built=await build({stdin:{contents:sourceImports+source+controllerHook,resolveDir:root,sourcefile:'game.js'},bundle:true,write:false,format:'iife',loader:{'.png':'dataurl'},logLevel:'silent',plugins:[{name:'v6-test-only',setup(build){if(baseline)build.onLoad({filter:/\.js$/},args=>{if(args.path.includes('node_modules')||path.basename(args.path)==='world3d.js')return;return{contents:readSource(args.path),loader:'js',resolveDir:path.dirname(args.path)};});build.onLoad({filter:/[/\\]world3d\.js$/},args=>{let source=readSource(args.path);const marker='return{render,project,screenToWorld';assert.ok(source.includes(marker));source=source.replace(marker,rendererHook+marker);return{contents:source,loader:'js',resolveDir:path.dirname(args.path)};});}}]});bundle=built.outputFiles[0].text;
 server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name==='/favicon.ico'){res.writeHead(204);res.end();return;}if(name==='/')name='/index.html';const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 const launch={headless:true,args:['--no-sandbox']};if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;else if(fs.existsSync('/usr/bin/chromium'))launch.executablePath='/usr/bin/chromium';browser=await chromium.launch(launch);
});
after(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
async function open(t,mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1}),page=await context.newPage(),errors=[];page.setDefaultTimeout(45000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|GL_INVALID|3D impossible/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{window.__v6Manual=true;window.__v6Lost=false;document.addEventListener('webglcontextlost',()=>window.__v6Lost=true,true);});await page.route('https://**/*',r=>r.abort());await page.route('**/game.bundle.js',r=>r.fulfill({contentType:'text/javascript',body:bundle}));
 t.after(async()=>{const lost=await page.evaluate(()=>window.__v6Lost).catch(()=>false);await context.close();assert.equal(lost,false,'context retained');assert.deepEqual(errors,[],'no renderer, geometry or JavaScript errors');});
 await page.goto(base);if(!baseline)assert.match(await page.title(),/Orvécendre.*V6/);await page.waitForFunction(()=>window.__v6QA?.view);await page.evaluate(()=>__v6QA.paint());await page.waitForFunction(()=>__v6QA.view.diagnostics().texturesReady);await page.evaluate(()=>__v6QA.paint());
 const d=await page.evaluate(()=>__v6QA.view.diagnostics());assert.equal(d.modelStyle,'sculpted');assert.equal(d.designRevision,3);return page;
}
async function hud(page){
 const value=await page.evaluate(()=>{const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};const c=document.getElementById('minimap'),g=c.getContext('2d');return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,resources:rect('hud-resources'),map:rect('minimap-button'),menu:rect('menu-button'),canvas:rect('game'),corner:g.getImageData(0,0,1,1).data[3],centre:g.getImageData(c.width/2,c.height/2,1,1).data[3]};});
 assert.ok(value.resources.x<25&&value.resources.y<60);assert.ok(value.map.x>value.width/2&&value.map.right<=value.width);assert.ok(value.resources.right<=value.map.x-2);assert.equal(value.corner,0);assert.ok(value.centre>0);assert.ok(value.menu.w>=44&&value.menu.h>=44);assert.equal(value.canvas.w,value.width);assert.equal(value.canvas.h,value.height);assert.ok(value.scrollWidth<=value.width&&value.scrollHeight<=value.height+1);return value;
}

for(const mobile of [false,true])test('V6 '+(mobile?'mobile':'desktop')+': unchanged sovereign and lower village rendering cost',async t=>{
 const page=await open(t,mobile);const portrait=await page.evaluate(()=>__v6Models.portraitBounds());assert.ok(portrait.minX>-1&&portrait.maxX<1&&portrait.minY>-1&&portrait.maxY<1,'full mature king stays in creation portrait');await page.screenshot({path:path.join(artifacts,mobile?'portrait-mobile.png':'portrait-desktop.png')});
 await page.evaluate(()=>__v6QA.village());await hud(page);const metrics=await page.evaluate(()=>__v6Models.profile());record(mobile?'mobile-village':'desktop-village',metrics);await page.screenshot({path:path.join(artifacts,mobile?'village-mobile.png':'village-desktop.png')});
 const king=await page.evaluate(()=>__v6Models.stats().king);assert.equal(king.anatomySource,'makehuman-cc0-sculpted');assert.ok(king.triangles>150000,'detailed king surface retained');
 if(!baseline){assert.ok(metrics.drawCalls<(mobile?550:600),'at least 25% fewer calls than V5.6 village');assert.ok(metrics.triangles<(mobile?1783117:1900821),'fewer rendered triangles than V5.6');}
 const frames=await page.evaluate(()=>__v6QA.stable());assert.ok(frames[0].colored>1000);assert.equal(frames[0].hash,frames[1].hash,'paused world has stable surfaces');
});


function pickedPixel(page,kind,id){return page.evaluate(({kind,id})=>{
 const owner=(kind==='wildlife'?__v6QA.state.wildlife:__v6QA.state.enemies).find(p=>p.id===id);if(!owner)throw Error('Missing target '+id);
 for(const h of [1.1,.9,.7,.5,.3,1.3,1.5]){const q=__v6QA.view.project(owner.x,owner.y,h);for(const dx of [0,-6,6,-12,12])for(const dy of [0,-6,6]){const x=q.x+dx,y=q.y+dy;if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;const hit=__v6QA.view.targetAt(x,y);if(hit?.kind===kind&&hit.id===id)return{x,y,hit};}}
 return null;
},{kind,id});}

test('V6 navigation: civilian walks around adjacent homes, shelters and returns to work',{skip:baseline},async t=>{
 const page=await open(t);await page.locator('#start').click();
 const residentId=await page.evaluate(()=>__v6QA.defenseScene());
 const shelter=await page.evaluate(()=>({resident:__v6QA.state.allies[0],render:__v6Models.stats().allies[0]}));assert.equal(shelter.resident.homeId,'refuge','resident keeps the home behind the blocked direct path');assert.equal(shelter.resident.sheltered,true,'civilian walks around adjacent house/refuge from the rear and reaches their own entrance');assert.equal(shelter.resident.hidden,true);assert.equal(shelter.render?.visible??false,false,'sheltered civilian is absent from exterior scene');
 await page.evaluate(()=>{__v6QA.state.phase='peace';__v6QA.state.enemies=[];__v6QA.step(.2);__v6QA.paint();});
 const outside=await page.evaluate(()=>({resident:__v6QA.state.allies[0],render:__v6Models.stats().allies[0]}));assert.equal(outside.resident.id,residentId);assert.equal(outside.resident.sheltered,false);assert.equal(outside.render.visible,true,'civilian emerges after danger');record('adjacent-home-navigation',{shelter,outside});
});

test('V6: real buildings under siege, enemy silhouettes and actual aimed combat',{skip:baseline},async t=>{
 const page=await open(t);await page.locator('#start').click();
 await page.evaluate(()=>{__v6QA.siegeScene();__v6QA.step(2);__v6QA.paint();});
 const siege=await page.evaluate(()=>({buildings:__v6QA.state.buildings.map(b=>({id:b.id,hp:b.hp})),enemies:__v6QA.state.enemies.map(e=>({id:e.id,targetType:e.targetType,targetId:e.targetId}))}));
 for(const id of ['qa-forge','qa-farm'])assert.ok(siege.buildings.find(b=>b.id===id).hp<150,id+'takes actual damage');assert.equal(siege.buildings.find(b=>b.id==='refuge').hp,160,'remote structures are attacked in their own right');assert.deepEqual(new Set(siege.enemies.map(e=>e.targetId)),new Set(['qa-forge','qa-farm']));assert.ok(siege.enemies.every(e=>e.targetType==='building'));record('siege-buildings',siege);
 await page.evaluate(()=>__v6QA.rosterScene());const roster=await page.evaluate(()=>__v6Models.stats().enemies);assert.equal(roster.length,5);assert.equal(new Set(roster.map(e=>e.kind)).size,5);assert.ok(roster.every(e=>e.visible&&e.metrics.triangles>1500));assert.ok(new Set(roster.map(e=>e.metrics.size.y.toFixed(3))).size>2,'enemy silhouettes vary');await page.screenshot({path:path.join(artifacts,'enemy-roster.png')});record('enemy-roster',roster);
 const memoryBase=await page.evaluate(()=>__v6QA.view.diagnostics().memory);for(let i=0;i<2;i++)await page.evaluate(()=>__v6QA.rosterScene());const memoryAfter=await page.evaluate(()=>__v6QA.view.diagnostics().memory);assert.ok(memoryAfter.geometries<=memoryBase.geometries+2,'repeated raids release owned skin geometry');assert.ok(memoryAfter.textures<=memoryBase.textures+1,'repeated raids release bone textures');record('respawn-memory',{memoryBase,memoryAfter});
 await page.evaluate(()=>__v6QA.battle());const point=await pickedPixel(page,'enemy','qa-raider');assert.ok(point,'new enemy body is selectable');await page.mouse.click(point.x,point.y);assert.equal(await page.evaluate(()=>__v6QA.state.arrows.filter(a=>a.owner==='king').length),1);await page.evaluate(()=>__v6QA.step(.35));assert.ok(await page.evaluate(()=>__v6QA.state.enemies.find(e=>e.id==='qa-raider').hp<100),'actual arrow hits selected new enemy');
});

test('V6 mobile: living forest targeting, threat menu and quality control',{skip:baseline},async t=>{
 const page=await open(t,true);await page.locator('#start').click();const animal=await page.evaluate(()=>__v6QA.forestScene());
 const point=await pickedPixel(page,'wildlife',animal.id);assert.ok(point,'new deer body is selectable');await page.touchscreen.tap(point.x,point.y);assert.ok(await page.evaluate(()=>__v6QA.state.arrows.some(a=>a.owner==='king')),'real touch fires');await page.evaluate(()=>__v6QA.step(.35));
 const hit=await page.evaluate(id=>__v6QA.state.wildlife.find(a=>a.id===id),animal.id);assert.ok(!hit||hit.hp<animal.hp,'real arrow damages animal');await page.evaluate(()=>__v6QA.paint());await page.screenshot({path:path.join(artifacts,'forest-mobile.png')});record('forest-target',{animal,point,after:hit});
 await page.locator('#menu-button').click();
 const tabs=await page.locator('.menu-card nav [data-tab]').evaluateAll(buttons=>buttons.map(b=>({id:b.dataset.tab,width:b.clientWidth,scrollWidth:b.scrollWidth})));assert.ok(tabs.every(b=>b.scrollWidth<=b.width+1),'mobile navigation labels fit their buttons');for(const tab of tabs){await page.locator('.menu-card nav [data-tab='+tab.id+']').click();assert.equal(await page.locator('#tab-'+tab.id).isVisible(),true,'horizontal navigation reaches '+tab.id);}record('mobile-menu-tabs',tabs);
 await page.locator('[data-tab=defense]').click();await page.waitForSelector('#enemy-guide');assert.match(await page.locator('#enemy-guide').textContent(),/Pillard|Javelinier|Sapeur/);assert.match(await page.locator('#wildlife-guide').textContent(),/Loup|Sanglier/);await page.screenshot({path:path.join(artifacts,'threats-mobile.png')});
 await page.locator('[data-tab=settings]').click();const quality=page.locator('#graphics-quality');assert.ok(await quality.count(),'graphics quality control available');const options=await quality.locator('option').evaluateAll(list=>list.map(o=>o.value));assert.ok(options.includes('auto'));const settings={};for(const mode of ['performance','quality','auto']){await quality.selectOption(mode);await page.evaluate(()=>__v6QA.draw());settings[mode]=await page.evaluate(()=>({mode:__v6QA.view.diagnostics().quality,ratio:__v6QA.view.diagnostics().pixelRatio}));assert.equal(settings[mode].mode,mode);assert.match(await page.locator('#menu-feedback').textContent(),/Affichage/);assert.equal(await page.locator('#notice').evaluate(e=>getComputedStyle(e).opacity),'0','options feedback stays inside the open menu');}assert.ok(settings.performance.ratio<settings.quality.ratio,'performance mode actually lowers mobile resolution');record('quality-options',settings);await page.locator('#resume').click();await page.evaluate(()=>__v6QA.paint());assert.equal(await page.locator('#menu').isVisible(),false);
});


test('V6 art: atlas-lit enemy silhouettes, ranks and woodland anatomy',{skip:baseline},async t=>{
 const page=await open(t);for(const kind of ['enemies','ranks','wildlife'])for(const animated of kind==='ranks'?[false]:[false,true]){
  const art=await page.evaluate(({kind,animated})=>__v6Models.studio(kind,animated),{kind,animated});const name=kind+(animated?'-moving':'');fs.writeFileSync(path.join(artifacts,'art-'+name+'.png'),Buffer.from(art.png.split(',')[1],'base64'));delete art.png;assert.ok(art.metrics.every(m=>m.size.x>0&&m.size.y>0&&m.size.z>0&&m.size.x<5&&m.size.y<5&&m.size.z<5&&m.triangles>1000),'all posed actors retain finite, bounded geometry');record('art-'+name,art.metrics);
 }
});
