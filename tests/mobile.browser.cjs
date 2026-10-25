const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {setTimeout:delay}=require('node:timers/promises');
const playwright=require('playwright');
const browserName=process.env.BROWSER||'chromium';
const base='http://127.0.0.1:3103';
let browser,server;
const source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
const hook='\nwindow.__gameTest={get state(){return state},get paused(){return paused},get input(){return {x:joy.x,y:joy.y,pointer:pointer.id,keys:[...keys]}},reset,update,draw,ui,get view(){return view}};';
const testBundle=require('esbuild').buildSync({stdin:{contents:source+hook,resolveDir:require('node:path').join(__dirname,'..'),sourcefile:'game.js'},bundle:true,write:false,format:'iife',logLevel:'silent'}).outputFiles[0].text;
before(async()=>{
  server=spawn(process.execPath,['server.js'],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,PORT:'3103'}});
  let ready=false;
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await delay(50);}
  assert.ok(ready,'test server started');
  const launch={headless:true};
  if(browserName==='chromium'){
    launch.args=['--no-sandbox'];
    if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;
    else if(fs.existsSync('/usr/bin/chromium'))launch.executablePath='/usr/bin/chromium';
  }
  browser=await playwright[browserName].launch(launch);
});
after(async()=>{if(browser)await browser.close();if(server)server.kill();});
async function open(t,{width=390,height=844,mobile=true}={}){
  const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
  const page=await context.newPage(),errors=[];
  page.setDefaultTimeout(5000);
  page.on('pageerror',e=>errors.push(e.message));
  // Prove gameplay doesn't need external fonts. Hooks only exist in the test response.
  await page.route('https://**/*',route=>route.abort());
  await page.route('**/game.bundle.js',route=>route.fulfill({contentType:'text/javascript',body:testBundle}));
  t.after(async()=>{await context.close();assert.deepEqual(errors,[],'no uncaught JavaScript errors');});
  await page.goto(base);
  await page.waitForFunction(()=>window.__gameTest&&__gameTest.view&&__gameTest.view.diagnostics().frames>0);
  assert.equal(await page.locator('#game').getAttribute('data-renderer'),'webgl2');
  await page.evaluate(()=>{__gameTest.state.left=1;__gameTest.state.spawn=1e9;});
  return page;
}
async function hold(page){
  const r=await page.locator('#stick').boundingBox();
  await page.mouse.move(r.x+r.width/2+25,r.y+r.height/2);
  await page.mouse.down();
  // Let the browser apply pending pointer capture before testing its loss.
  await page.mouse.move(r.x+r.width/2+26,r.y+r.height/2);
  await page.waitForFunction(()=>__gameTest.input.x>.5);
}
async function checkLayout(page){
  const metrics=await page.evaluate(()=>{
    const ids=['pause','sound','stick','recruit','fortify','upgrade'];
    return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
      controls:ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{id,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};})};
  });
  assert.ok(metrics.scrollWidth<=metrics.width,JSON.stringify(metrics));
  assert.ok(metrics.scrollHeight<=metrics.height+1,'no need to scroll between joystick and purchases: '+JSON.stringify(metrics));
  for(const r of metrics.controls){assert.ok(r.x>=0&&r.y>=0&&r.right<=metrics.width+1&&r.bottom<=metrics.height+1,'control visible: '+JSON.stringify(r));assert.ok(r.width>=44&&r.height>=44,'44px touch target: '+JSON.stringify(r));}
}

test('phone and tablet: purchases, joystick and pause fit in portrait and landscape',async t=>{
  const page=await open(t);
  for(const [width,height]of [[320,568],[375,667],[390,844],[412,915],[768,1024],[1024,768],[844,390],[667,375],[568,320]]){
    await page.setViewportSize({width,height});
    await page.waitForTimeout(60);
    await checkLayout(page);
  }
});

