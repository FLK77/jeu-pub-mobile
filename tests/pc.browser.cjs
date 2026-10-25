const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {existsSync}=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');

test('Courvane V6 ZIP contains the exact production game and works without network access',async()=>{
  const root=path.join(__dirname,'..');
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'Courvane PC '));
  let browser;
  try{
    execFileSync('python3',['-c','import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])',path.join(root,'Courvane-PC-V6.zip'),temp]);
    const folder=path.join(temp,'Courvane-PC');
    assert.equal((await fs.readFile(path.join(folder,'VERSION.txt'),'utf8')).trim(),'Courvane - V6.0.0');
    const batch=await fs.readFile(path.join(folder,'LANCER-JEU.bat'),'utf8');
    assert.ok(batch.includes('start "" "%~dp0jeu-pc.html"'));
    const launch={headless:true,args:['--no-sandbox']};
    if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;
    else if(existsSync('/usr/bin/chromium'))launch.executablePath='/usr/bin/chromium';
    browser=await chromium.launch(launch);
    const context=await browser.newContext({offline:true,viewport:{width:1280,height:900}});
    const page=await context.newPage(),errors=[],network=[];
    page.setDefaultTimeout(30000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
    // Managed cloud Chromium forbids file:// and data: navigation. Load the
    // unchanged extracted document via the ordinary DOM fixture API instead.
    const html=await fs.readFile(path.join(folder,'jeu-pc.html'));
    await page.setContent(html.toString('utf8'));
    await page.waitForFunction(()=>document.getElementById('game').dataset.renderer==='webgl2');
    assert.equal(await page.evaluate(()=>document.getElementById('game').getBoundingClientRect().width),1280,'offline stylesheet fills the viewport');
    const packedScript=(await fs.readFile(path.join(root,'game.bundle.js'),'utf8')).replaceAll('</script','<\\/script');
    assert.ok(html.toString('utf8').includes(packedScript),'archive contains the exact tested production script');
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
    await page.screenshot({path:'/tmp/courvane-v6-mobile-creation.png'});
    await page.setViewportSize({width:1280,height:900});
    await page.locator('#king-name').fill('Ysée');await page.locator('#appearance-beard').selectOption('short');
    const cape=await page.locator('#appearance-cape option').last().getAttribute('value');await page.locator('#appearance-cape').selectOption(cape);
    await page.locator('#start').click();assert.equal(await page.locator('#intro').isVisible(),false);
    const rendered=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
      const c=document.getElementById('game'),gl=c.getContext('webgl2'),pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let visible=0;const colors=new Set();for(let i=0;i<pixels.length;i+=16){if(pixels[i]+pixels[i+1]+pixels[i+2]>50)visible++;colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);}
      resolve({visible,colors:colors.size});
    })));
    assert.ok(rendered.visible>1000&&rendered.colors>20,'a nonblank, shaded 3D world renders offline for a customized king');
    await page.keyboard.press('Space');assert.equal(await page.locator('#menu').isVisible(),true);
    await page.locator('[data-tab=residents]').click();assert.equal(await page.locator('#citizen-list').isVisible(),true);
    await page.locator('#resume').click();assert.equal(await page.locator('#menu').isVisible(),false);
    await page.screenshot({path:'/tmp/courvane-v6-pc.png'});
    assert.deepEqual(network,[],'no external requests needed');assert.deepEqual(errors,[]);
  }finally{
    if(browser)await browser.close();await fs.rm(temp,{recursive:true,force:true});
  }
});
