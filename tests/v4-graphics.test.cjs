const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {build}=require('esbuild');
const {chromium}=require('playwright');

// A representative art scene, separate from the gameplay suite: all six jobs,
// every building family, construction, upgrades, the horse and the real forest.
// Hooks and engine counters exist only in this in-memory test bundle.
const root=path.resolve(__dirname,'..');
const artifacts=process.env.GRAPHICS_ARTIFACTS||path.join(os.tmpdir(),'courvane-v4-qa');
const baselineRoot=process.env.GRAPHICS_BASELINE_ROOT;
const fixtureImports="import {addResident as qaAdd,assignJob as qaAssign} from './simulation.js';\n";
const hook=`
window.__graphicsQA={get view(){return view},get state(){return state},draw,
  appearance(value){customizeKing(state,value);draw();draw();},
  portrait(value){paused=true;view.setPortrait(value);draw();draw();},
  village(){
    paused=true;clock=0;state=createGame(20261025);state.phaseRemaining=10000;
    state.kingdomLevel=4;state.xp=600;state.gold=1200;state.resources.weapons=8;
    const entries=[
      ['house',220,190,2],['house',800,190,1],['academy',500,-65,1],
      ['forge',180,490,2],['farm',815,510,1],['treasury',810,-70,2],
      ['wall',335,440,2],['wall',415,440,2],['house',-50,190,1],['house',510,670,1]
    ];
    for(let i=0;i<entries.length;i++){
      const [type,x,y,level]=entries[i],def=BUILDINGS[type];
      state.buildings.push({id:'qa-building-'+i,type,x,y,level,rotation:0,
        complete:i!==8,progress:i===8?def.work*.35:def.work,work:def.work,
        hp:150,maxHp:150,...(i===9?{upgrading:true,upgradeProgress:5,upgradeWork:30}:{})});
    }
    const jobs=['worker','builder','knight','farmer','armorer','inventor'];
    for(let i=0;i<jobs.length;i++){
      if(!qaAdd(state,i<5?'rescued':'hired'))throw Error('Art fixture resident '+i+' rejected');
      const person=state.allies.at(-1),result=qaAssign(state,person.id,jobs[i]);
      if(!result.ok)throw Error(result.text);
      person.x=340+i*65;person.y=355+(i%2)*70;person.aim=.2;
    }
    Object.assign(state.king,{x:500,y:475,aim:.2});Object.assign(state.horse,{x:650,y:460});
    $('intro').hidden=true;$('menu').hidden=true;$('overlay').hidden=true;
    view.setPortrait(false);view.setZoom(.8);ui(true);draw();draw();
    return{jobs:state.allies.map(p=>p.job),buildings:state.buildings.length-1};
  },
  stable(){
    draw();draw();const result=[];
    for(let f=0;f<2;f++){
      draw();const gl=canvas.getContext('webgl2'),pixels=new Uint8Array(canvas.width*canvas.height*4);
      gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let hash=2166136261,colored=0;
      for(let i=0;i<pixels.length;i+=16){
        hash=Math.imul(hash^pixels[i],16777619);hash=Math.imul(hash^pixels[i+1],16777619);
        hash=Math.imul(hash^pixels[i+2],16777619);if(pixels[i]+pixels[i+1]+pixels[i+2]>70)colored++;
      }
      result.push({hash,colored});
    }
    return result;
  }
};`;

let browser,server,base;
async function bundle(sourceRoot){
  // Stop only the game's automatic render scheduling after load. Playwright and
  // the browser retain their own requestAnimationFrame; explicit production draw
  // calls below avoid filling software GL's queue while taking screenshots.
  const source=fs.readFileSync(path.join(sourceRoot,'game.js'),'utf8')
    .replaceAll('if(view)requestAnimationFrame(frame)','if(view&&!window.__graphicsManual)requestAnimationFrame(frame)');
  const result=await build({stdin:{contents:fixtureImports+source+hook,resolveDir:sourceRoot,sourcefile:'game.js'},
    absWorkingDir:root,nodePaths:[path.join(root,'node_modules')],bundle:true,write:false,format:'iife',
    loader:{'.png':'dataurl'},logLevel:'silent',plugins:[{name:'graphics-engine-counters',setup(build){
      build.onLoad({filter:/[/\\]world3d\.js$/},async args=>{
        let text=fs.readFileSync(args.path,'utf8');
        const marker='diagnostics:()=>({';
        assert.ok(text.includes(marker),'renderer diagnostics available for test-only engine counters');
        const portraitBounds=`portraitKing?(()=>{
          portraitKing.updateWorldMatrix(true,true);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
          portraitKing.traverseVisible(m=>{if(!m.isMesh)return;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();
            const b=m.geometry.boundingBox;
            for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){
              const p=new THREE.Vector3(x,y,z).applyMatrix4(m.matrixWorld).project(portraitCamera);
              minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
            }
          });return{minX,maxX,minY,maxY};
        })():null`;
        text=text.replace(marker,marker+`qa:{memory:{...renderer.info.memory},programs:renderer.info.programs.length,kingHeight:new THREE.Box3().setFromObject(king).max.y-king.position.y,portraitBounds:${portraitBounds},texturesReady:painted.ready??true,textureSource:painted.source||'v3-procedural'},`);
        return{contents:text,loader:'js',resolveDir:path.dirname(args.path)};
      });
    }}]});
  return result.outputFiles[0].text;
}

