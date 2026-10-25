const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');
const playwright=require('playwright');
const browserName=process.env.BROWSER||'chromium',root=path.join(__dirname,'..'),base='http://127.0.0.1:3103';
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
const hook='\nwindow.__gameTest={get state(){return state},get paused(){return paused},get input(){return{x:joy.x,y:joy.y,pointer:pointer.id,keys:[...keys]}},get view(){return view},ui,draw,step:dt=>stepGame(state,dt),openMenu,closeMenu};';
const bundle=require('esbuild').buildSync({stdin:{contents:source+hook,resolveDir:root,sourcefile:'game.js'},bundle:true,write:false,format:'iife',logLevel:'silent'}).outputFiles[0].text;
let browser,server;
before(async()=>{
  server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'3103'}});
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await delay(50);}assert.ok(ready);
  const launch={headless:true};if(browserName==='chromium'){launch.args=['--no-sandbox'];if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;else if(fs.existsSync('/usr/bin/chromium'))launch.executablePath='/usr/bin/chromium';}
  browser=await playwright[browserName].launch(launch);
});
after(async()=>{if(browser)await browser.close();if(server)server.kill();});
async function open(t,{width=390,height=844,mobile=true,start=true}={}){
  const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());await page.route('**/game.bundle.js',r=>r.fulfill({contentType:'text/javascript',body:bundle}));
  t.after(async()=>{await context.close();assert.deepEqual(errors,[],'no JavaScript exceptions');});
  await page.goto(base);await page.waitForFunction(()=>window.__gameTest&&__gameTest.view?.diagnostics().frames>0);
  if(start)await page.locator('#start').click();
  return page;
}
async function hold(page){const r=await page.locator('#stick').boundingBox();await page.mouse.move(r.x+r.width/2+24,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+25,r.y+r.height/2);await page.waitForFunction(()=>__gameTest.input.x>.5);}
async function layout(page){
  const m=await page.evaluate(()=>{const c=document.getElementById('game').getBoundingClientRect();return{w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,canvas:{x:c.x,y:c.y,w:c.width,h:c.height},controls:['menu-button','stick'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};})};});
  assert.equal(m.canvas.x,0);assert.equal(m.canvas.y,0);assert.equal(m.canvas.w,m.w);assert.equal(m.canvas.h,m.h);assert.ok(m.sw<=m.w&&m.sh<=m.h+1);
  for(const r of m.controls)assert.ok(r.x>=0&&r.y>=0&&r.right<=m.w+1&&r.bottom<=m.h+1&&r.w>=44&&r.h>=44,JSON.stringify(r));
}

test('fullscreen viewport on nine sizes, with management exclusively in the menu',async t=>{
  const page=await open(t);
  for(const [width,height]of[[320,568],[375,667],[390,844],[412,915],[768,1024],[1024,768],[844,390],[667,375],[568,320]]){await page.setViewportSize({width,height});await page.waitForTimeout(80);await layout(page);assert.equal(await page.locator('#recruit').isVisible(),false);}
  await page.locator('#menu-button').click();assert.equal(await page.locator('#menu').isVisible(),true);assert.equal(await page.evaluate(()=>__gameTest.paused),true);
  await page.locator('[data-tab=map]').click();assert.equal(await page.locator('#map').isVisible(),true);
  await page.locator('[data-tab=story]').click();assert.match(await page.locator('#tab-story').textContent(),/Valdor est tombé/);
  await page.locator('#resume').click();assert.equal(await page.evaluate(()=>__gameTest.paused),false);
});

test('prologue gives the lost-war premise and freezes time until the adventure starts',async t=>{
  const page=await open(t,{start:false});assert.match(await page.locator('#intro').textContent(),/guerre/);assert.equal(await page.evaluate(()=>__gameTest.state.time),0);
  await page.locator('#start').tap();assert.equal(await page.locator('#intro').isVisible(),false);await page.waitForFunction(()=>__gameTest.state.time>0);
});

test('joystick, second finger, cancellation and interruptions do not leave movement stuck',async t=>{
  const page=await open(t),before=await page.evaluate(()=>__gameTest.state.king.x);await hold(page);await page.waitForFunction(x=>__gameTest.state.king.x>x+10,before);
  const id=await page.evaluate(()=>__gameTest.input.pointer);await page.dispatchEvent('#stick','pointerdown',{pointerId:999,pointerType:'touch'});await page.dispatchEvent('#stick','pointerup',{pointerId:999,pointerType:'touch'});assert.equal(await page.evaluate(()=>__gameTest.input.pointer),id);
  await page.dispatchEvent('#stick','pointercancel',{pointerId:id});await page.mouse.up();assert.equal(await page.evaluate(()=>__gameTest.input.pointer),null);
  await hold(page);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();assert.equal(await page.locator('#menu').isVisible(),true);assert.equal(await page.evaluate(()=>__gameTest.input.pointer),null);
  await page.locator('#resume').tap();const stopped=await page.evaluate(()=>__gameTest.state.king.x);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>__gameTest.state.king.x),stopped);
});

