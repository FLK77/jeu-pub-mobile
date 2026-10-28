const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {build}=require('esbuild');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),artifacts=process.env.V56_ARTIFACTS||'/tmp/cendrune-v5.6-qa',artOnly=process.env.V56_ART_ONLY==='1';
const sourceImports="import {addResident as qaAdd,assignJob as qaAssign,stepGame as qaStep} from './simulation.js';\n";
const controllerHook=`
window.__realQA={get state(){return state},get view(){return view},draw,paint(){ui(true);draw();draw();},step(dt){qaStep(state,dt);ui(true);},
 battle(){paused=false;state.phase='peace';state.phaseRemaining=10000;state.arrows=[];state.enemies=[{x:650,y:600,hp:100,maxHp:100,speed:0},{x:350,y:600,hp:100,maxHp:100,speed:0}];Object.assign(state.king,{x:500,y:600,cool:0,target:null,targetTTL:0,aim:Math.PI/2});ui(true);draw();draw();},
 village(){paused=true;clock=0;state=createGame(20261026);state.phaseRemaining=10000;state.kingdomLevel=4;state.xp=600;state.gold=1200;state.resources.weapons=8;
 for(const[i,e]of [['house',220,190,2],['house',800,190,1],['academy',500,-65,1],['forge',180,490,2],['farm',815,510,1],['treasury',810,-70,2],['wall',335,440,2],['wall',415,440,2],['house',-50,190,1],['house',510,670,1]].entries()){const[type,x,y,level]=e,def=BUILDINGS[type];state.buildings.push({id:'art-'+i,type,x,y,level,rotation:0,complete:true,progress:def.work,work:def.work,hp:150,maxHp:150});}
 for(const[i,job]of ['worker','builder','knight','farmer','armorer','inventor'].entries()){if(!qaAdd(state,i<5?'rescued':'hired'))throw Error('Resident rejected');const p=state.allies.at(-1);if(!qaAssign(state,p.id,job).ok)throw Error('Job rejected');Object.assign(p,{x:340+i*65,y:355+(i%2)*70,aim:.2});}
 Object.assign(state.king,{x:500,y:475,aim:.2});Object.assign(state.horse,{x:650,y:460});$('intro').hidden=true;$('menu').hidden=true;$('overlay').hidden=true;view.setPortrait(false);view.setZoom(.8);ui(true);draw();draw();
 },
 appearance(value){customizeKing(state,value);ui(true);draw();draw();},
};`;
const rendererHook=`
let qaStudioRoots=[];
function qaModelMetrics(object){
 object.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(object),size=b.getSize(new THREE.Vector3());let meshes=0,triangles=0,invalid=0;const surfaces=new Set();
 object.traverseVisible(m=>{if(!m.isMesh)return;meshes++;const p=m.geometry.attributes.position;triangles+=(m.geometry.index?m.geometry.index.count:p.count)/3;for(let i=0;i<p.array.length;i++)if(!Number.isFinite(p.array[i]))invalid++;surfaces.add([m.material.map?.uuid||'',m.material.bumpMap?.uuid||'',m.material.roughnessMap?.uuid||''].join(':'));});
 return{size:{x:size.x,y:size.y,z:size.z},minY:b.min.y,meshes,triangles,invalid,surfaces:surfaces.size,anatomy:object.userData.anatomy,anatomySource:object.userData.anatomySource,designRevision:object.userData.designRevision,modelVersion:object.userData.modelVersion,modelStyle:object.userData.modelStyle};
}
window.__realModels={
 disposeStudio(){qaStudioRoots.forEach(disposeTree);qaStudioRoots=[];},
 stats(){return{king:qaModelMetrics(king),horse:qaModelMetrics(mount),horseLegs:horseLegs.map(l=>({y:l.position.y,rotation:l.rotation.x})),kingLegs:king.userData.legs.map(l=>({x:l.position.x,y:l.position.y,rotation:l.rotation.x})),actorCount:collections.allies.size};},
 portraitBounds(){if(!portraitKing)return null;portraitKing.updateWorldMatrix(true,true);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;portraitKing.traverseVisible(m=>{if(!m.isMesh)return;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(m.matrixWorld).project(portraitCamera);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}});return{minX,minY,maxX,maxY};},
 stable(){const frames=[];for(let f=0;f<2;f++){window.__realQA.draw();const c=renderer.domElement,gl=c.getContext('webgl2'),pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let hash=2166136261,colored=0;for(let i=0;i<pixels.length;i+=16){hash=Math.imul(hash^pixels[i],16777619);hash=Math.imul(hash^pixels[i+1],16777619);hash=Math.imul(hash^pixels[i+2],16777619);if(pixels[i]+pixels[i+1]+pixels[i+2]>70)colored++;}frames.push({hash,colored});}return frames;},
 studio(kind,options={}){
  qaStudioRoots.forEach(disposeTree);qaStudioRoots=[];
  const studio=new THREE.Scene();studio.background=new THREE.Color('#dddcd6');studio.environment=skyEnvironment.texture;studio.environmentIntensity=.4;
  studio.add(new THREE.HemisphereLight('#e4ecfa','#a58c74',.85));
  const key=new THREE.DirectionalLight('#fff1dd',3.1);key.position.set(-4,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2.3,right:2.3,top:3,bottom:-1,near:.5,far:15});key.shadow.bias=-.00002;key.shadow.normalBias=.0015;key.target.position.set(0,1.35,0);studio.add(key.target);studio.add(key);const rim=new THREE.DirectionalLight('#a9cffa',1.6);rim.position.set(4,3,-3);studio.add(rim);
  const models=[],preserved=[];const add=(object,x=0)=>{object.removeFromParent();studio.add(object);object.position.x=x;qaStudioRoots.push(object);models.push(object);return object;};
  if(kind==='rider'){for(const object of[king,mount]){preserved.push({object,parent:object.parent,position:object.position.clone(),quaternion:object.quaternion.clone()});studio.add(object);models.push(object);}pose(king,{x:500,y:325,aim:0,weapon:'bow'},0,true);mount.position.set(0,0,0);mount.rotation.set(0,0,0);for(const l of horseLegs)l.rotation.x=0;horseHead.rotation.x=0;tail.rotation.z=0;}
  else if(kind==='king'){const model=add(royal.character('king',options));pose(model,{x:500,y:325,aim:0,weapon:options.weapon||'bow'},0,false,null,!options.play);}
  else if(kind==='horse')add(animals.horse(options.coat||'chestnut').root);
  else if(kind==='pig')add(animals.pig(studio));
  else if(kind==='jobs')for(const[i,job]of ['worker','builder','knight','farmer','armorer','inventor','unassigned'].entries())add(royal.character(job),i*1.2);
  else throw Error('Unknown studio');
  const bounds=new THREE.Box3();for(const object of models)bounds.union(new THREE.Box3().setFromObject(object));const size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
  const aspect=renderer.domElement.clientWidth/renderer.domElement.clientHeight;let span=kind==='jobs'?Math.max(size.y*1.35,size.x/aspect*1.15):Math.max(size.y*1.3,size.x/aspect*1.6,2.7);
  if(kind==='king'&&options.view){const framing={bust:{y:2.00,z:0,span:1.68},face:{y:2.24,z:.045,span:.68},crown:{y:2.62,z:0,span:.72},hands:{y:options.play?1.15:1.58,z:options.play?.13:.4,span:options.play?.83:.66}}[options.view];if(!framing)throw Error('Unknown crop');centre.set(0,framing.y,framing.z);span=framing.span;}
  const camera=new THREE.OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,60);
  const angle=options.back?Math.PI:options.side?-Math.PI/2:options.front?0:kind==='horse'?-1.05:.38;camera.position.copy(centre).add(new THREE.Vector3(Math.sin(angle)*8,options.view? .12:kind==='horse'?.9:.55,Math.cos(angle)*8));camera.lookAt(centre);camera.updateMatrixWorld();
  renderer.render(studio,camera);const png=renderer.domElement.toDataURL('image/png'),metrics=models.map(qaModelMetrics);key.shadow.dispose();for(const p of preserved){p.parent.add(p.object);p.object.position.copy(p.position);p.object.quaternion.copy(p.quaternion);}return{png,metrics,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
 }
};
`;
let browser,server,base,bundle;
const report={};
function record(key,value){report[key]=value;fs.writeFileSync(path.join(artifacts,'metrics.json'),JSON.stringify(report,null,2)+'\n');console.log(key+': '+JSON.stringify(value));}
before(async()=>{
 fs.mkdirSync(artifacts,{recursive:true});
 const files=['package.json','package-lock.json','scripts/build-pc.py','scripts/build-king-anatomy.py',...fs.readdirSync(root).filter(n=>n.endsWith('.js')&&n!=='game.bundle.js').sort(),...fs.readdirSync(path.join(root,'assets')).filter(n=>/\.(png|json)$/.test(n)).sort().map(n=>'assets/'+n)];fs.writeFileSync(path.join(artifacts,'source-manifest.json'),JSON.stringify({files:files.map(name=>({path:name,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')}))},null,2)+'\n');
 const source=fs.readFileSync(path.join(root,'game.js'),'utf8').replaceAll('if(view)requestAnimationFrame(frame)','if(view&&!window.__realManual)requestAnimationFrame(frame)');
 const built=await build({stdin:{contents:sourceImports+source+controllerHook,resolveDir:root,sourcefile:'game.js'},bundle:true,write:false,format:'iife',loader:{'.png':'dataurl'},logLevel:'silent',plugins:[{name:'realistic-test-only',setup(build){build.onLoad({filter:/[/\\]world3d\.js$/},args=>{let text=fs.readFileSync(args.path,'utf8');const marker='return{render,project,screenToWorld';assert.ok(text.includes(marker));text=text.replace(marker,rendererHook+marker);return{contents:text,loader:'js',resolveDir:path.dirname(args.path)};});}}]});bundle=built.outputFiles[0].text;
 server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name==='/favicon.ico'){res.writeHead(204);res.end();return;}if(name==='/')name='/index.html';const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 const launch={headless:true,args:['--no-sandbox']};if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;else if(fs.existsSync('/usr/bin/chromium'))launch.executablePath='/usr/bin/chromium';browser=await chromium.launch(launch);
});
after(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
async function open(t,mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1}),page=await context.newPage(),errors=[];page.setDefaultTimeout(45000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|GL_INVALID|3D impossible/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{window.__realLost=false;document.addEventListener('webglcontextlost',()=>window.__realLost=true,true);});await page.route('https://**/*',r=>r.abort());await page.route('**/game.bundle.js',r=>r.fulfill({contentType:'text/javascript',body:bundle}));
 t.after(async()=>{const lost=await page.evaluate(()=>window.__realLost).catch(()=>false);await context.close();assert.equal(lost,false);assert.deepEqual(errors,[],'no geometry merge, shader or runtime errors');});
 await page.goto(base);assert.match(await page.title(),/Cendrune.*V5\.6/);await page.waitForFunction(()=>window.__realQA?.view?.diagnostics().frames>1&&__realQA.view.diagnostics().texturesReady);await page.evaluate(()=>{window.__realManual=true;});const d=await page.evaluate(()=>__realQA.view.diagnostics());assert.equal(d.realismSource,'original-realistic-atlas');assert.equal(d.modelStyle,'sculpted');assert.equal(d.designRevision,3);assert.equal(d.animalStyle,'realistic');return page;
}
async function captureStudio(page,kind,name,options={}){
 const result=await page.evaluate(({kind,options})=>__realModels.studio(kind,options),{kind,options});fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
 for(const m of result.metrics){assert.equal(m.invalid,0,'all sculpted vertex positions are finite');assert.ok(m.meshes>2&&m.surfaces>1);assert.ok(m.triangles>1000);}
 record(name,result);return result;
}

// A fast, separate art gate: the final regression suite is only run after
// these views are accepted. This avoids re-running scenery/interaction checks
// for every facial, hand or armor adjustment during the sculpt review.
test('V5.6 art preview: production face, grip, bust, full figure and creation portrait',{skip:!artOnly},async t=>{
 const page=await open(t);await page.screenshot({path:path.join(artifacts,'portrait-desktop.png')});
 for(const view of ['face','hands','bust'])await captureStudio(page,'king','king-'+view,{outfit:'royal',view});
 await captureStudio(page,'king','king-royal',{outfit:'royal'});
 await captureStudio(page,'king','king-royal-side',{outfit:'royal',side:true});
 await captureStudio(page,'king','king-crown',{outfit:'royal',view:'crown'});
 await captureStudio(page,'king','king-face-side',{outfit:'royal',view:'face',side:true});
 for(const weapon of ['bow','axe'])await captureStudio(page,'king','king-hands-'+weapon,{outfit:'royal',view:'hands',play:true,weapon});
});

test('V5.6 sovereign: anatomical face and hands, sculpted armor, regalia and original world',{skip:artOnly},async t=>{
 const page=await open(t);await page.screenshot({path:path.join(artifacts,'portrait-desktop.png')});
 for(const [outfit,emblem]of [['royal','sun'],['ranger','stag'],['warden','moon']])await captureStudio(page,'king','king-'+outfit,{outfit,emblem});
 await captureStudio(page,'king','king-royal-front',{outfit:'royal',front:true});
 await captureStudio(page,'king','king-royal-side',{outfit:'royal',side:true});await captureStudio(page,'king','king-royal-back',{outfit:'royal',back:true});
 for(const view of ['bust','face','crown','hands'])await captureStudio(page,'king','king-'+view,{outfit:'royal',view});
 await captureStudio(page,'king','king-face-side',{outfit:'royal',view:'face',side:true});
 for(const weapon of ['bow','axe'])await captureStudio(page,'king','king-hands-'+weapon,{outfit:'royal',view:'hands',play:true,weapon});
 await captureStudio(page,'rider','rider-threequarter');await captureStudio(page,'rider','rider-side',{side:true});
 await captureStudio(page,'jobs','professions');
 // Population and animals are unchanged; the CPU fixture checks their exact
 // mesh fingerprints. One production lineup documents their scale beside him.
 await page.evaluate(()=>{__realModels.disposeStudio();__realQA.village();});await page.screenshot({path:path.join(artifacts,'village-desktop.png')});
 const base=await page.evaluate(()=>__realQA.view.diagnostics());record('desktop-budget',base);assert.ok(base.drawCalls<900,'desktop budget remains bounded: '+base.drawCalls);
 for(const value of [{outfit:'ranger',hairStyle:'braids',mountCoat:'ivory'},{outfit:'warden',hairStyle:'short',mountCoat:'night'},{outfit:'royal',hairStyle:'swept',mountCoat:'chestnut'}])await page.evaluate(value=>__realQA.appearance(value),value);
 const rebuilt=await page.evaluate(()=>__realQA.view.diagnostics());assert.ok(rebuilt.memory.geometries<=base.memory.geometries+30,'rebuilt costumes and coats do not leak owned geometry');assert.ok(rebuilt.memory.textures<=base.memory.textures+6,'physical maps are shared');
 record('desktop-village',{base,rebuilt,models:await page.evaluate(()=>__realModels.stats())});
});

test('V5.6 sovereign: real touch combat, equipment, mounted framing and mobile budgets',{skip:artOnly},async t=>{
 const page=await open(t,true);await page.locator('#preset-warden').click();await page.evaluate(()=>__realQA.paint());
 const portrait=await page.evaluate(()=>__realModels.portraitBounds());assert.ok(portrait.minX>-1&&portrait.maxX<1&&portrait.minY>-1&&portrait.maxY<1,'new crown, cape and sovereign fit portrait');await page.screenshot({path:path.join(artifacts,'portrait-mobile.png')});
 await page.locator('#start').click();await page.evaluate(()=>__realQA.battle());const target=await page.evaluate(()=>__realQA.view.project(650,600,1.3));await page.touchscreen.tap(target.x,target.y);
 assert.equal(await page.evaluate(()=>__realQA.state.arrows.length),1);assert.ok(await page.evaluate(()=>Math.abs(__realQA.state.king.target.x-650)<1&&Math.abs(__realQA.state.king.target.y-600)<1),'tap on the visible enemy body selects its actual position');await page.evaluate(()=>__realQA.step(1));assert.ok(await page.evaluate(()=>__realQA.state.enemies[0].hp<100));
 await page.locator('#weapon-axe').click();await page.evaluate(()=>__realQA.paint());assert.equal(await page.evaluate(()=>__realQA.view.diagnostics().equippedWeapon),'axe','new hand equipment follows the real weapon control');await page.locator('#weapon-bow').click();await page.evaluate(()=>__realQA.paint());assert.equal(await page.evaluate(()=>__realQA.view.diagnostics().equippedWeapon),'bow');
 await page.evaluate(()=>__realQA.village());const base=await page.evaluate(()=>__realQA.view.diagnostics());assert.ok(base.drawCalls<750,'realistic mobile scene keeps established750 draw budget: '+base.drawCalls);assert.ok(base.triangles<1800000,'realistic scene keeps1.8M triangle budget: '+base.triangles);await page.screenshot({path:path.join(artifacts,'village-mobile.png')});
 const frames=await page.evaluate(()=>__realModels.stable());assert.ok(frames[0].colored>1000);assert.equal(frames[0].hash,frames[1].hash,'paused folds, chainmail and fur remain stable');
 await page.evaluate(()=>{Object.assign(__realQA.state.king,{mounted:true,x:650,y:460,aim:.2});Object.assign(__realQA.state.horse,{x:650,y:460,aim:.2});__realQA.paint();});await page.screenshot({path:path.join(artifacts,'mounted-mobile.png')});
 const mounted=await page.evaluate(()=>__realModels.stats());assert.ok(mounted.kingLegs.every(l=>l.rotation<0),'rider legs articulate in mounted pose');
 for(const [width,height]of [[390,844],[844,390],[320,568]]){await page.setViewportSize({width,height});const framed=await page.evaluate(()=>{__realQA.view.setZoom(1);__realQA.paint();const k=__realQA.state.king,b=__realModels.stats().king;return{top:__realQA.view.project(k.x,k.y,b.minY+b.size.y),feet:__realQA.view.project(k.x,k.y)}});assert.ok(framed.top.y>0&&framed.feet.y<height,'full mounted figure stays within '+width+'×'+height);}
 record('mobile-village',{base,portrait,mounted,stable:frames});
});