test('joystick capture: dragging outside, second pointer, cancellation and lost capture',async t=>{
  const page=await open(t);
  const before=await page.evaluate(()=>__gameTest.state.king.x);
  await hold(page);await page.waitForTimeout(200);
  assert.ok(await page.evaluate(()=>__gameTest.state.king.x)>before+15);
  const id=await page.evaluate(()=>__gameTest.input.pointer);
  await page.dispatchEvent('#stick','pointerdown',{pointerId:999,pointerType:'touch'});
  await page.dispatchEvent('#stick','pointerup',{pointerId:999,pointerType:'touch'});
  assert.equal(await page.evaluate(()=>__gameTest.input.pointer),id,'second finger does not steal or release joystick');
  await page.mouse.move(350,300);
  assert.ok(await page.evaluate(()=>Math.hypot(__gameTest.input.x,__gameTest.input.y))>.9,'capture follows finger outside the ring');
  await page.dispatchEvent('#stick','pointercancel',{pointerId:id});
  assert.equal(await page.evaluate(()=>__gameTest.input.pointer),null);
  await page.mouse.up();
  await hold(page);
  await page.evaluate(()=>document.getElementById('stick').releasePointerCapture(__gameTest.input.pointer));
  await page.mouse.move(355,305);
  await page.waitForFunction(()=>__gameTest.input.pointer===null);
  await page.mouse.up();
  const stopped=await page.evaluate(()=>__gameTest.state.king.x);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>__gameTest.state.king.x),stopped,'no drift after release');
});

test('touch gestures do not scroll the game and can be cancelled', {skip:browserName!=='chromium'?'raw multitouch regression uses Chromium CDP; other input tests run in every engine':false},async t=>{
  const page=await open(t),cdp=await page.context().newCDPSession(page);
  const r=await page.locator('#stick').boundingBox(),touch={id:1,x:r.x+r.width/2+25,y:r.y+r.height/2};
  const before=await page.evaluate(()=>__gameTest.state.king.x);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});
  await page.waitForFunction(()=>__gameTest.input.pointer!==null);
  await page.waitForTimeout(180);
  assert.ok(await page.evaluate(()=>__gameTest.state.king.x)>before+10,'real touch moves king');
  const id=await page.evaluate(()=>__gameTest.input.pointer);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch,{id:2,x:r.x+r.width/2,y:r.y+r.height/2-20}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{id:2,x:r.x+r.width/2,y:r.y+r.height/2-20}]});
  assert.equal(await page.evaluate(()=>__gameTest.input.pointer),id);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touch,x:touch.x+80,y:touch.y-70}]});
  assert.equal(await page.evaluate(()=>scrollY),0);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForFunction(()=>__gameTest.input.pointer===null&&__gameTest.input.x===0&&__gameTest.input.y===0);
});

test('rotation preserves the game and releases input; camera keeps king visible',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{__gameTest.state.gold=35;__gameTest.ui();});
  await hold(page);
  await page.setViewportSize({width:844,height:390});
  await page.waitForFunction(()=>__gameTest.input.pointer===null);
  await page.mouse.up();
  assert.equal(await page.evaluate(()=>__gameTest.state.gold),35);
  await checkLayout(page);
  for(const [x,y]of [[40,120],[960,120],[40,610],[960,610]]){
    const visible=await page.evaluate(([x,y])=>{
      const s=__gameTest.state;s.king.x=x;s.king.y=y;__gameTest.draw();
      const top=__gameTest.view.project(x,y,1.85),bottom=__gameTest.view.project(x,y,0);
      return {x:top.x,top:top.y,bottom:bottom.y,width:top.width,height:top.height};
    },[x,y]);
    assert.ok(visible.x>0&&visible.x<visible.width&&visible.top>=0&&visible.bottom<=visible.height,'king stays in frame: '+JSON.stringify(visible));
  }
});