before(async()=>{
  fs.mkdirSync(artifacts,{recursive:true});
  server=http.createServer((req,res)=>{
    let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name==='/favicon.ico'){res.writeHead(204);res.end();return;}
    if(name==='/')name='/index.html';
    const target=path.resolve(root,'.'+name);
    if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    try{const data=fs.readFileSync(target),type={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'}[path.extname(target)];
      res.setHeader('Content-Type',type||'application/octet-stream');res.end(data);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
  const launch={headless:true,args:['--no-sandbox']};
  if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;
  else if(fs.existsSync('/usr/bin/chromium'))launch.executablePath='/usr/bin/chromium';
  browser=await chromium.launch(launch);
});
after(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});

async function open(t,{sourceRoot=root,width=1280,height=900,mobile=false}={}){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(45000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|GL_INVALID|3D impossible/i.test(m.text()))errors.push(m.text());});
  await page.addInitScript(()=>{window.__graphicsContextLost=false;document.addEventListener('webglcontextlost',()=>{window.__graphicsContextLost=true;},true);});
  await page.route('https://**/*',route=>route.abort());
  await page.route('**/game.bundle.js',route=>bundle(sourceRoot).then(body=>route.fulfill({contentType:'text/javascript',body})));
  if(sourceRoot!==root){
    await page.route(base+'/',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(sourceRoot,'index.html'),'utf8')}));
    await page.route('**/style.css',route=>route.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(sourceRoot,'style.css'),'utf8')}));
  }
  t.after(async()=>{const lost=await page.evaluate(()=>window.__graphicsContextLost).catch(()=>false);await context.close();assert.equal(lost,false,'WebGL context survived');assert.deepEqual(errors,[],'no JavaScript or shader errors');});
  await page.goto(base);await page.waitForFunction(()=>window.__graphicsQA?.view?.diagnostics().frames>1);
  await page.waitForFunction(()=>__graphicsQA.view.diagnostics().qa.texturesReady);
  if(sourceRoot===root)assert.equal(await page.evaluate(()=>__graphicsQA.view.diagnostics().qa.textureSource),'original-painted-atlas','the actual V4 atlas, not the procedural fallback, is ready');
  await page.evaluate(()=>{window.__graphicsManual=true;});
  await page.waitForTimeout(250);
  return page;
}
async function cleanShot(page,name){
  const style=await page.addStyleTag({content:'.arena > :not(canvas){visibility:hidden!important}'});
  await page.evaluate(()=>{__graphicsQA.draw();__graphicsQA.draw();});
  await page.screenshot({path:path.join(artifacts,name+'.png')});await style.evaluate(node=>node.remove());
}
async function stable(page){
  const frames=await page.evaluate(()=>__graphicsQA.stable());
  assert.ok(frames[0].colored>1000,'the paused frame contains rendered color');
  assert.equal(frames[0].hash,frames[1].hash,'immediate paused renders remain identical');
  return frames[0].hash;
}
async function metrics(page){return page.evaluate(()=>__graphicsQA.view.diagnostics());}
function checkpoint(report){
  fs.writeFileSync(path.join(artifacts,'metrics.json'),JSON.stringify(report,null,2)+'\n');
  const [label,value]=Object.entries(report).at(-1);
  console.log(label+': '+JSON.stringify({drawCalls:value.drawCalls,triangles:value.triangles,memory:value.qa.memory,textureSource:value.qa.textureSource}));
}