test('real touch moves the king without scrolling, and rotation releases input',{skip:browserName!=='chromium'?'CDP raw touch is Chromium-specific':false},async t=>{
  const page=await open(t),cdp=await page.context().newCDPSession(page),r=await page.locator('#stick').boundingBox();
  const before=await page.evaluate(()=>__gameTest.state.king.x),touch={id:1,x:r.x+r.width/2+23,y:r.y+r.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await page.waitForFunction(x=>__gameTest.state.king.x>x+8,before);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touch,x:touch.x+70,y:touch.y-40}]});assert.equal(await page.evaluate(()=>scrollY),0);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForFunction(()=>__gameTest.input.pointer===null);
  await hold(page);await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>__gameTest.input.pointer===null);await page.mouse.up();await layout(page);
});

test('PC keyboard and touch interaction both mount and dismount the horse',async t=>{
  const page=await open(t,{width:1280,height:900,mobile:false});
  await page.evaluate(()=>{Object.assign(__gameTest.state.king,__gameTest.state.horse);__gameTest.ui();});
  await page.keyboard.press('e');await page.waitForFunction(()=>__gameTest.state.king.mounted&&__gameTest.view.diagnostics().mounted);
  const before=await page.evaluate(()=>__gameTest.state.king.x);await page.keyboard.down('ArrowRight');await page.waitForFunction(x=>__gameTest.state.king.x>x+25,before);await page.keyboard.up('ArrowRight');
  await page.locator('#interact').click();assert.equal(await page.evaluate(()=>__gameTest.state.king.mounted),false);
  await page.keyboard.press('m');assert.equal(await page.locator('#menu').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#menu').isVisible(),false);
});

test('rescue, escort, paid recruitment and rebuilding are reflected in the menu and 3D scene',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{const s=__gameTest.state;Object.assign(s.king,{x:s.camps[0].x,y:s.camps[0].y});__gameTest.ui();});
  await page.locator('#interact').tap();assert.equal(await page.evaluate(()=>__gameTest.state.followers.length),1);assert.equal(await page.evaluate(()=>__gameTest.state.counts.rescued),0);
  await page.evaluate(()=>{const s=__gameTest.state;Object.assign(s.king,{x:500,y:400});Object.assign(s.followers[0],{x:540,y:430});__gameTest.step(.1);s.gold=500;__gameTest.ui();});
  await page.locator('#menu-button').tap();assert.equal(await page.locator('#rescued-count').textContent(),'1 / 5');
  await page.locator('#recruit').tap();assert.equal(await page.locator('#hired-count').textContent(),'1 / 3');
  await page.locator('#fortify').tap();assert.equal(await page.locator('#rescued-count').textContent(),'1 / 10');await page.waitForFunction(()=>__gameTest.view.diagnostics().fortified);
  assert.match(await page.locator('.population').textContent(),/20 %/);assert.match(await page.locator('.population').textContent(),/30 %/);assert.match(await page.locator('.population').textContent(),/50 %/);
  await page.locator('[data-tab=settings]').tap();await page.locator('#sound').tap();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
  await page.locator('#zoom').fill('1.2');await page.locator('#resume').tap();
});

test('the camera follows exploration to all map edges and forest rendering stays populated',async t=>{
  const page=await open(t,{width:1280,height:900,mobile:false});
  assert.ok(await page.evaluate(()=>__gameTest.view.diagnostics().forestTrees)>500);
  for(const [x,y]of[[-1700,-1800],[2700,-1800],[-1700,2400],[2700,2400]]){
    const p=await page.evaluate(([x,y])=>{Object.assign(__gameTest.state.king,{x,y});__gameTest.draw();const top=__gameTest.view.project(x,y,1.9),bottom=__gameTest.view.project(x,y);return{...top,bottom:bottom.y};},[x,y]);
    assert.ok(p.x>0&&p.x<p.width&&p.y>0&&p.bottom<p.height,JSON.stringify(p));
  }
  await page.locator('#menu-button').click();
  const hashes=await page.evaluate(()=>{
    __gameTest.draw();const result=[];
    for(let frame=0;frame<2;frame++){
      __gameTest.draw();const c=document.getElementById('game'),gl=c.getContext('webgl2'),p=new Uint8Array(c.width*c.height*4);
      gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,p);let hash=2166136261,visible=0;
      for(let i=0;i<p.length;i+=16){hash=Math.imul(hash^p[i],16777619);hash=Math.imul(hash^p[i+1],16777619);if(p[i]+p[i+1]+p[i+2]>50)visible++;}
      if(visible<1000)throw Error('empty paused frame');result.push(hash);
    }return result;
  });
  assert.equal(hashes[0],hashes[1],'paused forest and shadows remain stable');
});

test('attack warnings guide the player home and a fallen refuge can be restarted',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{const s=__gameTest.state;s.phase='warning';s.phaseRemaining=20;__gameTest.ui();});assert.match(await page.locator('#wave').textContent(),/Assaut dans/);assert.match(await page.locator('#objective').textContent(),/refuge/);
  await page.evaluate(()=>{const s=__gameTest.state;s.phase='raid';s.left=1;s.hp=.01;s.enemies=[{x:500,y:330,hp:999,maxHp:999,speed:0}];});await page.waitForFunction(()=>!document.getElementById('overlay').hidden);
  await page.locator('#restart').tap();assert.equal(await page.evaluate(()=>__gameTest.state.over),false);assert.equal(await page.evaluate(()=>__gameTest.state.phase),'peace');assert.equal(await page.evaluate(()=>__gameTest.state.allies.length),0);
});
