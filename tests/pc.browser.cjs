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
    await page.waitForFunction(()=>document.getElementById('game').width>300);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor),'rgb(16, 31, 28)','offline stylesheet is applied');
    const kingX=()=>page.evaluate(()=>{
      const canvas=document.getElementById('game'),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let x=0,count=0;
      // King's blue tunic: real rendered pixels, no test hooks in the standalone game.
      for(let i=0;i<data.length;i+=4)if(data[i]===67&&data[i+1]===127&&data[i+2]===186){x+=(i/4)%canvas.width;count++;}
      if(!count)throw Error('king is not rendered');
      return x/count;
    });
    const before=await kingX();
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
    assert.ok(await kingX()>before+10,'keyboard moves the king in the offline file');
    await page.keyboard.press('Space');assert.equal(await page.locator('#pause').getAttribute('aria-pressed'),'true');
    await page.locator('#pause').click();assert.equal(await page.locator('#pause').getAttribute('aria-pressed'),'false');
    assert.deepEqual(network,[],'no external requests needed');
    assert.deepEqual(errors,[]);
  }finally{
    if(browser)await browser.close();
    await fs.rm(temp,{recursive:true,force:true});
  }
});