test('interruptions pause safely and clear held input before resuming',async t=>{
  const page=await open(t);
  for(const event of ['blur','pagehide']){
    await hold(page);
    await page.evaluate(type=>window.dispatchEvent(new Event(type)),event);
    await page.mouse.up();
    assert.equal(await page.evaluate(()=>__gameTest.paused),true);
    assert.equal(await page.evaluate(()=>__gameTest.input.pointer),null);
    await page.locator('#pause').tap();
    assert.equal(await page.evaluate(()=>__gameTest.paused),false);
    const x=await page.evaluate(()=>__gameTest.state.king.x);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>__gameTest.state.king.x),x);
  }
});

test('touch purchases and restart work; combat still yields collectible gold',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{const s=__gameTest.state;s.enemies=[{x:530,y:400,hp:10,maxHp:10,speed:0}];for(let i=0;i<240;i++)__gameTest.update(1/60);});
  assert.equal(await page.evaluate(()=>__gameTest.state.kills),1);
  assert.equal(await page.evaluate(()=>__gameTest.state.gold),10);
  await page.evaluate(()=>{__gameTest.state.gold=200;__gameTest.ui();});
  await page.locator('#recruit').tap();await page.locator('#fortify').tap();await page.locator('#upgrade').tap();
  assert.deepEqual(await page.evaluate(()=>{const s=__gameTest.state;return[s.allies.length,s.maxHp,s.level,s.gold];}),[1,140,2,125]);
  await page.locator('#sound').tap();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
  await page.locator('#sound').tap();
  await page.evaluate(()=>{const s=__gameTest.state;s.hp=.01;s.enemies=[{x:500,y:245,hp:999,maxHp:999,speed:0}];__gameTest.update(.1);});
  await page.locator('#restart').tap();
  assert.deepEqual(await page.evaluate(()=>[__gameTest.state.over,__gameTest.state.hp,__gameTest.state.gold,__gameTest.state.allies.length]),[false,100,0,0]);
  assert.equal(await page.locator('#pause').getAttribute('aria-label'),'Mettre en pause');
});

test('PC controls work and Space on a shop button buys instead of pausing',async t=>{
  const page=await open(t,{width:1280,height:900,mobile:false});
  const before=await page.evaluate(()=>__gameTest.state.king.x);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
  assert.ok(await page.evaluate(()=>__gameTest.state.king.x)>before+10);
  await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>__gameTest.paused),true);
  await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>__gameTest.paused),false);
  await page.evaluate(()=>{__gameTest.state.gold=100;__gameTest.ui();});
  await page.locator('#recruit').focus();await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>__gameTest.state.allies.length),1);
  assert.equal(await page.evaluate(()=>__gameTest.paused),false);
});


test('3D scene renders actors, projectiles, coins and visible fortifications; restart clears them',async t=>{
  const page=await open(t,{width:1280,height:900,mobile:false});
  const initial=await page.evaluate(()=>__gameTest.view.diagnostics());
  assert.ok(initial.triangles>1000,'real 3D meshes are submitted');
  assert.ok(initial.drawCalls<180,'static geometry is batched for mobile');
  const populated=await page.evaluate(()=>{
    const s=__gameTest.state;
    s.fort=1;s.allies.push({x:400,y:320,cool:10});
    s.enemies.push({x:600,y:500,hp:40,maxHp:50,speed:0});
    s.coins.push({x:680,y:400,value:10,age:0});
    s.arrows.push({x:520,y:400,vx:0,vy:500,life:10,damage:30});
    __gameTest.draw();
    return __gameTest.view.diagnostics();
  });
  assert.deepEqual([populated.actors,populated.coins,populated.arrows,populated.fortified],[3,1,1,true]);
  const empty=await page.evaluate(()=>{__gameTest.reset();__gameTest.draw();return __gameTest.view.diagnostics();});
  assert.deepEqual([empty.actors,empty.coins,empty.arrows,empty.fortified],[1,0,0,false]);
});
