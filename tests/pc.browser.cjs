const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {existsSync}=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');

test('downloadable ZIP contains a self-contained game playable offline, without a server',async()=>{
  const root=path.join(__dirname,'..');
  // Extract into a path with spaces, as in a typical Windows Downloads folder.
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'Royaume PC '));
  let browser;
  try{
    execFileSync('python3',['-c','import sys, zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])',path.join(root,'Royaume-PC.zip'),temp]);
    const folder=path.join(temp,'Royaume-PC');
    assert.equal((await fs.readFile(path.join(folder,'VERSION.txt'),'utf8')).trim(),'Le Dernier Royaume - V2.0.0');
    const batch=await fs.readFile(path.join(folder,'LANCER-JEU.bat'),'utf8');
    assert.ok(batch.includes('start "" "%~dp0jeu-pc.html"'));
    const launch={headless:true,args:['--no-sandbox']};
    if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;
    else if(existsSync('/usr/bin/chromium'))launch.executablePath='/usr/bin/chromium';
    browser=await chromium.launch(launch);
    const context=await browser.newContext({offline:true,viewport:{width:1280,height:900}});
    const page=await context.newPage(),errors=[],network=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
    // Cloud Chromium blocks file:// and data: navigation by administrator policy.
    // Test the extracted document using the standard Playwright DOM fixture API.
    const html=await fs.readFile(path.join(folder,'jeu-pc.html'));
    await page.setContent(html.toString('utf8'));
    await page.waitForFunction(()=>document.getElementById('game').dataset.renderer==='webgl2');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor),'rgb(16, 31, 28)','offline stylesheet is applied');
    const packedScript=(await fs.readFile(path.join(root,'game.bundle.js'),'utf8')).replaceAll('</script','<\\/script');
    assert.ok(html.toString('utf8').includes(packedScript),'archive contains the exact tested production bundle');
    await page.locator('#start').click();
    const rendered=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
      const c=document.getElementById('game'),gl=c.getContext('webgl2'),pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let visible=0,blue=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]+pixels[i+1]+pixels[i+2]>50)visible++;if(pixels[i+2]>pixels[i]*1.2&&pixels[i+2]>pixels[i+1]*1.12&&pixels[i+2]>85)blue++;}
      resolve({visible,blue});
    })));
    assert.ok(rendered.visible>1000&&rendered.blue>10,'world and royal blue character render offline');
    await page.keyboard.press('Space');assert.equal(await page.locator('#menu').isVisible(),true);
    await page.locator('#resume').click();assert.equal(await page.locator('#menu').isVisible(),false);
    assert.deepEqual(network,[],'no external requests needed');
    assert.deepEqual(errors,[]);
  }finally{
    if(browser)await browser.close();
    await fs.rm(temp,{recursive:true,force:true});
  }
});