test('V4 art: full village, custom portraits, rebuilt models and mobile framing',async t=>{
  const report={};
  if(baselineRoot){
    await t.test('frozen V3 reference under the same scene and camera',async t=>{
      const page=await open(t,{sourceRoot:baselineRoot});
      await page.screenshot({path:path.join(artifacts,'before-portrait-desktop.png')});
      await page.evaluate(()=>__graphicsQA.village());await stable(page);
      report.before=await metrics(page);checkpoint(report);await cleanShot(page,'before-village-desktop');
    });
  }
  await t.test('desktop portraits and representative village',async t=>{
    const page=await open(t);
    await page.screenshot({path:path.join(artifacts,'v4-portrait-desktop.png')});
    const defaultPortrait=await stable(page);
    await page.evaluate(()=>__graphicsQA.appearance({beard:'none',hair:'#d6d1c3',skin:'#875535',cape:'#26775b',crown:'spiked'}));
    assert.notEqual(await stable(page),defaultPortrait,'customization changes the rendered sovereign');
    await page.screenshot({path:path.join(artifacts,'v4-portrait-alternate.png')});
    const fixture=await page.evaluate(()=>__graphicsQA.village());
    assert.deepEqual(fixture.jobs,['worker','builder','knight','farmer','armorer','inventor']);
    report.desktop=await metrics(page);checkpoint(report);
    assert.equal(report.desktop.placedBuildings,fixture.buildings,'all ten test buildings render, including scaffolding');
    assert.equal(report.desktop.actors,7,'king and every resident profession render');
    assert.ok(report.desktop.forestTrees>500,'the populated scene retains the open forest');
    await stable(page);await cleanShot(page,'v4-village-desktop');
    // A round trip exercises picking against the rendered camera, independent of
    // the much more extensive public construction workflow in mobile.browser.cjs.
    const picked=await page.evaluate(()=>{const p=__graphicsQA.view.project(620,540);return __graphicsQA.view.screenToWorld(p.x,p.y);});
    assert.ok(Math.abs(picked.x-620)<.001&&Math.abs(picked.y-540)<.001,'projection and picking agree');
    const baseline=await metrics(page);
    for(let i=0;i<6;i++)await page.evaluate(i=>{
      __graphicsQA.appearance({beard:i%2?'short':'long',crown:i%2?'spiked':'classic',cape:i%2?'#9c2947':'#286bc3'});
      __graphicsQA.portrait(true);__graphicsQA.portrait(false);
      __graphicsQA.view.setPlacement({type:i%2?'academy':'house',x:620,y:630,rotation:i*Math.PI/2,valid:i%2===0});
      __graphicsQA.draw();__graphicsQA.view.setPlacement(null);__graphicsQA.draw();
    },i);
    await stable(page);report.rebuilt=await metrics(page);checkpoint(report);
    assert.equal(report.rebuilt.actors,7);assert.equal(report.rebuilt.placedBuildings,10);
    // Shared materials may add a bounded palette cache; owned preview geometries
    // and signature-rebuilt character geometry must be released.
    assert.ok(report.rebuilt.qa.memory.geometries<=baseline.qa.memory.geometries+24,
      'repeated appearance and placement rebuilds keep geometry allocations bounded');
    assert.ok(report.rebuilt.drawCalls<900,'representative desktop village stays under 900 draw calls, including shadows');
  });
  await t.test('mobile portrait and world stay framed after rotation, riding and exploration',async t=>{
    const page=await open(t,{width:390,height:844,mobile:true});
    await page.screenshot({path:path.join(artifacts,'v4-portrait-mobile.png')});await stable(page);
    await page.evaluate(()=>__graphicsQA.appearance({crown:'spiked'}));
    const portrait=await metrics(page),pb=portrait.qa.portraitBounds;
    assert.ok(pb.minX>-1&&pb.maxX<1&&pb.minY>-1&&pb.maxY<.98,
      'visible sovereign and taller spiked crown keep a margin inside the mobile portrait: '+JSON.stringify(pb));
    await page.screenshot({path:path.join(artifacts,'v4-portrait-mobile-spiked.png')});
    await page.evaluate(()=>__graphicsQA.village());await stable(page);
    report.mobile=await metrics(page);checkpoint(report);await cleanShot(page,'v4-village-mobile');
    assert.ok(report.mobile.drawCalls<750,'representative mobile village stays under 750 draw calls, including shadows');
    for(const [width,height]of[[390,844],[844,390],[320,568]]){
      await page.setViewportSize({width,height});
      const bounds=await page.evaluate(()=>{
        const qa=__graphicsQA,s=qa.state;
        qa.view.setZoom(1);
        const probes=[];
        for(const [x,y,mounted]of[[500,475,false],[500,475,true],[-1700,-1800,false],[2700,2400,false]]){
          Object.assign(s.king,{x,y,mounted});qa.draw();qa.draw();
          const d=qa.view.diagnostics(),crown=qa.view.project(x,y,d.qa.kingHeight+(mounted?1.15:0)),feet=qa.view.project(x,y);
          probes.push({crown,feet});
        }
        return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,probes};
      });
      assert.ok(bounds.scrollWidth<=width&&bounds.scrollHeight<=height+1,'game viewport does not overflow');
      for(const {crown,feet}of bounds.probes)assert.ok(crown.x>0&&crown.x<width&&crown.y>0&&feet.y<height,'crown and feet remain inside '+width+'×'+height+': '+JSON.stringify({crown,feet}));
    }
    await stable(page);
  });
  fs.writeFileSync(path.join(artifacts,'metrics.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Graphics evidence: '+artifacts);
});
